from typing import Dict, Any, List
from app.agents.state import AgentWorkflowState
from app.integrations.github import GitHubClient
from app.services.issue_discovery import IssueDiscoveryService


async def discover_issues_node(state: AgentWorkflowState) -> Dict[str, Any]:
    """Node for retrieving open issues and performing AI classification."""
    owner = state.get("owner", "")
    repo = state.get("repo", "")
    primary_lang = "General"
    if state.get("languages"):
        primary_lang = max(state["languages"].items(), key=lambda x: x[1])[0]

    gh_client = GitHubClient()
    events = list(state.get("events", []))

    try:
        raw_issues = await gh_client.get_issues(owner, repo, state="open", per_page=20)
        classified_issues: List[Dict[str, Any]] = []

        for item in raw_issues:
            labels = [lbl.get("name", "") for lbl in item.get("labels", []) if isinstance(lbl, dict)]
            cls_result = IssueDiscoveryService.classify_issue(
                title=item.get("title", ""),
                body=item.get("body", ""),
                labels=labels,
                primary_language=primary_lang,
            )
            enriched = {
                "github_issue_number": item.get("number"),
                "github_id": str(item.get("id")),
                "title": item.get("title"),
                "body": item.get("body"),
                "html_url": item.get("html_url"),
                "state": item.get("state"),
                "labels": labels,
                "author_username": item.get("user", {}).get("login"),
                "comments_count": item.get("comments", 0),
                **cls_result,
            }
            classified_issues.append(enriched)

        events.append({
            "agent_name": "Issue Discovery Agent",
            "stage": "issues_discovered",
            "event_type": "step",
            "message": f"Retrieved and classified {len(classified_issues)} open issues from GitHub.",
            "payload": {"count": len(classified_issues)},
        })

        return {
            "current_agent": "Issue Discovery Agent",
            "current_stage": "issues_ready",
            "raw_issues": raw_issues,
            "classified_issues": classified_issues,
            "events": events,
            "status": "running",
        }
    except Exception as e:
        events.append({
            "agent_name": "Issue Discovery Agent",
            "stage": "issue_discovery_error",
            "event_type": "warning",
            "message": f"Could not retrieve live issues: {str(e)}",
            "payload": {},
        })
        return {
            "current_agent": "Issue Discovery Agent",
            "current_stage": "issues_ready",
            "raw_issues": [],
            "classified_issues": [],
            "events": events,
            "status": "running",
        }
