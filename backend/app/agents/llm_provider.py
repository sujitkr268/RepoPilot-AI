import json
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings


class LLMProvider:
    """
    Unified LLM provider interface.
    Supports:
    - Mock / Deterministic mode (for zero-cost, reliable local development & testing)
    - OpenAI / OpenAI-compatible (Groq, vLLM, Ollama)
    - Anthropic Claude
    - Google Gemini
    """

    @classmethod
    async def generate_completion(
        cls,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        json_output: bool = False,
    ) -> str:
        provider = settings.LLM_PROVIDER.lower()
        temp = temperature if temperature is not None else settings.LLM_TEMPERATURE

        if provider == "mock" or not settings.LLM_API_KEY:
            return cls._mock_completion(system_prompt, user_prompt, json_output)

        if provider in ("openai", "groq", "ollama"):
            return await cls._openai_completion(system_prompt, user_prompt, temp, json_output)
        elif provider == "anthropic":
            return await cls._anthropic_completion(system_prompt, user_prompt, temp)
        elif provider == "gemini":
            return await cls._gemini_completion(system_prompt, user_prompt, temp)
        else:
            return cls._mock_completion(system_prompt, user_prompt, json_output)

    @classmethod
    async def _openai_completion(
        cls, system_prompt: str, user_prompt: str, temperature: float, json_output: bool
    ) -> str:
        base_url = settings.LLM_BASE_URL or "https://api.openai.com/v1"
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "Content-Type": "application/json",
        }
        payload: Dict[str, Any] = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
        }
        if json_output:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    @classmethod
    async def _anthropic_completion(cls, system_prompt: str, user_prompt: str, temperature: float) -> str:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": settings.LLM_API_KEY or "",
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": settings.LLM_MODEL or "claude-3-5-sonnet-20241022",
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "max_tokens": 4096,
            "temperature": temperature,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]

    @classmethod
    async def _gemini_completion(cls, system_prompt: str, user_prompt: str, temperature: float) -> str:
        model = settings.LLM_MODEL or "gemini-1.5-pro"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.LLM_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": f"{system_prompt}\n\nUser Question:\n{user_prompt}"}]}],
            "generationConfig": {"temperature": temperature},
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    @classmethod
    def _mock_completion(cls, system_prompt: str, user_prompt: str, json_output: bool) -> str:
        """
        Deterministic mock completions tailored to RepoPilot tasks
        when external API keys are not supplied.
        """
        sys_lower = system_prompt.lower()
        user_lower = user_prompt.lower()

        if "planner" in sys_lower or "implementation plan" in user_lower:
            plan_obj = {
                "title": "Fix regression and add edge-case validation",
                "problem_explanation": "Identified parameter boundary issue where unexpected inputs cause unhandled exceptions.",
                "root_cause_analysis": "Missing schema validation check before passing parameters to core execution handler.",
                "strategy_overview": "Introduce input sanitization layer and add unit regression tests to verify behavior.",
                "affected_files": ["app/core/validator.py", "tests/test_validator.py"],
                "checklist": [
                    {"id": 1, "description": "Add bounds check for payload parameters", "completed": False, "file_path": "app/core/validator.py"},
                    {"id": 2, "description": "Write regression test replicating issue scenario", "completed": False, "file_path": "tests/test_validator.py"},
                    {"id": 3, "description": "Run test suite in sandbox", "completed": False, "file_path": "tests/test_validator.py"}
                ],
                "dependencies": [],
                "potential_side_effects": ["Slightly stricter validation might reject malformed requests that previously failed silently."],
                "testing_strategy": "Run `pytest tests/test_validator.py` ensuring new assertions pass."
            }
            return json.dumps(plan_obj) if json_output else plan_obj["strategy_overview"]

        if "codegen" in sys_lower or "code generation" in user_lower or "generate changes" in user_lower:
            change_obj = {
                "title": "Implement bounds checking and regression tests",
                "summary": "Added defensive validation against out-of-bounds inputs and unit tests.",
                "files_changed": [
                    {
                        "file_path": "app/core/validator.py",
                        "original_content": "def validate_item(item):\n    return item['value'] > 0\n",
                        "new_content": "def validate_item(item):\n    if not item or not isinstance(item, dict):\n        return False\n    return item.get('value', 0) > 0\n",
                        "diff": "--- app/core/validator.py\n+++ app/core/validator.py\n@@ -1,2 +1,4 @@\n def validate_item(item):\n-    return item['value'] > 0\n+    if not item or not isinstance(item, dict):\n+        return False\n+    return item.get('value', 0) > 0\n",
                        "explanation": "Added null check and dict type assertion before accessing item dictionary."
                    }
                ],
                "unified_diff": "--- app/core/validator.py\n+++ app/core/validator.py\n@@ -1,2 +1,4 @@\n def validate_item(item):\n-    return item['value'] > 0\n+    if not item or not isinstance(item, dict):\n+        return False\n+    return item.get('value', 0) > 0\n"
            }
            return json.dumps(change_obj) if json_output else change_obj["summary"]

        if "review" in sys_lower or "code review" in user_lower:
            review_obj = {
                "overall_status": "approved",
                "summary": "Changes are well-scoped, safe, and follow idiomatic practices.",
                "quality_score": 95.0,
                "critical_count": 0,
                "high_count": 0,
                "medium_count": 0,
                "low_count": 1,
                "info_count": 1,
                "findings": [
                    {
                        "severity": "Low",
                        "category": "Maintainability",
                        "file_path": "app/core/validator.py",
                        "line_reference": 2,
                        "explanation": "Consider adding typing annotations (e.g. `Dict[str, Any] -> bool`) for improved readability.",
                        "evidence": "def validate_item(item):",
                        "suggested_correction": "def validate_item(item: Optional[Dict[str, Any]]) -> bool:"
                    }
                ]
            }
            return json.dumps(review_obj) if json_output else review_obj["summary"]

        if "qna" in sys_lower or "explain" in user_lower or "how does" in user_lower:
            return (
                "Based on the repository architecture and source files:\n\n"
                "- The entry point defines the primary application lifecycle and mounts service routes.\n"
                "- Configuration settings are encapsulated using environment schemas with strict validation.\n"
                "- Database interactions are mediated through asynchronous ORM sessions.\n\n"
                "To modify this functionality, inspect the corresponding service modules in the repository."
            )

        return "Completed AI engineering analysis with verified repository context."
