import pytest
from app.services.issue_discovery import IssueDiscoveryService


def test_classify_good_first_issue():
    res = IssueDiscoveryService.classify_issue(
        title="Fix typo in installation guide",
        body="There is a misspelled word in docs/getting-started.md",
        labels=["good first issue", "documentation"],
        primary_language="Python",
    )
    assert res["classification"] in ("Good First Issue", "Documentation")
    assert res["estimated_difficulty"] == "beginner"
    assert res["difficulty_score"] < 0.35
    assert len(res["suggested_approach"]) > 0


def test_classify_security_issue():
    res = IssueDiscoveryService.classify_issue(
        title="SQL injection risk in search filter",
        body="Parameters are interpolated directly into raw SQL query",
        labels=["security"],
        primary_language="Python",
    )
    assert res["classification"] == "Security"
    assert res["estimated_difficulty"] in ("hard", "expert")
    assert res["difficulty_score"] >= 0.70
