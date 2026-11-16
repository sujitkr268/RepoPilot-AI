import pytest
from app.agents.graph import engineering_graph
from app.agents.state import AgentWorkflowState


@pytest.mark.asyncio
async def test_langgraph_engineering_workflow():
    initial_state: AgentWorkflowState = {
        "session_id": "test-session-1",
        "owner": "fastapi",
        "repo": "fastapi",
        "default_branch": "master",
        "selected_issue": {
            "title": "Clarify error message in request validation",
            "body": "When a validation error occurs, provide clearer hint in response JSON.",
            "labels": ["good first issue"],
        },
        "retrieved_chunks": [],
        "events": [],
    }

    final_state = await engineering_graph.ainvoke(initial_state)

    assert final_state["current_stage"] in ("pr_ready", "completed")
    assert "plan_data" in final_state
    assert len(final_state["plan_data"]["checklist"]) > 0
    assert "change_data" in final_state
    assert len(final_state["change_data"]["files_changed"]) > 0
    assert "test_results" in final_state
    assert "review_results" in final_state
    assert "pr_data" in final_state
    assert len(final_state["events"]) >= 5
