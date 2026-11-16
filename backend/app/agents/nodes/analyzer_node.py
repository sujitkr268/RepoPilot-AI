from typing import Dict, Any
from app.agents.state import AgentWorkflowState
from app.integrations.github import GitHubClient
from app.services.repository_analyzer import RepositoryAnalyzerService


async def analyze_repository_node(state: AgentWorkflowState) -> Dict[str, Any]:
    """Node for analyzing repository structure, manifests, and architecture."""
    owner = state.get("owner", "")
    repo = state.get("repo", "")
    default_branch = state.get("default_branch", "main")

    gh_client = GitHubClient()
    analyzer = RepositoryAnalyzerService(gh_client)

    try:
        analysis = await analyzer.analyze(owner, repo, default_branch=default_branch)
        events = list(state.get("events", []))
        events.append({
            "agent_name": "Repository Analyzer Agent",
            "stage": "repository_analyzed",
            "event_type": "step",
            "message": f"Successfully analyzed {owner}/{repo}: detected {len(analysis['frameworks'])} frameworks and {len(analysis['entry_points'])} entrypoints.",
            "payload": {"frameworks": analysis["frameworks"], "languages": analysis["languages"]},
        })

        return {
            "current_agent": "Repository Analyzer Agent",
            "current_stage": "analysis_completed",
            "languages": analysis["languages"],
            "frameworks": analysis["frameworks"],
            "architecture_summary": analysis["architecture_summary"],
            "key_directories": analysis["key_directories"],
            "entry_points": analysis["entry_points"],
            "test_frameworks": analysis["test_frameworks"],
            "events": events,
            "status": "running",
        }
    except Exception as e:
        events = list(state.get("events", []))
        events.append({
            "agent_name": "Repository Analyzer Agent",
            "stage": "analysis_failed",
            "event_type": "error",
            "message": f"Analysis failed: {str(e)}",
            "payload": {},
        })
        return {
            "current_agent": "Repository Analyzer Agent",
            "current_stage": "failed",
            "status": "failed",
            "error": str(e),
            "events": events,
        }
