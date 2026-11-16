import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.issue import Issue
from app.models.repository import Repository, RepositoryFile
from app.models.plan import ImplementationPlan
from app.schemas.plan import ImplementationPlanRead, ImplementationPlanUpdate
from app.agents.nodes.planner_node import implementation_planner_node
from app.agents.state import AgentWorkflowState

router = APIRouter(tags=["Planning"])


@router.post("/issues/{issue_id}/plan", response_model=ImplementationPlanRead)
async def create_implementation_plan(
    issue_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Triggers the Implementation Planning Agent for the selected issue.
    Generates a structured plan with problem explanation, root cause analysis,
    strategy, affected files, dependencies, side effects, and an editable checklist.
    """
    stmt = select(Issue).options(selectinload(Issue.repository)).where(Issue.id == issue_id)
    res = await db.execute(stmt)
    issue = res.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found.")

    repo = issue.repository

    # Gather candidate files for context
    f_stmt = select(RepositoryFile).where(RepositoryFile.repository_id == repo.id)
    f_res = await db.execute(f_stmt)
    files = f_res.scalars().all()
    candidate_chunks = [{"path": f.path, "start_line": 1, "end_line": 50, "content": f.path} for f in files[:8]]

    state: AgentWorkflowState = {
        "owner": repo.owner,
        "repo": repo.name,
        "selected_issue": {
            "title": issue.title,
            "body": issue.body,
            "labels": issue.labels,
            "classification": issue.classification,
        },
        "retrieved_chunks": candidate_chunks,
        "events": [],
    }

    result = await implementation_planner_node(state)
    plan_data = result.get("plan_data", {})

    new_plan = ImplementationPlan(
        issue_id=issue.id,
        user_id=current_user.id,
        title=plan_data.get("title", f"Plan for {issue.title}"),
        problem_explanation=plan_data.get("problem_explanation", "Identified issue requirements."),
        root_cause_analysis=plan_data.get("root_cause_analysis"),
        strategy_overview=plan_data.get("strategy_overview", "Targeted implementation plan."),
        affected_files=plan_data.get("affected_files", []),
        checklist=plan_data.get("checklist", []),
        dependencies=plan_data.get("dependencies", []),
        potential_side_effects=plan_data.get("potential_side_effects", []),
        testing_strategy=plan_data.get("testing_strategy", "Isolated test execution."),
        status="draft",
    )
    db.add(new_plan)
    await db.commit()
    await db.refresh(new_plan)
    return new_plan


@router.get("/plans/{id}", response_model=ImplementationPlanRead)
async def get_implementation_plan(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ImplementationPlan).where(ImplementationPlan.id == id, ImplementationPlan.user_id == current_user.id)
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Implementation plan not found.")
    return plan


@router.patch("/plans/{id}", response_model=ImplementationPlanRead)
async def update_implementation_plan(
    id: str,
    payload: ImplementationPlanUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allows developers to edit checklist items, update status, and refine strategy."""
    stmt = select(ImplementationPlan).where(ImplementationPlan.id == id, ImplementationPlan.user_id == current_user.id)
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Implementation plan not found.")

    if payload.title is not None:
        plan.title = payload.title
    if payload.strategy_overview is not None:
        plan.strategy_overview = payload.strategy_overview
    if payload.checklist is not None:
        plan.checklist = payload.checklist
    if payload.status is not None:
        plan.status = payload.status

    await db.commit()
    await db.refresh(plan)
    return plan
