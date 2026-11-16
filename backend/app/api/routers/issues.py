from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.repository import Repository
from app.models.issue import Issue, IssueRecommendation
from app.schemas.issue import IssueRead, IssueRecommendationRead
from app.integrations.github import GitHubClient
from app.services.issue_discovery import IssueDiscoveryService

router = APIRouter(tags=["Issues"])


@router.get("/repositories/{repo_id}/issues", response_model=List[IssueRead])
async def list_repository_issues(
    repo_id: str,
    refresh: bool = Query(False, description="Whether to re-fetch fresh issues from GitHub"),
    difficulty: Optional[str] = Query(None, description="Filter: beginner, easy, medium, hard, expert"),
    classification: Optional[str] = Query(None, description="Filter: Good First Issue, Bug, Feature Request, Documentation, Security"),
    search: Optional[str] = Query(None, description="Keyword search in issue title"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Repository).where(Repository.id == repo_id, Repository.user_id == current_user.id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    # Check existing issues in DB
    existing_stmt = select(Issue).where(Issue.repository_id == repo.id)
    existing_res = await db.execute(existing_stmt)
    existing_issues = existing_res.scalars().all()

    # If refresh is requested or no issues cached yet, fetch from GitHub
    if refresh or not existing_issues:
        gh_client = GitHubClient()
        raw_items = await gh_client.get_issues(repo.owner, repo.name, state="open", per_page=25)
        primary_lang = repo.primary_language or "General"

        for item in raw_items:
            num = item.get("number")
            # Check if issue already exists
            match_stmt = select(Issue).where(Issue.repository_id == repo.id, Issue.github_issue_number == num)
            match_res = await db.execute(match_stmt)
            issue_rec = match_res.scalar_one_or_none()

            labels = [lbl.get("name", "") for lbl in item.get("labels", []) if isinstance(lbl, dict)]
            cls_data = IssueDiscoveryService.classify_issue(
                title=item.get("title", ""),
                body=item.get("body", ""),
                labels=labels,
                primary_language=primary_lang,
            )

            if not issue_rec:
                issue_rec = Issue(
                    repository_id=repo.id,
                    github_issue_number=num,
                    github_id=str(item.get("id")),
                    title=item.get("title", "Untitled"),
                    body=item.get("body", ""),
                    html_url=item.get("html_url", ""),
                    state=item.get("state", "open"),
                    labels=labels,
                    author_username=item.get("user", {}).get("login"),
                    comments_count=item.get("comments", 0),
                    **cls_data,
                )
                db.add(issue_rec)
            else:
                issue_rec.title = item.get("title", issue_rec.title)
                issue_rec.body = item.get("body", issue_rec.body)
                issue_rec.labels = labels
                for k, v in cls_data.items():
                    setattr(issue_rec, k, v)

        await db.commit()

    # Query with filters
    q = select(Issue).where(Issue.repository_id == repo.id)
    if difficulty:
        q = q.where(Issue.estimated_difficulty == difficulty)
    if classification:
        q = q.where(Issue.classification == classification)
    if search:
        q = q.where(Issue.title.ilike(f"%{search}%"))

    q = q.order_by(Issue.difficulty_score.asc())
    final_res = await db.execute(q)
    return final_res.scalars().all()


@router.post("/issues/{issue_id}/recommend", response_model=IssueRecommendationRead)
async def generate_issue_recommendation(
    issue_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Issue).options(selectinload(Issue.repository)).where(Issue.id == issue_id)
    res = await db.execute(stmt)
    issue = res.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found.")

    # Calculate match score based on classification & difficulty
    score = 0.85
    if issue.classification == "Good First Issue":
        score = 0.96
        reason = "Highly recommended: flagged specifically for open source newcomers with clean boundaries."
    elif issue.estimated_difficulty in ("beginner", "easy"):
        score = 0.90
        reason = "Strong match: well isolated changes with straightforward reproduction."
    else:
        score = 0.78
        reason = f"Intermediate challenge: involves {', '.join(issue.required_skills)}."

    rec = IssueRecommendation(
        issue_id=issue.id,
        user_id=current_user.id,
        match_score=score,
        match_reason=reason,
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    rec.issue = issue
    return rec
