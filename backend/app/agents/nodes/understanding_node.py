from typing import Dict, Any, List
from app.agents.state import AgentWorkflowState
from app.agents.llm_provider import LLMProvider
from app.core.security import sanitize_prompt_input


async def repository_understanding_node(state: AgentWorkflowState) -> Dict[str, Any]:
    """Node for answering codebase questions with verified source references."""
    query = sanitize_prompt_input(state.get("query", ""))
    retrieved_chunks = state.get("retrieved_chunks", [])
    events = list(state.get("events", []))

    context_snippets = []
    for c in retrieved_chunks[:5]:
        context_snippets.append(
            f"File: {c.get('path')} (Lines {c.get('start_line')}-{c.get('end_line')}):\n```\n{c.get('content')}\n```"
        )
    context_str = "\n\n".join(context_snippets) if context_snippets else "No specific file snippets retrieved."

    system_prompt = (
        "You are the Repository Understanding Agent for RepoPilot AI. "
        "Your role is to explain codebase architecture, data flows, APIs, and file roles accurately. "
        "RULES:\n"
        "1. Never invent file paths or line numbers. Reference only provided context.\n"
        "2. If unsure or information is absent, state the limitation directly.\n"
        "3. Provide clean, actionable technical explanations."
    )
    user_prompt = f"Codebase Context:\n{context_str}\n\nDeveloper Question:\n{query}"

    answer = await LLMProvider.generate_completion(system_prompt, user_prompt)

    events.append({
        "agent_name": "Repository Understanding Agent",
        "stage": "query_answered",
        "event_type": "step",
        "message": f"Processed query: '{query[:50]}...'",
        "payload": {"query": query, "references_count": len(retrieved_chunks)},
    })

    return {
        "current_agent": "Repository Understanding Agent",
        "current_stage": "answer_generated",
        "events": events,
    }
