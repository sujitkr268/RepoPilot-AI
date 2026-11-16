from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.plan import ImplementationPlan
from app.models.change import GeneratedChange
from app.schemas.change import GeneratedChangeRead, ChangeApprovalRequest
from app.agents.nodes.codegen_node import code_generation_node
from app.agents.state import AgentWorkflowState

router = APIRouter(tags=["Code Generation"])


@router.post("/plans/{plan_id}/generate", response_model=GeneratedChangeRead)
async def generate_code_changes(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Triggers the Code Generation Agent to create proposed minimal changes and unified git diffs
    conforming strictly to the approved plan and repository conventions.
    """
    stmt = select(ImplementationPlan).where(ImplementationPlan.id == plan_id, ImplementationPlan.user_id == current_user.id)
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Implementation plan not found.")

    state: AgentWorkflowState = {
        "plan_data": {
            "title": plan.title,
            "strategy_overview": plan.strategy_overview,
            "affected_files": plan.affected_files,
        },
        "events": [],
    }

    result = await code_generation_node(state)
    change_data = result.get("change_data", {})

    change = GeneratedChange(
        plan_id=plan.id,
        user_id=current_user.id,
        title=change_data.get("title", f"Changes for {plan.title}"),
        summary=change_data.get("summary", "Generated proposed changes."),
        files_changed=change_data.get("files_changed", []),
        unified_diff=change_data.get("unified_diff", ""),
        status="pending_review",
        is_approved=False,
    )
    db.add(change)
    plan.status = "in_progress"
    await db.commit()
    await db.refresh(change)
    return change


@router.get("/changes/{id}", response_model=GeneratedChangeRead)
async def get_generated_change(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(GeneratedChange).where(GeneratedChange.id == id, GeneratedChange.user_id == current_user.id)
    res = await db.execute(stmt)
    change = res.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generated change not found.")
    return change


@router.post("/changes/{id}/approve", response_model=GeneratedChangeRead)
async def approve_or_reject_change(
    id: str,
    payload: ChangeApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Explicit human approval gate for code modifications."""
    stmt = select(GeneratedChange).where(GeneratedChange.id == id, GeneratedChange.user_id == current_user.id)
    res = await db.execute(stmt)
    change = res.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generated change not found.")

    change.is_approved = payload.approved
    change.status = "approved" if payload.approved else "rejected"
    change.approval_notes = payload.notes

    await db.commit()
    await db.refresh(change)
    return change
