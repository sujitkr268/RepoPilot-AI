import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base


class GeneratedChange(Base):
    __tablename__ = "generated_changes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("implementation_plans.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(500), default="Proposed Code Changes")
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    # File changes: [{"file_path": "...", "original_content": "...", "new_content": "...", "diff": "...", "explanation": "..."}]
    files_changed: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    unified_diff: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending_review")  # pending_review, approved, rejected, applied
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approval_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    plan: Mapped["ImplementationPlan"] = relationship("ImplementationPlan", back_populates="generated_changes")
    test_executions: Mapped[List["TestExecution"]] = relationship(
        "TestExecution", back_populates="change", cascade="all, delete-orphan"
    )
    code_reviews: Mapped[List["CodeReview"]] = relationship(
        "CodeReview", back_populates="change", cascade="all, delete-orphan"
    )
    pull_requests: Mapped[List["PullRequest"]] = relationship(
        "PullRequest", back_populates="change", cascade="all, delete-orphan"
    )
