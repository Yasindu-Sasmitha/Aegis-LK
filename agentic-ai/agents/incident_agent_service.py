from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from incident_agent import incident_agent, IncidentAgentState

app = FastAPI(title="Incident Agent Service (internal only — not for direct client use)")


class AssessRequest(BaseModel):
    disaster_type: str
    severity_reported: str
    description: str
    latitude: float
    longitude: float


class AssessResponse(BaseModel):
    severity_assessed: str
    teams_required: int
    recommendation: str
    steps: list[dict]
    overall_status: str
    error: Optional[str] = None


@app.post("/assess", response_model=AssessResponse)
def assess(req: AssessRequest):
    initial_state: IncidentAgentState = {
        "disaster_type": req.disaster_type,
        "severity_reported": req.severity_reported,
        "description": req.description,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "llm_output": None,
        "severity_assessed": "", "teams_required": 0, "recommendation": "",
        "steps": [], "overall_status": "Success", "error": None,
    }
    result = incident_agent.invoke(initial_state)
    return AssessResponse(
        severity_assessed=result["severity_assessed"],
        teams_required=result["teams_required"],
        recommendation=result["recommendation"],
        steps=result["steps"],
        overall_status=result["overall_status"],
        error=result.get("error"),
    )


@app.get("/health")
def health():
    return {"status": "ok"}