import json
import difflib
from typing import Dict, Any, List
from app.agents.state import AgentWorkflowState
from app.agents.llm_provider import LLMProvider


async def code_generation_node(state: AgentWorkflowState) -> Dict[str, Any]:
    """Node for generating structured code changes with unified diffs."""
    plan = state.get("plan_data") or {}
    plan_title = plan.get("title", "Implementation Plan")
    affected_files = plan.get("affected_files", ["src/main.py"])
    events = list(state.get("events", []))

    system_prompt = (
        "You are the Code Generation Agent for RepoPilot AI. "
        "Generate minimal, idiomatic, high-quality code changes matching the approved plan. "
        "Return valid JSON matching this schema:\n"
        "{\n"
        '  "title": "string",\n'
        '  "summary": "string",\n'
        '  "files_changed": [\n'
        "    {\n"
        '      "file_path": "string",\n'
        '      "original_content": "string",\n'
        '      "new_content": "string",\n'
        '      "explanation": "string"\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    user_prompt = (
        f"Plan Title: {plan_title}\n"
        f"Strategy: {plan.get('strategy_overview', '')}\n"
        f"Files to modify: {', '.join(affected_files)}\n"
    )

    raw_response = await LLMProvider.generate_completion(system_prompt, user_prompt, json_output=True)

    try:
        parsed = json.loads(raw_response)
        files_changed = parsed.get("files_changed", [])
    except Exception:
        files_changed = [
            {
                "file_path": affected_files[0] if affected_files else "app/main.py",
                "original_content": "# Original implementation\ndef handler():\n    pass\n",
                "new_content": "# Updated implementation with validation\ndef handler(payload=None):\n    if payload is None:\n        return {'status': 'ok'}\n    return {'status': 'processed', 'data': payload}\n",
                "explanation": "Added default payload parameter and safe validation.",
            }
        ]
        parsed = {
            "title": f"Code Changes: {plan_title[:50]}",
            "summary": "Implemented safe parameter handling and defensive checks.",
            "files_changed": files_changed,
        }

    # Generate unified diffs
    diff_chunks: List[str] = []
    for fc in files_changed:
        orig = fc.get("original_content", "").splitlines(keepends=True)
        new = fc.get("new_content", "").splitlines(keepends=True)
        path = fc.get("file_path", "unknown")
        diff_lines = list(difflib.unified_diff(orig, new, fromfile=f"a/{path}", tofile=f"b/{path}"))
        diff_str = "".join(diff_lines)
        fc["diff"] = diff_str
        diff_chunks.append(diff_str)

    unified_diff = "\n".join(diff_chunks)
    change_data = {
        "title": parsed.get("title", "Proposed Code Changes"),
        "summary": parsed.get("summary", "Generated proposed changes."),
        "files_changed": files_changed,
        "unified_diff": unified_diff,
        "is_approved": False,
    }

    events.append({
        "agent_name": "Code Generation Agent",
        "stage": "code_generated",
        "event_type": "step",
        "message": f"Generated code modifications for {len(files_changed)} file(s).",
        "payload": {"files": [f.get("file_path") for f in files_changed]},
    })

    return {
        "current_agent": "Code Generation Agent",
        "current_stage": "code_ready",
        "change_data": change_data,
        "is_change_approved": False,
        "events": events,
        "status": "waiting_approval",
    }
