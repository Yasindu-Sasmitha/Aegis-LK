import os
from pathlib import Path
from typing import TypedDict, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
import json
from datetime import datetime, timezone

load_dotenv(Path(__file__).resolve().parent / ".env")

API_KEY = os.getenv("GOOGLE_API_KEY", "")
CHAT_MODEL = os.getenv("CHAT_MODEL", "gemini-2.5-flash-lite")
assert API_KEY and "XXXX" not in API_KEY, (
    "GOOGLE_API_KEY missing: copy .env.example -> .env and paste your Google AI Studio key"
)


class IncidentAssessment(BaseModel):
    severity_assessed: str = Field(description="One of: Low, Medium, High, Critical")
    teams_required: int = Field(ge=1, le=20)
    recommendation: str = Field(max_length=300)


class IncidentAgentState(TypedDict):
    disaster_type: str
    severity_reported: str
    description: str
    latitude: float
    longitude: float
    llm_output: Optional[dict]
    severity_assessed: str
    teams_required: int
    recommendation: str
    steps: list[dict]
    overall_status: str
    error: Optional[str]


llm = ChatGoogleGenerativeAI(
    model=CHAT_MODEL,
    google_api_key=API_KEY,
    temperature=0,
    timeout=60,
    max_retries=3,   # absorbs transient 429s automatically, same as Weather's agent
)
structured_llm = llm.with_structured_output(IncidentAssessment)


def compute_assessment(state: IncidentAgentState) -> IncidentAgentState:
    prompt = f"""You are a disaster severity assessment agent for the Incident & Rescue Operations
system in Sri Lanka. A citizen has reported the following disaster:

Disaster type: {state['disaster_type']}
Citizen-reported severity: {state['severity_reported']}
Description: {state['description']}
Location (lat, lng): {state['latitude']}, {state['longitude']}

Assess the true severity of this incident and how many rescue teams should be dispatched.
Consider that citizen-reported severity may be an over- or under-estimate — use the description
itself as the primary signal. Be conservative: when uncertain, prefer a higher severity/team count
over under-resourcing a real emergency, but do not wildly over-recommend for clearly minor reports.
Give a short, actionable recommendation an officer can act on immediately.
"""

    steps = list(state["steps"])
    last_error = None

    # Try once, retry once — mirrors Weather's self-correction pattern.
    for attempt in range(1, 3):
        started = datetime.now(timezone.utc)
        try:
            result: IncidentAssessment = structured_llm.invoke(prompt)
            steps.append({
                "step": "compute_assessment", "tool": f"gemini:{CHAT_MODEL}", "attempt": attempt,
                "duration_ms": int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
                "status": "success",
            })
            return {**state, "llm_output": result.model_dump(), "steps": steps}
        except Exception as e:
            last_error = str(e)
            steps.append({
                "step": "compute_assessment", "tool": f"gemini:{CHAT_MODEL}", "attempt": attempt,
                "duration_ms": int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
                "status": "failed", "error": last_error,
            })

    return {**state, "error": f"Failed after 2 attempts: {last_error}", "steps": steps, "overall_status": "Failed"}


def validate_and_decide(state: IncidentAgentState) -> IncidentAgentState:
    if state.get("error"):
        return state

    started = datetime.now(timezone.utc)
    output = dict(state["llm_output"])

    valid_severities = {"Low", "Medium", "High", "Critical"}
    if output["severity_assessed"] not in valid_severities:
        output["severity_assessed"] = "Medium"  # safe fallback, never crash on an unexpected label

    output["teams_required"] = min(20, max(1, int(output["teams_required"])))

    # Deterministic safety net: Critical severity should never be resourced with just 1 team,
    # regardless of what the LLM said — a code-side floor, not something the model can talk itself
    # out of.
    if output["severity_assessed"] == "Critical" and output["teams_required"] < 3:
        output["teams_required"] = 3
        output["recommendation"] += " [auto-adjusted: Critical severity requires at least 3 teams]"

    step = {
        "step": "validate_and_decide", "tool": "code",
        "duration_ms": int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
        "status": "success",
    }
    return {
        **state,
        "severity_assessed": output["severity_assessed"],
        "teams_required": output["teams_required"],
        "recommendation": output["recommendation"],
        "steps": state["steps"] + [step],
        "overall_status": "Success",
    }


graph = StateGraph(IncidentAgentState)
graph.add_node("compute_assessment", compute_assessment)
graph.add_node("validate_and_decide", validate_and_decide)
graph.set_entry_point("compute_assessment")
graph.add_edge("compute_assessment", "validate_and_decide")
graph.add_edge("validate_and_decide", END)

incident_agent = graph.compile()


if __name__ == "__main__":
    test_state: IncidentAgentState = {
        "disaster_type": "Flood",
        "severity_reported": "High",
        "description": "Heavy flooding near the river, several houses affected, water rising fast",
        "latitude": 6.5854,
        "longitude": 79.9607,
        "llm_output": None,
        "severity_assessed": "", "teams_required": 0, "recommendation": "",
        "steps": [], "overall_status": "Success", "error": None,
    }
    final_state = incident_agent.invoke(test_state)
    print(json.dumps({
        "severity_assessed": final_state["severity_assessed"],
        "teams_required": final_state["teams_required"],
        "recommendation": final_state["recommendation"],
        "overall_status": final_state["overall_status"],
        "error": final_state["error"],
    }, indent=2))
    print(json.dumps(final_state["steps"], indent=2))