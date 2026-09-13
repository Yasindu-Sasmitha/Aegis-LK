import os
import json
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

load_dotenv(Path(__file__).resolve().parent / ".env")

API_KEY = os.getenv("GOOGLE_API_KEY", "")
CHAT_MODEL = os.getenv("CHAT_MODEL", "gemini-3.5-flash-lite")
assert API_KEY and "XXXX" not in API_KEY, (
    "GOOGLE_API_KEY missing: copy .env.example -> .env and paste your Google AI Studio key"
)

# The Incident module's own API — this tool calls back into ASP.NET Core rather than
# querying Postgres directly, keeping all data access in one place per the project's
# "Python agents call into the backend, not around it" rule.
INCIDENT_API_BASE = os.getenv("INCIDENT_API_BASE", "http://localhost:5012")


@tool
def search_nearby_incidents(lat: float, lng: float, radius_km: float, hours: float) -> str:
    """Search for other incident reports near a given location within a time window.
    Choose radius_km and hours based on disaster type: floods spread further and are
    worth a wider search (e.g. 20-50km, 24-48h); landslides are much more localized
    (e.g. 2-5km, 12-24h). Returns a JSON list of candidate incidents, excluding the
    new report itself and anything already linked as a duplicate."""
    try:
        response = requests.get(
            f"{INCIDENT_API_BASE}/api/incidents/nearby",
            params={"lat": lat, "lng": lng, "radiusKm": radius_km, "hours": hours},
            timeout=10,
        )
        response.raise_for_status()
        return json.dumps(response.json())
    except Exception as e:
        return json.dumps({"error": f"Nearby search failed: {str(e)}"})


@tool
def compare_reports(report_a_description: str, report_b_description: str, disaster_type: str) -> str:
    """Compare two incident report descriptions to judge whether they plausibly describe
    the SAME real-world event, even if worded very differently. Use this once per
    candidate incident returned by search_nearby_incidents, not for a large batch at once."""
    try:
        llm = ChatGoogleGenerativeAI(model=CHAT_MODEL, google_api_key=API_KEY, temperature=0)
        prompt = f"""Two citizens reported a possible {disaster_type} disaster. Do these
descriptions plausibly describe the SAME real-world event, or two different events?

Report A: {report_a_description}
Report B: {report_b_description}

Respond in this exact format:
MATCH: <yes/no>
CONFIDENCE: <0-100>
REASONING: <one sentence>"""
        result = llm.invoke(prompt)
        content = result.content
        if isinstance(content, list):
            content = "\n".join(b.get("text", "") for b in content if isinstance(b, dict))
        return json.dumps({"comparison": str(content)})
    except Exception as e:
        return json.dumps({"error": f"Comparison failed: {str(e)}"})


def build_dedup_agent():
    llm = ChatGoogleGenerativeAI(model=CHAT_MODEL, google_api_key=API_KEY, temperature=0, timeout=60, max_retries=2)
    return create_react_agent(llm, [search_nearby_incidents, compare_reports])


def check_for_duplicate(
    incident_id: str,
    disaster_type: str,
    description: str,
    latitude: float,
    longitude: float,
) -> dict:
    agent = build_dedup_agent()

    prompt = f"""You are a deduplication agent for citizen disaster reports in Sri Lanka.
A new report has just been submitted:

Incident ID: {incident_id}
Disaster type: {disaster_type}
Description: {description}
Location: {latitude}, {longitude}

Steps to follow:
1. Call search_nearby_incidents with a radius and time window appropriate to the
   disaster type (wider for Flood, tighter for Landslide/other).
2. If the search returns zero candidates, this is a new distinct incident — stop here.
3. If candidates exist, call compare_reports once per candidate (skip comparing against
   the incident's own ID if it appears in the results) to judge whether any of them
   describe the same real-world event as this new report.
4. Pick at most ONE best match — the candidate with the highest confidence that MATCH is yes.
   If no candidate has a confident match, treat this as a new distinct incident.

Respond with your final answer in this exact format on the last lines:
IS_DUPLICATE: <yes/no>
MATCHED_INCIDENT_ID: <the matched incident's id, or "none">
CONFIDENCE: <0-100>
REASONING: <your reasoning trail, mentioning which candidates you checked>
"""

    result = agent.invoke({"messages": [{"role": "user", "content": prompt}]})
    raw_content = result["messages"][-1].content

    if isinstance(raw_content, list):
        final_message = "\n".join(
            block.get("text", "") for block in raw_content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    else:
        final_message = str(raw_content)

    is_duplicate = False
    matched_id: Optional[str] = None
    confidence = 0
    reasoning = final_message

    try:
        for line in final_message.splitlines():
            stripped = line.strip()
            upper = stripped.upper()
            if upper.startswith("IS_DUPLICATE:"):
                is_duplicate = stripped.split(":", 1)[1].strip().lower().startswith("y")
            elif upper.startswith("MATCHED_INCIDENT_ID:"):
                val = stripped.split(":", 1)[1].strip()
                matched_id = None if val.lower() == "none" else val
            elif upper.startswith("CONFIDENCE:"):
                confidence = int(stripped.split(":", 1)[1].strip())
            elif upper.startswith("REASONING:"):
                reasoning = stripped.split(":", 1)[1].strip()
    except Exception:
        pass  # fall back to safe defaults (not a duplicate) rather than crash

    # Safety net: never report a match without an actual id, and never match to itself.
    if not matched_id or matched_id == incident_id:
        is_duplicate = False
        matched_id = None

    return {
        "is_duplicate": is_duplicate,
        "matched_incident_id": matched_id,
        "confidence": min(100, max(0, confidence)),
        "reasoning": reasoning,
        "overall_status": "Success",
        "error": None,
    }


if __name__ == "__main__":
    test_result = check_for_duplicate(
        incident_id="00000000-0000-0000-0000-000000000099",
        disaster_type="Flood",
        description="Heavy rain caused flooding near my house by the river, water is rising fast",
        latitude=6.5854,
        longitude=79.9607,
    )
    print(json.dumps(test_result, indent=2))