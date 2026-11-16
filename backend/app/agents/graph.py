from typing import Dict, Any
from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentWorkflowState
from app.agents.nodes.analyzer_node import analyze_repository_node
from app.agents.nodes.issue_node import discover_issues_node
from app.agents.nodes.planner_node import implementation_planner_node
from app.agents.nodes.codegen_node import code_generation_node
from app.agents.nodes.tester_node import automated_testing_node
from app.agents.nodes.reviewer_node import code_review_node
from app.agents.nodes.pr_node import pull_request_node


def build_engineering_graph():
    """
    Constructs the end-to-end LangGraph state machine for RepoPilot AI.
    Coordinates:
    Repository Analysis
      -> Issue Discovery
      -> Implementation Planning
      -> Code Generation
      -> Isolated Testing
      -> AI Code Review
      -> Pull Request Preparation
    """
    builder = StateGraph(AgentWorkflowState)

    builder.add_node("analyze_repository", analyze_repository_node)
    builder.add_node("discover_issues", discover_issues_node)
    builder.add_node("implementation_planning", implementation_planner_node)
    builder.add_node("code_generation", code_generation_node)
    builder.add_node("automated_testing", automated_testing_node)
    builder.add_node("code_review", code_review_node)
    builder.add_node("pull_request_prep", pull_request_node)

    builder.add_edge(START, "analyze_repository")
    builder.add_edge("analyze_repository", "discover_issues")
    builder.add_edge("discover_issues", "implementation_planning")
    builder.add_edge("implementation_planning", "code_generation")
    builder.add_edge("code_generation", "automated_testing")
    builder.add_edge("automated_testing", "code_review")
    builder.add_edge("code_review", "pull_request_prep")
    builder.add_edge("pull_request_prep", END)

    return builder.compile()


engineering_graph = build_engineering_graph()
