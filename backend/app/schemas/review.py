from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class ReviewFinding(BaseModel):
    severity: str  # Critical, High, Medium, Low, Informational
    category: str  # Logic, Security, Performance, Maintainability, Tests, Breaking Changes
    file_path: str
    line_reference: Optional[int] = None
    explanation: str
    evidence: str
    suggested_correction: str


class CodeReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    change_id: str
    user_id: str
    overall_status: str
    summary: str
    quality_score: float
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    findings: List[Dict[str, Any]]
    created_at: datetime
