import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.repository import Repository, RepositoryAnalysis, RepositoryFile
from app.schemas.repository import (
    RepositoryConnect,
    RepositoryRead,
    RepositoryAnalysisRead,
    RepositoryFileRead,
    RepoChatRequest,
    RepoChatResponse,
    SourceReference,
)
from app.core.security import validate_github_url, sanitize_prompt_input
from app.integrations.github import GitHubClient, GitHubAPIError
from app.services.repository_analyzer import RepositoryAnalyzerService
from app.services.vector_search import VectorSearchService
from app.agents.llm_provider import LLMProvider

router = APIRouter(prefix="/repositories", tags=["Repositories"])


@router.post("/connect", response_model=RepositoryRead)
async def connect_repository(
    payload: RepositoryConnect,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Connects a real public or authenticated GitHub repository.
    Validates URL, checks accessibility, and populates initial metadata.
    """
    is_valid, owner, repo_name = validate_github_url(payload.github_url)
    if not is_valid or not owner or not repo_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub repository URL. Expected format: https://github.com/owner/repository",
        )

    # Check if already connected by this user
    stmt = (
        select(Repository)
        .options(selectinload(Repository.analysis))
        .where(Repository.user_id == current_user.id, Repository.owner == owner, Repository.name == repo_name)
    )
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        return existing

    # Fetch real metadata from GitHub API
    gh_client = GitHubClient()
    try:
        metadata = await gh_client.get_repository_metadata(owner, repo_name)
    except GitHubAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    new_repo = Repository(
        user_id=current_user.id,
        github_url=f"https://github.com/{owner}/{repo_name}",
        owner=owner,
        name=repo_name,
        default_branch=metadata.get("default_branch", "main"),
        description=metadata.get("description"),
        is_private=metadata.get("private", False),
        stars_count=metadata.get("stargazers_count", 0),
        forks_count=metadata.get("forks_count", 0),
        open_issues_count=metadata.get("open_issues_count", 0),
        primary_language=metadata.get("language"),
        clone_url=metadata.get("clone_url"),
    )
    db.add(new_repo)
    await db.commit()
    await db.refresh(new_repo)
    return new_repo


@router.get("", response_model=List[RepositoryRead])
async def list_repositories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Repository)
        .options(selectinload(Repository.analysis))
        .where(Repository.user_id == current_user.id)
        .order_by(Repository.updated_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/{id}", response_model=RepositoryRead)
async def get_repository(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Repository)
        .options(selectinload(Repository.analysis))
        .where(Repository.id == id, Repository.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")
    return repo


@router.post("/{id}/analyze", response_model=RepositoryAnalysisRead)
async def analyze_repository(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Runs the comprehensive Repository Analyzer on the connected repository:
    detects languages, frameworks, entrypoints, test tools, dependencies, and architecture.
    """
    stmt = select(Repository).where(Repository.id == id, Repository.user_id == current_user.id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    gh_client = GitHubClient()
    analyzer = RepositoryAnalyzerService(gh_client)

    try:
        results = await analyzer.analyze(repo.owner, repo.name, default_branch=repo.default_branch)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Analysis failed: {str(e)}")

    # Update or create analysis record
    stmt_an = select(RepositoryAnalysis).where(RepositoryAnalysis.repository_id == repo.id)
    an_res = await db.execute(stmt_an)
    analysis = an_res.scalar_one_or_none()

    if not analysis:
        analysis = RepositoryAnalysis(repository_id=repo.id)
        db.add(analysis)

    analysis.status = "completed"
    analysis.languages = results["languages"]
    analysis.frameworks = results["frameworks"]
    analysis.architecture_summary = results["architecture_summary"]
    analysis.setup_instructions = results["setup_instructions"]
    analysis.testing_instructions = results["testing_instructions"]
    analysis.entry_points = results["entry_points"]
    analysis.test_frameworks = results["test_frameworks"]
    analysis.potential_concerns = results["potential_concerns"]
    analysis.dependencies = results["dependencies"]
    analysis.key_directories = results["key_directories"]

    # Ingest file tree for file explorer & search
    tree = await gh_client.get_repository_tree(repo.owner, repo.name, branch=repo.default_branch)
    # Clear previous files for clean sync
    del_stmt = select(RepositoryFile).where(RepositoryFile.repository_id == repo.id)
    del_res = await db.execute(del_stmt)
    for f in del_res.scalars().all():
        await db.delete(f)

    for item in tree[:300]:  # limit to top 300 tree entries
        p = item.get("path", "")
        _, ext = os.path.splitext(p)
        is_imp = p in results.get("entry_points", []) or os.path.basename(p) in results.get("manifest_files", [])
        rf = RepositoryFile(
            repository_id=repo.id,
            path=p,
            type=item.get("type", "blob"),
            size_bytes=item.get("size", 0) or 0,
            sha=item.get("sha"),
            extension=ext,
            is_important=is_imp,
        )
        db.add(rf)

    await db.commit()
    await db.refresh(analysis)
    return analysis


@router.get("/{id}/analysis", response_model=RepositoryAnalysisRead)
async def get_repository_analysis(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(RepositoryAnalysis)
        .join(Repository)
        .where(RepositoryAnalysis.repository_id == id, Repository.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    analysis = res.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found for this repository.")
    return analysis


@router.get("/{id}/files", response_model=List[RepositoryFileRead])
async def list_repository_files(
    id: str,
    path: Optional[str] = Query(None, description="Prefix path filter"),
    search: Optional[str] = Query(None, description="Search filename keyword"),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(RepositoryFile)
        .join(Repository)
        .where(RepositoryFile.repository_id == id, Repository.user_id == current_user.id)
    )
    if search:
        stmt = stmt.where(RepositoryFile.path.ilike(f"%{search}%"))
    if path:
        stmt = stmt.where(RepositoryFile.path.startswith(path))

    stmt = stmt.limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/{id}/chat", response_model=RepoChatResponse)
async def repository_ai_chat(
    id: str,
    payload: RepoChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Repository-aware AI Q&A assistant. Answers questions using actual repository context,
    with source references and line numbers.
    """
    stmt = select(Repository).options(selectinload(Repository.analysis)).where(Repository.id == id, Repository.user_id == current_user.id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    clean_message = sanitize_prompt_input(payload.message)
    gh_client = GitHubClient()

    # Retrieve relevant files based on user query
    files_stmt = select(RepositoryFile).where(RepositoryFile.repository_id == repo.id, RepositoryFile.type == "blob")
    files_res = await db.execute(files_stmt)
    all_files = files_res.scalars().all()

    # Search for matching files
    candidate_files = []
    query_terms = clean_message.lower().split()
    for f in all_files:
        p_lower = f.path.lower()
        if any(term in p_lower for term in query_terms if len(term) > 2) or f.is_important:
            candidate_files.append(f.path)

    # Fetch contents of top 3 matching files
    chunks: List[dict] = []
    for file_path in candidate_files[:3]:
        content = await gh_client.get_file_content(repo.owner, repo.name, file_path, ref=repo.default_branch)
        if content:
            file_chunks = VectorSearchService.chunk_file_content(file_path, content)
            for c in file_chunks[:2]:
                chunks.append({"path": c.file_path, "content": c.content, "start_line": c.start_line, "end_line": c.end_line})

    matched_chunks = VectorSearchService.search_chunks(clean_message, chunks, top_k=3)

    references: List[SourceReference] = []
    context_blocks = []
    for chunk, _ in matched_chunks:
        references.append(
            SourceReference(
                file_path=chunk["path"],
                start_line=chunk.get("start_line", 1),
                end_line=chunk.get("end_line", 1),
                snippet=chunk["content"][:200],
            )
        )
        context_blocks.append(f"File: {chunk['path']}\n```{chunk['content']}\n```")

    analysis_context = ""
    if repo.analysis:
        analysis_context = (
            f"Languages: {repo.analysis.languages}\n"
            f"Frameworks: {repo.analysis.frameworks}\n"
            f"Architecture: {repo.analysis.architecture_summary}\n"
        )

    sys_prompt = (
        "You are RepoPilot AI, an expert software architect and open-source guide. "
        "Explain the requested codebase aspects accurately using the supplied context. "
        "Reference concrete file paths and line ranges where available."
    )
    user_prompt = (
        f"Repository: {repo.owner}/{repo.name}\n"
        f"Architecture:\n{analysis_context}\n\n"
        f"Context Snippets:\n" + "\n\n".join(context_blocks) + f"\n\nQuestion:\n{clean_message}"
    )

    answer = await LLMProvider.generate_completion(sys_prompt, user_prompt)
    return RepoChatResponse(
        answer=answer,
        references=references,
        suggested_files=candidate_files[:5],
    )
