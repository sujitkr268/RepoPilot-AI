import asyncio
import os
import re
import shlex
import shutil
import sys
import tempfile
import time
from typing import Dict, Any, List, Optional, Tuple
from app.core.config import settings


class SecurityPolicyError(Exception):
    pass


class ExecutionSandbox:
    """
    Isolated execution runner for executing automated tests.
    Enforces security policies:
    - Command allowlisting
    - Environment variable sanitization
    - Execution timeout
    - No root / privileged escalation
    - Working directory isolation
    """

    ALLOWED_TEST_BINARIES = {
        "pytest",
        "python",
        "python3",
        "npm",
        "npx",
        "jest",
        "vitest",
        "cargo",
        "go",
    }

    DISALLOWED_PATTERNS = [
        r"\brm\s+-[rf]{1,2}\b",
        r"\bsudo\b",
        r"\bcurl\b",
        r"\bwget\b",
        r"\bchmod\b",
        r"\bchown\b",
        r"\bkill\b",
        r"\bshutdown\b",
        r"\breboot\b",
        r"\bdd\b",
        r"\bmkfs\b",
        r"/etc/",
        r"/var/run/",
        r"\bnetcat\b",
        r"\bnc\b",
        r"\bssh\b",
        r"\bscp\b",
    ]

    @classmethod
    def validate_command(cls, command: str) -> None:
        """
        Validates the command against safety policies.
        Raises SecurityPolicyError if command contains unsafe constructs.
        """
        if not command or not command.strip():
            raise SecurityPolicyError("Empty test command.")

        cmd_clean = command.strip()

        # Check for disallowed patterns
        for pattern in cls.DISALLOWED_PATTERNS:
            if re.search(pattern, cmd_clean, re.IGNORECASE):
                raise SecurityPolicyError(f"Command rejected: contains disallowed security pattern '{pattern}'.")

        # Check binary allowlist
        try:
            tokens = shlex.split(cmd_clean)
        except Exception as e:
            raise SecurityPolicyError(f"Command could not be parsed: {str(e)}")

        if not tokens:
            raise SecurityPolicyError("Command has no executable tokens.")

        main_binary = os.path.basename(tokens[0])
        if main_binary not in cls.ALLOWED_TEST_BINARIES:
            raise SecurityPolicyError(
                f"Binary '{main_binary}' is not permitted by test sandbox execution policy. "
                f"Allowed test runners: {', '.join(sorted(cls.ALLOWED_TEST_BINARIES))}"
            )

    @classmethod
    async def run_command_in_sandbox(
        cls,
        command: str,
        files_to_mount: Optional[Dict[str, str]] = None,
        timeout_seconds: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Executes an approved test command in an isolated temporary directory.
        files_to_mount: dict of {relative_path: content}
        """
        cls.validate_command(command)
        timeout = timeout_seconds or settings.SANDBOX_TIMEOUT_SECONDS

        temp_dir = tempfile.mkdtemp(prefix="repopilot_sandbox_")
        start_time = time.time()
        stdout = ""
        stderr = ""
        exit_code = 1
        timed_out = False

        try:
            # Mount files
            if files_to_mount:
                for rel_path, content in files_to_mount.items():
                    # Sanitize rel_path to prevent path traversal
                    clean_rel = os.path.normpath(rel_path).lstrip(os.path.sep)
                    if ".." in clean_rel:
                        continue
                    full_path = os.path.join(temp_dir, clean_rel)
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    with open(full_path, "w", encoding="utf-8") as f:
                        f.write(content)

            # Build safe environment with current environment's bin directory prioritized
            venv_bin = os.path.dirname(sys.executable)
            current_path = os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin")
            safe_path = f"{venv_bin}:{current_path}" if venv_bin not in current_path else current_path

            safe_env = {
                "PATH": safe_path,
                "LANG": "C.UTF-8",
                "LC_ALL": "C.UTF-8",
                "PYTHONDONTWRITEBYTECODE": "1",
                "PYTHONUNBUFFERED": "1",
                "CI": "true",
            }

            tokens = shlex.split(command)
            proc = await asyncio.create_subprocess_exec(
                *tokens,
                cwd=temp_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=safe_env,
            )

            try:
                raw_out, raw_err = await asyncio.wait_for(proc.communicate(), timeout=timeout)
                stdout = raw_out.decode("utf-8", errors="replace")
                stderr = raw_err.decode("utf-8", errors="replace")
                exit_code = proc.returncode or 0
            except asyncio.TimeoutError:
                timed_out = True
                try:
                    proc.kill()
                    await proc.wait()
                except Exception:
                    pass
                stderr = f"Execution timed out after {timeout} seconds."
                exit_code = 124

        except Exception as e:
            stderr = f"Sandbox execution error: {str(e)}"
            exit_code = 1
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

        duration = round(time.time() - start_time, 2)
        parsed_metrics = cls.parse_test_output(command, stdout, stderr, exit_code, timed_out)

        return {
            "command": command,
            "exit_code": exit_code,
            "stdout": stdout,
            "stderr": stderr,
            "duration_seconds": duration,
            "timed_out": timed_out,
            **parsed_metrics,
        }

    @classmethod
    def parse_test_output(
        cls, command: str, stdout: str, stderr: str, exit_code: int, timed_out: bool
    ) -> Dict[str, Any]:
        combined = f"{stdout}\n{stderr}"
        total = 0
        passed = 0
        failed = 0
        skipped = 0
        failure_details: List[Dict[str, Any]] = []

        # Pytest pattern: "5 passed, 1 failed, 2 skipped in 0.42s"
        pytest_match = re.search(r"(?:(\d+)\s+passed)?.*?(?:(\d+)\s+failed)?.*?(?:(\d+)\s+skipped)?", combined)
        if "pytest" in command and pytest_match:
            p = re.findall(r"(\d+)\s+passed", combined)
            f = re.findall(r"(\d+)\s+failed", combined)
            s = re.findall(r"(\d+)\s+skipped", combined)
            if p:
                passed = int(p[-1])
            if f:
                failed = int(f[-1])
            if s:
                skipped = int(s[-1])
            total = passed + failed + skipped

        # Jest pattern: "Tests: 1 failed, 4 passed, 5 total"
        jest_match = re.search(r"Tests:\s+(?:(\d+)\s+failed,\s+)?(?:(\d+)\s+passed,\s+)?(\d+)\s+total", combined)
        if jest_match:
            f = jest_match.group(1)
            p = jest_match.group(2)
            t = jest_match.group(3)
            failed = int(f) if f else 0
            passed = int(p) if p else 0
            total = int(t) if t else (passed + failed)

        # Fallback when test tool didn't output standard line
        if total == 0:
            if exit_code == 0:
                passed = 1
                total = 1
            else:
                failed = 1
                total = 1

        status = "passed" if exit_code == 0 and failed == 0 and not timed_out else "failed"
        if timed_out:
            status = "timed_out"

        ai_analysis = None
        suggested_fixes = []

        if status != "passed":
            # Extract failure messages
            lines = combined.splitlines()
            err_lines = [line for line in lines if any(k in line.lower() for k in ("error:", "failed:", "assertionerror", "fail", "traceback"))]
            ai_analysis = (
                f"Test execution reported failure with exit code {exit_code}.\n"
                f"Identified error signals:\n" + "\n".join(err_lines[:5])
                if err_lines
                else f"Process terminated abnormally with code {exit_code}."
            )
            suggested_fixes = [
                "Inspect the failing assertions and check whether inputs match expected schemas.",
                "Verify required imports and mock any external network or database calls in unit tests.",
            ]

        return {
            "status": status,
            "total_tests": total,
            "passed_tests": passed,
            "failed_tests": failed,
            "skipped_tests": skipped,
            "failure_details": failure_details,
            "ai_failure_analysis": ai_analysis,
            "suggested_fixes": suggested_fixes,
        }
