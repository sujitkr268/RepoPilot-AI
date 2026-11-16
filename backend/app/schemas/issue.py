from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class IssueRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    github_issue_number: int
    github_id: str
    title: str
    body: Optional[str] = None
    html_url: str
    state: str
    labels: List[str]
    author_username: Optional[str] = None
    comments_count: int
    created_at_github: Optional[datetime] = None

    # AI enriched fields
    classification: str
    estimated_difficulty: str
    difficulty_score: float
    required_skills: List[str]
    suggested_approach: Optional[str] = None
    suitability_reason: Optional[str] = None

    created_at: datetime
    updated_at: datetime


class IssueFilterParams(BaseModel):
    difficulty: Optional[str] = None
    classification: Optional[str] = None
    skill: Optional[str] = None
    search: Optional[str] = None


class IssueRecommendationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    issue_id: str
    match_score: float
    match_reason: Optional[str] = None
    issue: IssueRead
