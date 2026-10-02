"""Resource Allocation Agent — LangGraph supervisor pipeline.

Four distinct agents (per SE3090 §9.1):
  1. dispatch_coordinator  — plans the workflow (LLM, structured output)
  2. warehouse_analyst     — allow-listed tool: rank warehouses
  3. dispatch_planner      — allow-listed tool: compute allocation
  4. validation_safety     — deterministic gate + retry policy

Human approval is enforced downstream by the .NET backend, which stores
the plan with approval_status = PendingApproval until a ResourceManager
approves it. This keeps the LLM out of the authorisation decision.
"""
import logging
import os
from typing import Annotated, Any, Dict, List, Optional, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field

from resource_tools import (
    ToolError,
    compute_allocation,
    get_warehouse_candidates,
    validate_dispatch_plan,
)

load_dotenv()

MAX_RETRIES = 2


class State(TypedDict):
    messages: Annotated[list, add_messages]
    mission_id: str
    teams_required: int
    latitude: float
    longitude: float
    district: str
    warehouses: List[Dict[str, Any]]
    inventory: List[Dict[str, Any]]
    candidates: List[Dict[str, Any]]
    selected_warehouse: Optional[Dict[str, Any]]
    dispatch_plan: Optional[Dict[str, Any]]
    validation_errors: List[str]
    retries: int
    approval_status: str
    overall_status: str
    error: Optional[str]
    steps: List[Dict[str, Any]]


def _llm() -> ChatGoogleGenerativeAI:
    key = os.getenv("GOOGLE_API_KEY")
    if not key:
        raise RuntimeError("GOOGLE_API_KEY is not set. Copy .env.example -> .env.")
    return ChatGoogleGenerativeAI(
        model=os.getenv("CHAT_MODEL", "gemini-3.5-flash-lite"),
        google_api_key=key,
        temperature=0,
        timeout=60,
        max_retries=3,
    )


# ---------------------------------------------------------------------------
# Agent 1 — Coordinator (planning)
# ---------------------------------------------------------------------------
class Plan(BaseModel):
    objective: str = Field(description="One-sentence restatement of the mission.")
    step_1: str = Field(description="First step, e.g. 'rank_warehouses'.")
    step_2: str = Field(description="Second step, e.g. 'compute_allocation'.")
    step_3: str = Field(description="Third step, e.g. 'validate_plan'.")
    step_4: str = Field(description="Fourth step, e.g. 'await_human_approval'.")
    reasoning: str = Field(description="Why this sequence of steps.")


def dispatch_coordinator(state: State) -> Dict[str, Any]:
    llm = _llm()
    system = (
        "You are the DISPATCH COORDINATOR for an emergency logistics team. "
        "Given a rescue mission, produce a short plan. The four steps must be, "
        "in order: 'rank_warehouses', 'compute_allocation', 'validate_plan', "
        "'await_human_approval'. Return structured output only."
    )
    user = (
        f"Mission {state['mission_id']}: {state['teams_required']} teams "
        f"required at district={state['district']} "
        f"({state['latitude']},{state['longitude']}). "
        f"Available warehouses: {len(state.get('warehouses') or [])}, "
        f"inventory rows: {len(state.get('inventory') or [])}."
    )
    raw: Plan = llm.with_structured_output(Plan).invoke(   #type:ignore
        [SystemMessage(system), HumanMessage(user)]
    )
    plan_steps = [raw.step_1, raw.step_2, raw.step_3, raw.step_4]
    step = {
        "agent": "dispatch_coordinator",
        "action": "plan",
        "status": "success",
        "summary": raw.objective,
        "plan": plan_steps,
        "reasoning": raw.reasoning,
    }
    return {
        "steps": state.get("steps", []) + [step],
        "messages": state.get("messages", []) + [
            AIMessage(content=f"[coordinator] plan: {plan_steps}",
                      name="dispatch_coordinator")
        ],
        "retries": 0,
        "approval_status": "PendingApproval",
        "overall_status": "Success",
    }

# ---------------------------------------------------------------------------
# Agent 2 — Warehouse Analyst (allow-listed tool)
# ---------------------------------------------------------------------------
def warehouse_analyst(state: State) -> Dict[str, Any]:
    try:
        candidates = get_warehouse_candidates.invoke({
            "latitude": state["latitude"],
            "longitude": state["longitude"],
            "district": state["district"],
            "teams_required": state["teams_required"],
            "warehouses": state.get("warehouses") or [],
            "inventory": state.get("inventory") or [],
        })
    except ToolError as exc:
        msg = str(exc)
        return {
            "steps": state["steps"] + [{
                "agent": "warehouse_analyst", "action": "rank_warehouses",
                "status": "failed", "summary": msg,
            }],
            "validation_errors": [msg],
            "approval_status": "SafeFailure",
            "overall_status": "Failed",
            "error": msg,
        }

    if not candidates or candidates[0]["total_stock"] <= 0:
        msg = "No warehouse has any stock available."
        return {
            "steps": state["steps"] + [{
                "agent": "warehouse_analyst", "action": "rank_warehouses",
                "status": "failed", "summary": msg,
            }],
            "validation_errors": [msg],
            "approval_status": "SafeFailure",
            "overall_status": "Failed",
            "error": msg,
        }

    best = candidates[0]
    return {
        "candidates": candidates,
        "selected_warehouse": best,
        "steps": state["steps"] + [{
            "agent": "warehouse_analyst",
            "action": "rank_warehouses",
            "status": "success",
            "summary": (f"Selected {best['name']} "
                        f"(stock={best['total_stock']}, "
                        f"{best['distance_km']} km)"),
            "tool": "get_warehouse_candidates",
        }],
    }


# ---------------------------------------------------------------------------
# Agent 3 — Dispatch Planner (allow-listed tool)
# ---------------------------------------------------------------------------
def dispatch_planner(state: State) -> Dict[str, Any]:
    if not state.get("selected_warehouse"):
        return {
            "validation_errors": ["No warehouse selected."],
            "approval_status": "SafeFailure",
            "overall_status": "Failed",
        }
    try:
        plan = compute_allocation.invoke({
            "mission_id": state["mission_id"],
            "teams_required": state["teams_required"],
            "district": state["district"],
            "warehouse": state["selected_warehouse"],
        })
    except ToolError as exc:
        msg = str(exc)
        return {
            "steps": state["steps"] + [{
                "agent": "dispatch_planner", "action": "compute_allocation",
                "status": "failed", "summary": msg,
            }],
            "validation_errors": [msg],
            "approval_status": "SafeFailure",
            "overall_status": "Failed",
            "error": msg,
        }
    return {
        "dispatch_plan": plan,
        "steps": state["steps"] + [{
            "agent": "dispatch_planner",
            "action": "compute_allocation",
            "status": "success",
            "summary": plan["routeSummary"],
            "tool": "compute_allocation",
        }],
    }


# ---------------------------------------------------------------------------
# Agent 4 — Validation & Safety (deterministic gate)
# ---------------------------------------------------------------------------
def validation_safety(state: State) -> Dict[str, Any]:
    errors = validate_dispatch_plan.invoke({
        "plan": state.get("dispatch_plan") or {},
        "warehouse": state.get("selected_warehouse") or {},
    })
    passed = not errors
    step = {
        "agent": "validation_safety",
        "action": "validate_plan",
        "status": "success" if passed else "failed",
        "summary": "Validation passed." if passed else "; ".join(errors),
        "tool": "validate_dispatch_plan",
        "errors": errors,
    }
    return {
        "validation_errors": errors,
        "steps": state["steps"] + [step],
        "approval_status": "PendingApproval" if passed else "SafeFailure",
        "overall_status": "Success" if passed else "Failed",
        "error": None if passed else "; ".join(errors),
    }


def route_after_validation(state: State) -> str:
    if state["validation_errors"]:
        if state["retries"] < MAX_RETRIES:
            return "retry"
        return "fail"
    return "approve"


# ---------------------------------------------------------------------------
# Routing functions
# ---------------------------------------------------------------------------
def route_after_analyst(state: State) -> str:
    """Fast-fail: if the analyst couldn't find stock, end the graph
    immediately instead of passing control to the planner, which would
    also fail and create a long fail-loop."""
    if state.get("selected_warehouse") is None:
        return "fail"
    if state.get("validation_errors") and state.get("approval_status") == "SafeFailure":
        return "fail"
    return "planner"


def route_after_validation(state: State) -> str:
    if state["validation_errors"]:
        if state["retries"] < MAX_RETRIES:
            return "retry"
        return "fail"
    return "approve"


# ---------------------------------------------------------------------------
# Graph wiring
# ---------------------------------------------------------------------------
def build_resource_graph():
    g = StateGraph(State)   #type: ignore
    g.add_node("coordinator", dispatch_coordinator)
    g.add_node("analyst", warehouse_analyst)
    g.add_node("planner", dispatch_planner)
    g.add_node("validator", validation_safety)

    g.add_edge(START, "coordinator")
    g.add_edge("coordinator", "analyst")

    # Analyst → Planner (normal) OR → END (fast-fail on no stock)
    g.add_conditional_edges(
        "analyst",
        route_after_analyst,
        {"planner": "planner", "fail": END},
    )

    g.add_edge("planner", "validator")

    g.add_conditional_edges(
        "validator",
        route_after_validation,
        {"retry": "analyst", "fail": END, "approve": END},
    )

    return g.compile(checkpointer=InMemorySaver())


GRAPH = build_resource_graph()

def run_resource_workflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Entry point called by the FastAPI service."""
    initial: State = {
        "messages": [HumanMessage(content=f"Mission {payload['mission_id']}")],
        "mission_id": payload["mission_id"],
        "teams_required": int(payload["teams_required"]),
        "latitude": float(payload["latitude"]),
        "longitude": float(payload["longitude"]),
        "district": payload.get("district") or "Unknown",
        "warehouses": payload.get("warehouses") or [],
        "inventory": payload.get("inventory") or [],
        "candidates": [],
        "selected_warehouse": None,
        "dispatch_plan": None,
        "validation_errors": [],
        "retries": 0,
        "approval_status": "PendingApproval",
        "overall_status": "Success",
        "error": None,
        "steps": [],
    }
    return GRAPH.invoke(
        initial,
        {"configurable": {"thread_id": payload["mission_id"]}},
    )


def execute_dispatch(state: Dict[str, Any]) -> Dict[str, Any]:
    """Backwards-compatible wrapper for the legacy service entry point."""
    return run_resource_workflow({
        "mission_id": state["mission_id"],
        "teams_required": state["teams_required"],
        "latitude": state["latitude"],
        "longitude": state["longitude"],
        "district": state.get("district"),
        "warehouses": state.get("warehouses") or [],
        "inventory": state.get("inventory") or [],
    })