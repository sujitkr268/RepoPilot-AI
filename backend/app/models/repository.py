import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base


class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    github_url: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    owner: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    default_branch: Mapped[str] = mapped_column(String(100), default="main")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    stars_count: Mapped[int] = mapped_column(Integer, default=0)
    forks_count: Mapped[int] = mapped_column(Integer, default=0)
    open_issues_count: Mapped[int] = mapped_column(Integer, default=0)
    primary_language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    clone_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship("User", back_populates="repositories")
    analysis: Mapped[Optional["RepositoryAnalysis"]] = relationship(
        "RepositoryAnalysis", back_populates="repository", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )
    files: Mapped[List["RepositoryFile"]] = relationship(
        "RepositoryFile", back_populates="repository", cascade="all, delete-orphan"
    )
    issues: Mapped[List["Issue"]] = relationship(
        "Issue", back_populates="repository", cascade="all, delete-orphan"
    )
    agent_sessions: Mapped[List["AgentSession"]] = relationship(
        "AgentSession", back_populates="repository", cascade="all, delete-orphan"
    )


class RepositoryAnalysis(Base):
    __tablename__ = "repository_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repository_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("repositories.id", ondelete="CASCADE"), unique=True, index=True
    )
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, completed, failed
    languages: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    frameworks: Mapped[List[str]] = mapped_column(JSON, default=list)
    architecture_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    setup_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    testing_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    entry_points: Mapped[List[str]] = mapped_column(JSON, default=list)
    test_frameworks: Mapped[List[str]] = mapped_column(JSON, default=list)
    potential_concerns: Mapped[List[str]] = mapped_column(JSON, default=list)
    dependencies: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    key_directories: Mapped[List[str]] = mapped_column(JSON, default=list)
    raw_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    repository: Mapped["Repository"] = relationship("Repository", back_populates="analysis")


class RepositoryFile(Base):
    __tablename__ = "repository_files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repository_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("repositories.id", ondelete="CASCADE"), index=True
    )
    path: Mapped[str] = mapped_column(String(1000), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(20), default="blob")  # blob (file) or tree (dir)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    sha: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    extension: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_important: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    repository: Mapped["Repository"] = relationship("Repository", back_populates="files")
    embeddings: Mapped[List["FileEmbedding"]] = relationship(
        "FileEmbedding", back_populates="file", cascade="all, delete-orphan"
    )


class FileEmbedding(Base):
    __tablename__ = "file_embeddings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("repository_files.id", ondelete="CASCADE"), index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    chunk_content: Mapped[str] = mapped_column(Text, nullable=False)
    start_line: Mapped[int] = mapped_column(Integer, default=1)
    end_line: Mapped[int] = mapped_column(Integer, default=1)
    # Stored as JSON list of floats for universal database support (pgvector or SQLite)
    embedding_vector: Mapped[Optional[List[float]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    file: Mapped["RepositoryFile"] = relationship("RepositoryFile", back_populates="embeddings")
