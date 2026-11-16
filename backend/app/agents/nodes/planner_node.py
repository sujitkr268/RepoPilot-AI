import json
from typing import Dict, Any, List
from app.agents.state import AgentWorkflowState
from app.agents.llm_provider import LLMProvider
from app.core.security import sanitize_prompt_input


async def implementation_planner_node(state: AgentWorkflowState) -> Dict[str, Any]:
    """Node for generating structured implementation plans with editable checklists."""
    selected_issue = state.get("selected_issue") or {}
    issue_title = selected_issue.get("title", "Open Source Engineering Task")
    issue_body = sanitize_prompt_input(selected_issue.get("body", ""))
    retrieved_chunks = state.get("retrieved_chunks", [])
    events = list(state.get("events", []))

    files_summary = list({c.get("path") for c in retrieved_chunks if c.get("path")})[:6]

    system_prompt = (
        "You are the Implementation Planning Agent for RepoPilot AI. "
        "Analyze the provided open-source issue and codebase context to produce a comprehensive, structured implementation plan. "
        "Return valid JSON matching this schema:\n"
        "{\n"
        '  "title": "string",\n'
        '  "problem_explanation": "string",\n'
        '  "root_cause_analysis": "string",\n'
        '  "strategy_overview": "string",\n'
        '  "affected_files": ["string"],\n'
        '  "checklist": [{"id": 1, "description": "string", "completed": false, "file_path": "string"}],\n'
        '  "dependencies": ["string"],\n'
        '  "potential_side_effects": ["string"],\n'
        '  "testing_strategy": "string"\n'
        "}"
    )

    user_prompt = (
        f"Issue Title: {issue_title}\n"
        f"Issue Description:\n{issue_body}\n\n"
        f"Related Files in Repository: {', '.join(files_summary) if files_summary else 'Core application files'}\n"
    )

    raw_response = await LLMProvider.generate_completion(system_prompt, user_prompt, json_output=True)
    try:
        plan_data = json.loads(raw_response)
    except Exception:
        # Fallback structured plan
        plan_data = {
            "title": f"Resolve: {issue_title[:60]}",
            "problem_explanation": f"Addressing the requirement defined in issue: '{issue_title}'.",
            "root_cause_analysis": "Deficiency in input validation or missing feature handler.",
            "strategy_overview": "Implement targeted changes in affected modules and provide automated regression coverage.",
            "affected_files": files_summary or ["src/main.py"],
            "checklist": [
                {"id": 1, "description": f"Inspect {f}", "completed": False, "file_path": f}
                for f in (files_summary or ["src/main.py"])[:3]
            ],
            "dependencies": [],
            "potential_side_effects": ["Verify existing public API contract remains backward compatible."],
            "testing_strategy": "Run isolated test suite inside execution sandbox.",
        }

    events.append({
        "agent_name": "Implementation Planner Agent",
        "stage": "plan_generated",
        "event_type": "step",
        "message": f"Generated implementation plan: '{plan_data.get('title')}' with {len(plan_data.get('checklist', []))} checklist items.",
        "payload": {"title": plan_data.get("title"), "affected_files": plan_data.get("affected_files")},
    })

    return {
        "current_agent": "Implementation Planner Agent",
        "current_stage": "plan_ready",
        "plan_data": plan_data,
        "is_plan_approved": False,
        "events": events,
        "status": "waiting_approval",
    }
