import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repository_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("repositories.id", ondelete="CASCADE"), index=True
    )
    github_issue_number: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    github_id: Mapped[str] = mapped_column(String(100), index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    html_url: Mapped[str] = mapped_column(String(500), nullable=False)
    state: Mapped[str] = mapped_column(String(50), default="open")  # open, closed
    labels: Mapped[List[str]] = mapped_column(JSON, default=list)
    author_username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    comments_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at_github: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # AI Classifications
    classification: Mapped[str] = mapped_column(String(50), default="enhancement")  # Good First Issue, Bug, Feature Request, Documentation, Enhancement, Security
    estimated_difficulty: Mapped[str] = mapped_column(String(50), default="medium")  # beginner, easy, medium, hard, expert
    difficulty_score: Mapped[float] = mapped_column(Float, default=0.5)  # 0.0 to 1.0
    required_skills: Mapped[List[str]] = mapped_column(JSON, default=list)
    suggested_approach: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suitability_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    repository: Mapped["Repository"] = relationship("Repository", back_populates="issues")
    recommendations: Mapped[List["IssueRecommendation"]] = relationship(
        "IssueRecommendation", back_populates="issue", cascade="all, delete-orphan"
    )
    plans: Mapped[List["ImplementationPlan"]] = relationship(
        "ImplementationPlan", back_populates="issue", cascade="all, delete-orphan"
    )


class IssueRecommendation(Base):
    __tablename__ = "issue_recommendations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    issue_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("issues.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    match_score: Mapped[float] = mapped_column(Float, default=0.0)
    match_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    issue: Mapped["Issue"] = relationship("Issue", back_populates="recommendations")
