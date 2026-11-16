from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class RepositoryConnect(BaseModel):
    github_url: str = Field(..., description="Public GitHub repository URL, e.g. https://github.com/owner/repo")


class RepositoryFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    path: str
    type: str
    size_bytes: int
    extension: Optional[str] = None
    is_important: bool
    sha: Optional[str] = None
    content: Optional[str] = None


class RepositoryAnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    status: str
    languages: Dict[str, Any]
    frameworks: List[str]
    architecture_summary: Optional[str]
    setup_instructions: Optional[str]
    testing_instructions: Optional[str]
    entry_points: List[str]
    test_frameworks: List[str]
    potential_concerns: List[str]
    dependencies: Dict[str, Any]
    key_directories: List[str]
    created_at: datetime
    updated_at: datetime


class RepositoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    github_url: str
    owner: str
    name: str
    default_branch: str
    description: Optional[str] = None
    is_private: bool
    stars_count: int
    forks_count: int
    open_issues_count: int
    primary_language: Optional[str] = None
    clone_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    analysis: Optional[RepositoryAnalysisRead] = None


class SourceReference(BaseModel):
    file_path: str
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    snippet: Optional[str] = None


class RepoChatRequest(BaseModel):
    message: str = Field(..., description="Question or query regarding the repository")
    context_files: Optional[List[str]] = Field(default=None, description="Optional list of specific file paths to focus on")


class RepoChatResponse(BaseModel):
    answer: str
    references: List[SourceReference] = []
    suggested_files: List[str] = []
