from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel

from resource_agent import ResourceAgentState, execute_dispatch

app = FastAPI(title="Resource Agent Service (internal only — not for direct client use)")


class DispatchLocation(BaseModel):
    lat: float
    lng: float


class DispatchRequest(BaseModel):
    missionId: str
    teamsRequired: int
    location: DispatchLocation
    district: Optional[str] = None


class DispatchResponse(BaseModel):
    dispatchPlan: dict
    estimatedArrival: int
    steps: list[dict]
    overall_status: str
    error: Optional[str] = None


@app.post("/dispatch", response_model=DispatchResponse)
def dispatch(req: DispatchRequest):
    initial_state: ResourceAgentState = {
        "mission_id": req.missionId,
        "teams_required": req.teamsRequired,
        "latitude": req.location.lat,
        "longitude": req.location.lng,
        "district": req.district or "Unknown",
        "warehouses": [],
        "inventory": [],
        "dispatch_plan": None,
        "estimated_arrival": None,
        "steps": [],
        "overall_status": "Success",
        "error": None,
    }
    result = execute_dispatch(initial_state)
    return DispatchResponse(
        dispatchPlan=result["dispatch_plan"],
        estimatedArrival=result["estimated_arrival"],
        steps=result["steps"],
        overall_status=result["overall_status"],
        error=result.get("error"),
    )


@app.get("/health")
def health():
    return {"status": "ok"}
