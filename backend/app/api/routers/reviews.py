from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.change import GeneratedChange
from app.models.review import CodeReview
from app.schemas.review import CodeReviewRead
from app.agents.nodes.reviewer_node import code_review_node
from app.agents.state import AgentWorkflowState

router = APIRouter(tags=["Code Review"])


@router.post("/changes/{change_id}/review", response_model=CodeReviewRead)
async def review_generated_change(
    change_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Triggers the AI Code Review Agent to perform evidence-based code review.
    Evaluates logic, security vulnerabilities, performance, maintainability, and testing standards.
    """
    stmt = select(GeneratedChange).where(GeneratedChange.id == change_id, GeneratedChange.user_id == current_user.id)
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
        "events": [],
    }

    result = await code_review_node(state)
    rev_data = result.get("review_results", {})

    review = CodeReview(
        change_id=change.id,
        user_id=current_user.id,
        overall_status=rev_data.get("overall_status", "approved"),
        summary=rev_data.get("summary", "Review completed."),
        quality_score=rev_data.get("quality_score", 90.0),
        critical_count=rev_data.get("critical_count", 0),
        high_count=rev_data.get("high_count", 0),
        medium_count=rev_data.get("medium_count", 0),
        low_count=rev_data.get("low_count", 0),
        info_count=rev_data.get("info_count", 0),
        findings=rev_data.get("findings", []),
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


@router.get("/reviews/{id}", response_model=CodeReviewRead)
async def get_code_review(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CodeReview).where(CodeReview.id == id, CodeReview.user_id == current_user.id)
    res = await db.execute(stmt)
    review = res.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Code review not found.")
    return review
