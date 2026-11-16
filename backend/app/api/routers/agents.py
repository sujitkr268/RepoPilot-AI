import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.repository import Repository
from app.models.agent import AgentSession, AgentEvent
from app.schemas.agent import AgentSessionRead
from app.agents.graph import engineering_graph
from app.agents.state import AgentWorkflowState

router = APIRouter(prefix="/agents", tags=["Agent Activity"])


@router.get("/sessions", response_model=List[AgentSessionRead])
async def list_agent_sessions(
    repository_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AgentSession)
        .options(selectinload(AgentSession.events))
        .where(AgentSession.user_id == current_user.id)
    )
    if repository_id:
        stmt = stmt.where(AgentSession.repository_id == repository_id)

    stmt = stmt.order_by(AgentSession.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/sessions/{id}", response_model=AgentSessionRead)
async def get_agent_session(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AgentSession)
        .options(selectinload(AgentSession.events))
        .where(AgentSession.id == id, AgentSession.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent session not found.")
    return session


@router.post("/sessions/{id}/cancel", response_model=AgentSessionRead)
async def cancel_agent_session(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AgentSession)
        .options(selectinload(AgentSession.events))
        .where(AgentSession.id == id, AgentSession.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent session not found.")

    session.status = "cancelled"
    cancel_event = AgentEvent(
        session_id=session.id,
        agent_name=session.current_agent,
        stage="cancelled",
        event_type="warning",
        message="Session execution cancelled by developer.",
        payload={},
    )
    db.add(cancel_event)
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/sessions/run-workflow", response_model=AgentSessionRead)
async def run_full_agent_workflow(
    repository_id: str,
    issue_title: Optional[str] = "Fix boundary condition in core validator",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes the autonomous LangGraph multi-agent engineering workflow:
    Analysis -> Discovery -> Planning -> Code Generation -> Isolated Testing -> Code Review -> PR Prep.
    Records real backend telemetry and state checkpoints.
    """
    stmt = select(Repository).where(Repository.id == repository_id, Repository.user_id == current_user.id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    # Create session record
    session = AgentSession(
        repository_id=repo.id,
        user_id=current_user.id,
        session_type="full_workflow",
        current_agent="LangGraph Coordinator",
        current_stage="initialized",
        status="running",
    )
    db.add(session)
    await db.flush()

    init_event = AgentEvent(
        session_id=session.id,
        agent_name="LangGraph Coordinator",
        stage="workflow_start",
        event_type="start",
        message=f"Starting autonomous engineering pipeline for {repo.owner}/{repo.name}.",
        payload={"repository": f"{repo.owner}/{repo.name}"},
    )
    db.add(init_event)

    # Initial state
    initial_state: AgentWorkflowState = {
        "session_id": session.id,
        "user_id": current_user.id,
        "repository_id": repo.id,
        "owner": repo.owner,
        "repo": repo.name,
        "default_branch": repo.default_branch,
        "selected_issue": {
            "title": issue_title,
            "body": "Ensure bounds checking handles missing or empty dict parameters gracefully.",
            "labels": ["good first issue", "bug"],
        },
        "retrieved_chunks": [],
        "events": [],
    }

    start_time = time.time()
    try:
        # Run graph
        final_state = await engineering_graph.ainvoke(initial_state)

        session.current_agent = final_state.get("current_agent", "Pull Request Agent")
        session.current_stage = final_state.get("current_stage", "completed")
        session.status = "completed"
        session.state_checkpoint = {
            "plan_title": final_state.get("plan_data", {}).get("title"),
            "change_summary": final_state.get("change_data", {}).get("summary"),
            "test_status": final_state.get("test_results", {}).get("status"),
            "review_status": final_state.get("review_results", {}).get("overall_status"),
            "pr_branch": final_state.get("pr_data", {}).get("source_branch"),
        }

        # Persist all generated agent events
        for ev in final_state.get("events", []):
            db_ev = AgentEvent(
                session_id=session.id,
                agent_name=ev.get("agent_name", "Agent"),
                stage=ev.get("stage", "step"),
                event_type=ev.get("event_type", "step"),
                message=ev.get("message", ""),
                payload=ev.get("payload", {}),
            )
            db.add(db_ev)

    except Exception as e:
        session.status = "failed"
        session.error_message = str(e)
        err_ev = AgentEvent(
            session_id=session.id,
            agent_name="LangGraph Coordinator",
            stage="workflow_error",
            event_type="error",
            message=f"Workflow failed: {str(e)}",
            payload={},
        )
        db.add(err_ev)

    session.duration_seconds = round(time.time() - start_time, 2)
    await db.commit()

    # Re-fetch with events
    stmt_full = (
        select(AgentSession)
        .options(selectinload(AgentSession.events))
        .where(AgentSession.id == session.id)
    )
    res_full = await db.execute(stmt_full)
    return res_full.scalar_one()
