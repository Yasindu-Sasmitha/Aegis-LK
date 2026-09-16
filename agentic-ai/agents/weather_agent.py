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


class HazardAssessment(BaseModel):
    hazard_type: str = Field(description="One of: Flood, Landslide, StrongWind")
    risk_probability_pct: float = Field(ge=0, le=100)
    confidence_pct: float = Field(ge=0, le=100)
    reasoning_summary: str = Field(max_length=250)
    recommended_action: str = Field(description="One of: publish_alert, flag_for_review, no_action")

class WeatherAgentOutput(BaseModel):
    hazards: list[HazardAssessment]

class HazardConcern(BaseModel):
    hazard_type: str
    issue: str = Field(max_length=200)

class CritiqueOutput(BaseModel):
    agrees: bool = Field(description="True if the assessment is internally consistent and sound, with no material errors")
    concerns: list[HazardConcern] = Field(default_factory=list, description="Specific inconsistencies found, empty if none")


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
    critique: Optional[dict]
    hazards: list[dict]
    steps: list[dict]
    overall_status: str
    error: Optional[str]


llm = ChatGoogleGenerativeAI(model=CHAT_MODEL, google_api_key=API_KEY, temperature=0, timeout=60, max_retries=3)
assessor_llm = llm.with_structured_output(WeatherAgentOutput)
critic_llm = llm.with_structured_output(CritiqueOutput)


def _log_step(step: str, tool: str, started: datetime, status: str, summary: str, error: str | None = None) -> dict:
    entry = {
        "step": step, "tool": tool,
        "duration_ms": int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
        "status": status, "summary": summary,
    }
    if error:
        entry["error"] = error
    return entry


def assess_hazards(state: WeatherAgentState) -> WeatherAgentState:
    """Agent 1 — the Assessor. Reasons over forecast vs. thresholds, proposes a risk call per hazard."""
    hazards_to_assess = ["Flood", "StrongWind"]
    if state["is_landslide_prone"]:
        hazards_to_assess.append("Landslide")

    prompt = f"""You are the Weather Risk Assessor for {state['district_name']}, Sri Lanka.

Forecast data (next 3 days):
- Rainfall (mm/day): {state['forecast_rainfall_mm']}
- Wind speed (km/h, max/day): {state['forecast_wind_kmh']}

Historical thresholds for this district:
- Flood threshold: {state['flood_threshold_mm']} mm cumulative rainfall
- Landslide threshold: {state.get('landslide_threshold_mm')} mm cumulative rainfall
- Strong wind threshold: {state['wind_threshold_kmh']} km/h

Assess ONLY these hazards: {hazards_to_assess}.
Base probability mainly on how far the forecast exceeds the threshold. Reflect genuine
uncertainty honestly in confidence_pct. Make sure recommended_action is logically consistent
with risk_probability_pct and confidence_pct.
"""
    steps = list(state["steps"])
    last_error = None

    for attempt in range(1, 3):
        started = datetime.now(timezone.utc)
        try:
            result: WeatherAgentOutput = assessor_llm.invoke(prompt)
            summary = f"Assessed {len(result.hazards)} hazard(s): " + ", ".join(
                f"{h.hazard_type} {h.risk_probability_pct:.0f}%" for h in result.hazards
            )
            steps.append(_log_step("assess_hazards", f"gemini:{CHAT_MODEL}", started, "success", summary))
            return {**state, "llm_output": result.model_dump(), "steps": steps}
        except Exception as e:
            last_error = str(e)
            steps.append(_log_step("assess_hazards", f"gemini:{CHAT_MODEL}", started, "failed",
                                    "Assessor failed to produce valid output", last_error))

    return {**state, "error": f"Assessor failed after 2 attempts: {last_error}", "steps": steps, "overall_status": "Failed"}


def critique_assessment(state: WeatherAgentState) -> WeatherAgentState:
    """Agent 2 — the Critic. An independent second opinion checking the Assessor's output for
    internal consistency before the code gate finalizes anything — the 'validation/safety' role
    as an actual model step, not just a hardcoded rule."""
    if state.get("error"):
        return state

    started = datetime.now(timezone.utc)
    steps = list(state["steps"])

    prompt = f"""You are reviewing another AI agent's disaster risk assessment for {state['district_name']}.
You did not produce this assessment — your job is quality control, not re-assessment.

Original data given to the assessor:
- Rainfall (mm/day): {state['forecast_rainfall_mm']}
- Wind speed (km/h): {state['forecast_wind_kmh']}
- Thresholds: flood={state['flood_threshold_mm']}mm, landslide={state.get('landslide_threshold_mm')}mm, wind={state['wind_threshold_kmh']}km/h

The assessor's output:
{json.dumps(state['llm_output'], indent=2)}

First, recompute the cumulative rainfall yourself from the raw daily values above and state
the number explicitly. Then check specifically for:
1. Is recommended_action logically consistent with risk_probability_pct and confidence_pct?
   (e.g. high risk + high confidence should not be "no_action")
2. Does reasoning_summary actually support the numbers given?
3. Any values that are clearly implausible given the raw data?

Only flag genuine inconsistencies or errors — not stylistic disagreement or minor rounding.
If the assessment is sound, agrees=true with an empty concerns list.
"""
    try:
        result: CritiqueOutput = critic_llm.invoke(prompt)
        summary = "Agrees with assessment" if result.agrees else \
            f"Disagreement flagged: {'; '.join(c.issue for c in result.concerns)}"
        steps.append(_log_step("critique_assessment", f"gemini:{CHAT_MODEL}", started, "success", summary))
        return {**state, "critique": result.model_dump(), "steps": steps}
    except Exception as e:
        # Critic failing isn't fatal — fall through to code validation without a second opinion,
        # but log it honestly rather than silently pretending the critique happened.
        steps.append(_log_step("critique_assessment", f"gemini:{CHAT_MODEL}", started, "failed",
                                "Critic unavailable, proceeding on Assessor output alone", str(e)))
        return {**state, "critique": None, "steps": steps}


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

    critique = state.get("critique")
    disagreed_hazards = {c["hazard_type"] for c in critique["concerns"]} if critique and not critique["agrees"] else set()

    overridden = []
    for hazard in state["llm_output"]["hazards"]:
        h = dict(hazard)
        h["risk_probability_pct"] = min(100, max(0, h["risk_probability_pct"]))
        h["confidence_pct"] = min(100, max(0, h["confidence_pct"]))

        forecast_value, threshold = threshold_map.get(h["hazard_type"], (None, None))

        if h["confidence_pct"] < 70:
            h["recommended_action"] = "flag_for_review"
        elif (threshold is not None and forecast_value is not None
              and forecast_value >= threshold * 1.3 and h["recommended_action"] == "no_action"):
            h["recommended_action"] = "flag_for_review"
            h["reasoning_summary"] += " [auto-flagged: forecast exceeds 1.3x threshold]"
        elif h["hazard_type"] in disagreed_hazards and h["recommended_action"] != "flag_for_review":
            h["recommended_action"] = "flag_for_review"
            h["reasoning_summary"] += " [auto-flagged: critic agent flagged an inconsistency]"
            overridden.append(h["hazard_type"])

        validated_hazards.append(h)

    summary = "Applied confidence/anomaly/critique gates"
    if overridden:
        summary += f" — overrode {', '.join(overridden)} due to critic disagreement"

    step = _log_step("validate_and_decide", "code", started, "success", summary)
    return {**state, "hazards": validated_hazards, "steps": state["steps"] + [step], "overall_status": "Success"}


graph = StateGraph(WeatherAgentState)
graph.add_node("assess_hazards", assess_hazards)
graph.add_node("critique_assessment", critique_assessment)
graph.add_node("validate_and_decide", validate_and_decide)
graph.set_entry_point("assess_hazards")
graph.add_edge("assess_hazards", "critique_assessment")
graph.add_edge("critique_assessment", "validate_and_decide")
graph.add_edge("validate_and_decide", END)

weather_agent = graph.compile()


if __name__ == "__main__":
    test_state: WeatherAgentState = {
        "district_id": "test-kandy", "district_name": "Kandy", "is_landslide_prone": True,
        "forecast_rainfall_mm": [45.0, 60.0, 70.0], "forecast_wind_kmh": [25.0, 30.0, 28.0],
        "flood_threshold_mm": 80.0, "landslide_threshold_mm": 100.0, "wind_threshold_kmh": 60.0,
        "llm_output": None, "critique": None, "hazards": [], "steps": [], "overall_status": "Success", "error": None,
    }
    final_state = weather_agent.invoke(test_state)
    print(json.dumps(final_state["hazards"], indent=2))
    print("\n--- Trace ---")
    print(json.dumps(final_state["steps"], indent=2))