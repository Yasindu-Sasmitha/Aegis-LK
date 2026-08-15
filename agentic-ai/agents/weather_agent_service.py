from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from weather_agent import weather_agent, WeatherAgentState

app = FastAPI(title="Weather Agent Service (internal only — not for direct client use)")

class AssessRequest(BaseModel):
    district_id: str
    district_name: str
    is_landslide_prone: bool
    forecast_rainfall_mm: list[float]
    forecast_wind_kmh: list[float]
    flood_threshold_mm: float
    landslide_threshold_mm: Optional[float] = None
    wind_threshold_kmh: float

class AssessResponse(BaseModel):
    hazards: list[dict]
    steps: list[dict]
    overall_status: str
    error: Optional[str] = None

@app.post("/assess", response_model=AssessResponse)
def assess(req: AssessRequest):
    initial_state: WeatherAgentState = {
        "district_id": req.district_id, "district_name": req.district_name,
        "is_landslide_prone": req.is_landslide_prone,
        "forecast_rainfall_mm": req.forecast_rainfall_mm,
        "forecast_wind_kmh": req.forecast_wind_kmh,
        "flood_threshold_mm": req.flood_threshold_mm,
        "landslide_threshold_mm": req.landslide_threshold_mm,
        "wind_threshold_kmh": req.wind_threshold_kmh,
        "llm_output": None, "hazards": [], "steps": [],
        "overall_status": "Success", "error": None,
    }
    result = weather_agent.invoke(initial_state)
    return AssessResponse(hazards=result["hazards"], steps=result["steps"],
                           overall_status=result["overall_status"], error=result.get("error"))

@app.get("/health")
def health():
    return {"status": "ok"}