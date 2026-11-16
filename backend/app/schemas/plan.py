from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class ChecklistItem(BaseModel):
    id: int
    description: str
    completed: bool = False
    file_path: Optional[str] = None


class ImplementationPlanCreate(BaseModel):
    issue_id: str
    custom_guidance: Optional[str] = None


class ImplementationPlanUpdate(BaseModel):
    title: Optional[str] = None
    strategy_overview: Optional[str] = None
    checklist: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None  # draft, approved, rejected


class ImplementationPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    issue_id: str
    user_id: str
    title: str
    problem_explanation: str
    root_cause_analysis: Optional[str] = None
    strategy_overview: str
    affected_files: List[str]
    checklist: List[Dict[str, Any]]
    dependencies: List[str]
    potential_side_effects: List[str]
    testing_strategy: str
    status: str
    created_at: datetime
    updated_at: datetime
