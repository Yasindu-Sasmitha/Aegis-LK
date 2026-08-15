from typing import TypedDict, Optional
from pydantic import BaseModel, Field
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, END
import json
from datetime import datetime, timezone

# ---------- Structured output — the LLM must return exactly this shape ----------

class HazardAssessment(BaseModel):
    hazard_type: str = Field(description="One of: Flood, Landslide, StrongWind")
    risk_probability_pct: float = Field(ge=0, le=100)
    confidence_pct: float = Field(ge=0, le=100)
    reasoning_summary: str = Field(max_length=250)
    recommended_action: str = Field(description="One of: publish_alert, flag_for_review, no_action")

class WeatherAgentOutput(BaseModel):
    hazards: list[HazardAssessment]


# ---------- LangGraph state — this is what flows through the graph ----------

class WeatherAgentState(TypedDict):
    district_id: str
    district_name: str
    is_landslide_prone: bool
    forecast_rainfall_mm: list[float]
    forecast_wind_kmh: list[float]
    flood_threshold_mm: float
    landslide_threshold_mm: Optional[float]
    wind_threshold_kmh: float
    llm_output: Optional[dict]
    hazards: list[dict]
    steps: list[dict]
    overall_status: str
    error: Optional[str]


llm = ChatOllama(model="minimax-m3:cloud", temperature=0)
structured_llm = llm.with_structured_output(WeatherAgentOutput)


# ---------- Node 1: the LLM reasons, read-only, no DB access ----------

def compute_risk(state: WeatherAgentState) -> WeatherAgentState:
    started = datetime.now(timezone.utc)
    hazards_to_assess = ["Flood", "StrongWind"]
    if state["is_landslide_prone"]:
        hazards_to_assess.append("Landslide")

    prompt = f"""You are a disaster risk assessment agent for {state['district_name']}, Sri Lanka.

Forecast data (next 3 days):
- Rainfall (mm/day): {state['forecast_rainfall_mm']}
- Wind speed (km/h, max/day): {state['forecast_wind_kmh']}

Historical thresholds for this district:
- Flood threshold: {state['flood_threshold_mm']} mm cumulative rainfall
- Landslide threshold: {state.get('landslide_threshold_mm')} mm cumulative rainfall
- Strong wind threshold: {state['wind_threshold_kmh']} km/h

Assess ONLY these hazards: {hazards_to_assess}.

Respond with ONLY a valid JSON object, nothing else — no markdown, no headers, no commentary,
no explanation outside the JSON. Exact shape:
{{"hazards": [{{"hazard_type": "Flood", "risk_probability_pct": 0, "confidence_pct": 0, "reasoning_summary": "...", "recommended_action": "publish_alert"}}]}}

reasoning_summary must be under 250 characters, conclusion only. recommended_action must be
exactly one of: publish_alert, flag_for_review, no_action.
"""

    try:
        response = llm.invoke(prompt)
        parsed = WeatherAgentOutput.model_validate_json(response.content)
        step = {
            "step": "compute_risk", "tool": "ollama:minimax-m3:cloud",
            "duration_ms": int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
            "status": "success",
        }
        return {**state, "llm_output": parsed.model_dump(), "steps": state["steps"] + [step]}
    except Exception as e:
        step = {
            "step": "compute_risk", "tool": "ollama:minimax-m3:cloud",
            "duration_ms": int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
            "status": "failed", "error": str(e),
        }
        return {**state, "error": str(e), "steps": state["steps"] + [step], "overall_status": "Failed"}

# ---------- Node 2: code decides, not the model — the actual safety gate ----------

def validate_and_decide(state: WeatherAgentState) -> WeatherAgentState:
    if state.get("error"):
        return state

    started = datetime.now(timezone.utc)
    validated_hazards = []

    threshold_map = {
    "Flood": (sum(state["forecast_rainfall_mm"]), state["flood_threshold_mm"]),
    "Landslide": (sum(state["forecast_rainfall_mm"]), state.get("landslide_threshold_mm")),
    "StrongWind": (max(state["forecast_wind_kmh"]), state["wind_threshold_kmh"]),
    }

    for hazard in state["llm_output"]["hazards"]:
        h = dict(hazard)
        h["risk_probability_pct"] = min(100, max(0, h["risk_probability_pct"]))
        h["confidence_pct"] = min(100, max(0, h["confidence_pct"]))

        forecast_value, threshold = threshold_map.get(h["hazard_type"], (None, None))

        # The real gate — confidence threshold enforced by code, not the model's own claim
        if h["confidence_pct"] < 70:
            h["recommended_action"] = "flag_for_review"
        # Anomaly safety net — model under-called an obvious risk
        elif (threshold is not None and forecast_value is not None
              and forecast_value >= threshold * 1.3 and h["recommended_action"] == "no_action"):
            h["recommended_action"] = "flag_for_review"
            h["reasoning_summary"] += " [auto-flagged: forecast exceeds 1.3x threshold]"

        validated_hazards.append(h)

    step = {
        "step": "validate_and_decide", "tool": "code",
        "duration_ms": int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
        "status": "success",
    }
    return {**state, "hazards": validated_hazards, "steps": state["steps"] + [step], "overall_status": "Success"}


# ---------- Graph wiring ----------

graph = StateGraph(WeatherAgentState)
graph.add_node("compute_risk", compute_risk)
graph.add_node("validate_and_decide", validate_and_decide)
graph.set_entry_point("compute_risk")
graph.add_edge("compute_risk", "validate_and_decide")
graph.add_edge("validate_and_decide", END)

weather_agent = graph.compile()


# ---------- Standalone test — hardcoded numbers, no API/DB needed yet ----------

if __name__ == "__main__":
    test_state: WeatherAgentState = {
        "district_id": "test-kandy",
        "district_name": "Kandy",
        "is_landslide_prone": False,
        "forecast_rainfall_mm": [30.0, 35.0, 40.0],
        "forecast_wind_kmh": [25.0, 30.0, 28.0],
        "flood_threshold_mm": 80.0,
        "landslide_threshold_mm": 100.0,
        "wind_threshold_kmh": 60.0,
        "llm_output": None,
        "hazards": [],
        "steps": [],
        "overall_status": "Success",
        "error": None,
    }

    final_state = weather_agent.invoke(test_state)
    print(json.dumps(final_state["hazards"], indent=2))
    print("\n--- Execution steps (this is what feeds AgentExecutionLog) ---")
    print(json.dumps(final_state["steps"], indent=2))