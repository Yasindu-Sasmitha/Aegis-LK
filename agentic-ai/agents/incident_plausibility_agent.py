import os
import json
from pathlib import Path
from datetime import datetime, timezone
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

# Sri Lanka's major flood-relevant districts and their known upstream neighbour(s).
# This is a deliberate simplification, not real hydrology — good enough for a soft
# advisory signal, never a hard pass/fail gate. Coordinates are rough district centroids.
DISTRICT_COORDS = {
    "Colombo": (6.9271, 79.8612),
    "Gampaha": (7.0917, 79.9997),
    "Kalutara": (6.5854, 79.9607),
    "Kandy": (7.2906, 80.6337),
    "NuwaraEliya": (6.9497, 80.7891),
    "Ratnapura": (6.6828, 80.3992),
    "Galle": (6.0535, 80.2210),
    "Matara": (5.9549, 80.5550),
    "Kegalle": (7.2513, 80.3464),
}

UPSTREAM_DISTRICTS = {
    "Kalutara": ["Ratnapura"],
    "Colombo": ["Kegalle"],
    "Gampaha": ["Kegalle"],
    "Galle": ["Ratnapura"],
    "Matara": ["Ratnapura"],
    "Ratnapura": ["NuwaraEliya"],
    # Kandy and NuwaraEliya are upland source areas themselves — no further upstream.
}


def _nearest_district(lat: float, lng: float) -> str:
    """Rough nearest-centroid match — good enough to pick a sensible district name
    for the weather tool without needing a real geocoding service."""
    best_district, best_dist = None, float("inf")
    for name, (dlat, dlng) in DISTRICT_COORDS.items():
        dist = (lat - dlat) ** 2 + (lng - dlng) ** 2
        if dist < best_dist:
            best_district, best_dist = name, dist
    return best_district or "Colombo"


@tool
def get_weather(district: str) -> str:
    """Get total rainfall (mm) over the last 48 hours for a Sri Lankan district.
    Use this to check whether recent rainfall corroborates a citizen's disaster report.
    Valid district names: Colombo, Gampaha, Kalutara, Kandy, NuwaraEliya, Ratnapura,
    Galle, Matara, Kegalle."""
    coords = DISTRICT_COORDS.get(district)
    if coords is None:
        return json.dumps({"error": f"Unknown district '{district}'. Valid options: {list(DISTRICT_COORDS.keys())}"})

    lat, lng = coords
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lng,
                "hourly": "precipitation",
                "past_days": 2,
                "forecast_days": 1,
                "timezone": "Asia/Colombo",
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        hourly_precip = data.get("hourly", {}).get("precipitation", [])
        total_mm = round(sum(v for v in hourly_precip if v is not None), 1)
        return json.dumps({"district": district, "rainfall_last_48h_mm": total_mm})
    except Exception as e:
        return json.dumps({"error": f"Weather lookup failed for {district}: {str(e)}"})


@tool
def get_upstream_districts(district: str) -> str:
    """Get the list of known upstream districts for a given district, relevant for
    flood corroboration when local rainfall doesn't explain a reported flood — Sri
    Lankan floods are often river-driven from heavy rain in upland/upstream areas.
    Only call this if disaster type is Flood and local rainfall was low."""
    upstream = UPSTREAM_DISTRICTS.get(district, [])
    return json.dumps({"district": district, "upstream_districts": upstream})


@tool
def analyze_image(photo_url: str, disaster_type: str, description: str) -> str:
    """Analyze a citizen-submitted incident photo to judge whether it plausibly shows
    the claimed disaster type. Only call this if a photo URL was actually provided.
    This is a plausibility screen, not fraud or deepfake detection — it catches obvious
    mismatches (e.g. an unrelated photo), not sophisticated fakes."""
    try:
        vision_llm = ChatGoogleGenerativeAI(model=CHAT_MODEL, google_api_key=API_KEY, temperature=0)
        message = {
            "role": "user",
            "content": [
                {"type": "text", "text": (
                    f"A citizen reported a '{disaster_type}' disaster with this description: "
                    f"'{description}'. Does this image plausibly show a scene consistent with "
                    f"that claim? Answer with a short judgement (Plausible / Inconsistent / Unclear) "
                    f"and one sentence of reasoning."
                )},
                {"type": "image_url", "image_url": photo_url},
            ],
        }
        result = vision_llm.invoke([message])
        return json.dumps({"image_analysis": result.content})
    except Exception as e:
        return json.dumps({"error": f"Image analysis failed: {str(e)}"})


def build_plausibility_agent(has_photo: bool):
    """Builds the agent fresh per-request so the toolset only includes analyze_image
    when a photo actually exists — cleaner than hoping the LLM chooses not to use a
    tool that would fail anyway."""
    tools = [get_weather, get_upstream_districts]
    if has_photo:
        tools.append(analyze_image)

    llm = ChatGoogleGenerativeAI(model=CHAT_MODEL, google_api_key=API_KEY, temperature=0, timeout=60, max_retries=2)
    return create_react_agent(llm, tools)


def assess_plausibility(
    disaster_type: str,
    description: str,
    latitude: float,
    longitude: float,
    photo_url: Optional[str] = None,
) -> dict:
    district = _nearest_district(latitude, longitude)
    has_photo = bool(photo_url)
    agent = build_plausibility_agent(has_photo)

    photo_line = f"\nA photo was attached: {photo_url}" if has_photo else "\nNo photo was attached."

    prompt = f"""You are a plausibility-screening agent for citizen disaster reports in Sri Lanka.
Your job is to give a SOFT advisory signal for officer attention — never a hard accept/reject.

Report details:
Disaster type: {disaster_type}
Description: {description}
Nearest district: {district}{photo_line}

Steps to follow:
1. Call get_weather for the nearest district first.
2. If disaster type is Flood AND local rainfall is low (under ~10mm in 48h), call
   get_upstream_districts, then call get_weather again for any upstream district(s) returned —
   Sri Lankan floods are frequently river-driven from upstream rain with no local rainfall.
3. If disaster type is not Flood, do not check upstream districts — local rainfall alone is a
   reasonably direct signal for landslides and similar local disasters.
4. If a photo was attached, call analyze_image.
5. Finish with a plausibilityScore from 0-100 and a short reasoning trail describing what you
   checked and why you reached that score. Be conservative: low corroboration should lower the
   score somewhat, but never assume a report is fake — weather data alone is an unreliable signal
   (e.g. downstream floods can occur with zero local rain), so unclear evidence should land in a
   middle range, not automatically low.

Respond with your final answer in this exact format on the last line:
PLAUSIBILITY_SCORE: <0-100>
REASONING: <your reasoning trail, mentioning which checks you made and what you found>
"""

    result = agent.invoke({"messages": [{"role": "user", "content": prompt}]})
    raw_content = result["messages"][-1].content

    # Gemini can return content as a plain string OR a list of content blocks
    # (each a dict with a "type"/"text" shape) — normalize to one plain string
    # before parsing, regardless of which shape came back.
    if isinstance(raw_content, list):
        final_message = "\n".join(
            block.get("text", "") for block in raw_content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    else:
        final_message = str(raw_content)

    score = 50  # safe neutral default if parsing fails
    reasoning = final_message
    try:
        for line in final_message.splitlines():
            stripped = line.strip()
            if stripped.upper().startswith("PLAUSIBILITY_SCORE:"):
                score = int(stripped.split(":", 1)[1].strip())
            elif stripped.upper().startswith("REASONING:"):
                reasoning = stripped.split(":", 1)[1].strip()
    except Exception:
        pass  # fall back to defaults above rather than crash

    score = min(100, max(0, score))

    return {
        "plausibility_score": score,
        "plausibility_reasoning": reasoning,
        "district_checked": district,
        "overall_status": "Success",
        "error": None,
    }


if __name__ == "__main__":
    test_result = assess_plausibility(
        disaster_type="Flood",
        description="Heavy flooding near the river, several houses affected, water rising fast",
        latitude=6.5854,
        longitude=79.9607,
        photo_url=None,
    )
    print(json.dumps(test_result, indent=2))