"""FastAPI wrapper around the Resource Allocation Agent.

Loopback-only: this service is called by the .NET backend, never by
React/Flutter directly (SE3090 §2 mandatory backend rule).
"""
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel

from resource_agent import run_resource_workflow

app = FastAPI(
    title="Resource Agent Service (internal only — not for client use)"
)


class DispatchLocation(BaseModel):
    lat: float
    lng: float


class DispatchRequest(BaseModel):
    missionId: str
    teamsRequired: int
    location: DispatchLocation
    district: Optional[str] = None
    warehouses: list[dict] = []   # supplied by .NET from Postgres
    inventory: list[dict] = []    # supplied by .NET from Postgres


class DispatchResponse(BaseModel):
    dispatchPlan: dict
    estimatedArrival: int
    steps: list[dict]
    overall_status: str
    approval_status: str
    error: Optional[str] = None


@app.post("/dispatch", response_model=DispatchResponse)
def dispatch(req: DispatchRequest):
    payload = {
        "mission_id": req.missionId,
        "teams_required": req.teamsRequired,
        "latitude": req.location.lat,
        "longitude": req.location.lng,
        "district": req.district,
        "warehouses": req.warehouses,
        "inventory": req.inventory,
    }
    result = run_resource_workflow(payload)
    plan = result.get("dispatch_plan") or {}
    return DispatchResponse(
        dispatchPlan=plan,
        estimatedArrival=int(plan.get("estimatedArrivalMinutes", 0)),
        steps=result.get("steps", []),
        overall_status=result.get("overall_status", "Failed"),
        approval_status=result.get("approval_status", "SafeFailure"),
        error=result.get("error"),
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "resource-agent", "port": 8003}