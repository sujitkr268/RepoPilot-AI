import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base


class TestExecution(Base):
    __tablename__ = "test_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    change_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("generated_changes.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    language_detected: Mapped[str] = mapped_column(String(50), nullable=False)
    framework_detected: Mapped[str] = mapped_column(String(50), nullable=False)
    command_executed: Mapped[str] = mapped_column(String(500), nullable=False)
    sandbox_type: Mapped[str] = mapped_column(String(50), default="subprocess_isolated")  # docker or subprocess_isolated
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, running, passed, failed, timed_out, error
    exit_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stdout: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stderr: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)

    # Structured test metrics
    total_tests: Mapped[int] = mapped_column(Integer, default=0)
    passed_tests: Mapped[int] = mapped_column(Integer, default=0)
    failed_tests: Mapped[int] = mapped_column(Integer, default=0)
    skipped_tests: Mapped[int] = mapped_column(Integer, default=0)
    failure_details: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    ai_failure_analysis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggested_fixes: Mapped[List[str]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    change: Mapped["GeneratedChange"] = relationship("GeneratedChange", back_populates="test_executions")
