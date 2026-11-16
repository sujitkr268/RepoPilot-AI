import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base


class CodeReview(Base):
    __tablename__ = "code_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    change_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("generated_changes.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    overall_status: Mapped[str] = mapped_column(String(50), default="needs_review")  # approved, changes_requested, needs_review
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    quality_score: Mapped[float] = mapped_column(Float, default=100.0)  # 0 to 100
    critical_count: Mapped[int] = mapped_column(Integer, default=0)
    high_count: Mapped[int] = mapped_column(Integer, default=0)
    medium_count: Mapped[int] = mapped_column(Integer, default=0)
    low_count: Mapped[int] = mapped_column(Integer, default=0)
    info_count: Mapped[int] = mapped_column(Integer, default=0)

    # Findings: [
    #   {
    #     "severity": "High",
    #     "category": "Security",
    #     "file_path": "src/auth.py",
    #     "line_reference": 42,
    #     "explanation": "...",
    #     "evidence": "...",
    #     "suggested_correction": "..."
    #   }
    # ]
    findings: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    change: Mapped["GeneratedChange"] = relationship("GeneratedChange", back_populates="code_reviews")
