import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base


class ImplementationPlan(Base):
    __tablename__ = "implementation_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    issue_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("issues.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    problem_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    root_cause_analysis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    strategy_overview: Mapped[str] = mapped_column(Text, nullable=False)
    affected_files: Mapped[List[str]] = mapped_column(JSON, default=list)
    # Checklist items: [{"id": 1, "description": "...", "completed": false, "file_path": "..."}]
    checklist: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    dependencies: Mapped[List[str]] = mapped_column(JSON, default=list)
    potential_side_effects: Mapped[List[str]] = mapped_column(JSON, default=list)
    testing_strategy: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, approved, rejected, implemented

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    issue: Mapped["Issue"] = relationship("Issue", back_populates="plans")
    generated_changes: Mapped[List["GeneratedChange"]] = relationship(
        "GeneratedChange", back_populates="plan", cascade="all, delete-orphan"
    )
