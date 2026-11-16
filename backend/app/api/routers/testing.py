from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.change import GeneratedChange
from app.models.execution import TestExecution
from app.schemas.execution import TestExecutionRead, TestExecutionRequest
from app.agents.nodes.tester_node import automated_testing_node
from app.agents.state import AgentWorkflowState

router = APIRouter(tags=["Testing"])


@router.post("/changes/{change_id}/test", response_model=TestExecutionRead)
async def run_sandbox_tests(
    change_id: str,
    payload: Optional[TestExecutionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes automated tests for the generated changes in an isolated sandbox.
    Captures stdout, stderr, exit code, execution duration, and parses metrics.
    """
    stmt = (
        select(GeneratedChange)
        .options(selectinload(GeneratedChange.plan))
        .where(GeneratedChange.id == change_id, GeneratedChange.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    change = res.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generated change not found.")

    state: AgentWorkflowState = {
        "change_data": {
            "title": change.title,
            "files_changed": change.files_changed,
            "unified_diff": change.unified_diff,
        },
        "languages": {"Python": 1},
        "test_frameworks": ["pytest"],
        "events": [],
    }

    result = await automated_testing_node(state)
    test_res = result.get("test_results", {})

    execution = TestExecution(
        change_id=change.id,
        user_id=current_user.id,
        language_detected="Python",
        framework_detected="pytest",
        command_executed=test_res.get("command", "pytest"),
        sandbox_type="subprocess_isolated",
        status=test_res.get("status", "passed"),
        exit_code=test_res.get("exit_code", 0),
        stdout=test_res.get("stdout"),
        stderr=test_res.get("stderr"),
        duration_seconds=test_res.get("duration_seconds", 0.0),
        total_tests=test_res.get("total_tests", 0),
        passed_tests=test_res.get("passed_tests", 0),
        failed_tests=test_res.get("failed_tests", 0),
        skipped_tests=test_res.get("skipped_tests", 0),
        failure_details=test_res.get("failure_details", []),
        ai_failure_analysis=test_res.get("ai_failure_analysis"),
        suggested_fixes=test_res.get("suggested_fixes", []),
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)
    return execution


@router.get("/test-runs/{id}", response_model=TestExecutionRead)
async def get_test_execution(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(TestExecution).where(TestExecution.id == id, TestExecution.user_id == current_user.id)
    res = await db.execute(stmt)
    execution = res.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test execution not found.")
    return execution
