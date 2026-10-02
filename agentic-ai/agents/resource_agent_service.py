"""FastAPI wrapper around the Resource Allocation Agent.

Loopback-only: this service is called by the .NET backend, never by
React/Flutter directly (SE3090 §2 mandatory backend rule).
"""
import os
from typing import Optional

from fastapi import FastAPI, Request, HTTPException, Header
from pydantic import BaseModel

from resource_agent import run_resource_workflow

app = FastAPI(
    title="Resource Agent Service (internal only — not for client use)"
)

# ── Service-to-service secret validation ─────────────────────────────────────
_AGENT_KEY = os.getenv("AEGIS_AGENT_KEY", "")


def _require_agent_key(key: Optional[str] = None) -> None:
    """Reject requests that do not carry the correct X-Aegis-Agent-Key header.
    No-op when AEGIS_AGENT_KEY is not configured (local development)."""
    if not _AGENT_KEY:
        return
    if key != _AGENT_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid agent key")


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
def dispatch(req: DispatchRequest, x_aegis_agent_key: Optional[str] = Header(None, alias="X-Aegis-Agent-Key")):
    _require_agent_key(x_aegis_agent_key)
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
    return {"status": "ok", "service": "resource-agent"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8003"))
    uvicorn.run(app, host="0.0.0.0", port=port)