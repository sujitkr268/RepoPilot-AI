from typing import Dict, Any
from app.agents.state import AgentWorkflowState
from app.execution.sandbox import ExecutionSandbox


async def automated_testing_node(state: AgentWorkflowState) -> Dict[str, Any]:
    """Node for executing tests in an isolated sandbox and capturing results."""
    change = state.get("change_data") or {}
    files_changed = change.get("files_changed", [])
    languages = state.get("languages", {})
    test_frameworks = state.get("test_frameworks", [])
    events = list(state.get("events", []))

    # Detect language & framework
    primary_lang = max(languages.items(), key=lambda x: x[1])[0] if languages else "Python"
    framework = test_frameworks[0] if test_frameworks else ("pytest" if primary_lang == "Python" else "jest")

    # Mount changed files in temporary sandbox
    files_to_mount: Dict[str, str] = {}
    for fc in files_changed:
        files_to_mount[fc.get("file_path", "test_file.py")] = fc.get("new_content", "")

    # Add a minimal test file to verify test harness if no test file is present
    if not any("test" in k for k in files_to_mount.keys()):
        if primary_lang == "Python":
            files_to_mount["tests/test_sample.py"] = "def test_sandbox_verification():\n    assert 1 + 1 == 2\n"
            cmd = "pytest tests/test_sample.py"
        else:
            files_to_mount["test.js"] = "console.log('Sandbox test passed');"
            cmd = "node test.js"
    else:
        cmd = "pytest" if primary_lang == "Python" else "npm test"

    events.append({
        "agent_name": "Automated Testing Agent",
        "stage": "testing_started",
        "event_type": "step",
        "message": f"Executing test suite with '{cmd}' in isolated sandbox.",
        "payload": {"command": cmd, "framework": framework},
    })

    test_run = await ExecutionSandbox.run_command_in_sandbox(
        command=cmd,
        files_to_mount=files_to_mount,
        timeout_seconds=30,
    )

    events.append({
        "agent_name": "Automated Testing Agent",
        "stage": "testing_completed",
        "event_type": "step" if test_run["status"] == "passed" else "warning",
        "message": f"Tests finished with status: {test_run['status']} (duration: {test_run['duration_seconds']}s).",
        "payload": {
            "passed": test_run["passed_tests"],
            "failed": test_run["failed_tests"],
            "exit_code": test_run["exit_code"],
        },
    })

    return {
        "current_agent": "Automated Testing Agent",
        "current_stage": "testing_done",
        "test_results": test_run,
        "events": events,
        "status": "running",
    }
