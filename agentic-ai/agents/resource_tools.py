"""Allow-listed tools for the Resource Allocation Agent.

Design rules (from SE3090 spec §9.1):
  - Every tool validates its input before acting.
  - Every tool returns structured data, never free text.
  - Errors are raised as ToolError so the graph can convert them into
    observations the calling agent can act on (never a raw traceback).
"""
from typing import Any, Dict, List
import math

from langchain_core.tools import tool


class ToolError(Exception):
    """Raised when a tool receives invalid input or cannot proceed."""


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))


def _validate_mission(mission_id: str, teams_required: int,
                      latitude: float, longitude: float) -> None:
    if not mission_id or not str(mission_id).strip():
        raise ToolError("missionId is required.")
    if not (1 <= int(teams_required) <= 20):
        raise ToolError(f"teamsRequired must be 1..20, got {teams_required}.")
    if not (-90 <= float(latitude) <= 90):
        raise ToolError(f"latitude out of range: {latitude}")
    if not (-180 <= float(longitude) <= 180):
        raise ToolError(f"longitude out of range: {longitude}")


@tool
def get_warehouse_candidates(
    latitude: float,
    longitude: float,
    district: str,
    teams_required: int,
    warehouses: List[Dict[str, Any]],
    inventory: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Rank all warehouses by (total stock, then proximity) for a mission."""
    _validate_mission(
        mission_id="__rank__",
        teams_required=int(teams_required),
        latitude=float(latitude),
        longitude=float(longitude),
    )
    if not warehouses:
        raise ToolError("No warehouses available to rank.")

    stock_by_wh: Dict[str, int] = {}
    items_by_wh: Dict[str, List[Dict[str, Any]]] = {}
    for row in inventory:
        wid = str(row.get("warehouseId") or row.get("WarehouseId") or "")
        if not wid:
            continue
        qty = int(row.get("quantityAvailable") or row.get("QuantityAvailable") or 0)
        name = str(row.get("itemName") or row.get("ItemName") or "Relief Kit")
        stock_by_wh[wid] = stock_by_wh.get(wid, 0) + qty
        items_by_wh.setdefault(wid, []).append({"itemName": name, "quantity": qty})

    ranked: List[Dict[str, Any]] = []
    for wh in warehouses:
        wid = str(wh.get("id") or wh.get("Id") or "")
        wlat = float(wh.get("latitude") or wh.get("Latitude") or 0)
        wlon = float(wh.get("longitude") or wh.get("Longitude") or 0)
        ranked.append({
            "id": wid,
            "name": str(wh.get("name") or wh.get("Name") or "Warehouse"),
            "district": str(wh.get("district") or wh.get("District") or ""),
            "latitude": wlat,
            "longitude": wlon,
            "distance_km": round(_haversine_km(
                float(latitude), float(longitude), wlat, wlon), 2),
            "total_stock": stock_by_wh.get(wid, 0),
            "inventory": items_by_wh.get(wid, []),
        })
    ranked.sort(key=lambda w: (-w["total_stock"], w["distance_km"]))
    return ranked


@tool
def compute_allocation(
    mission_id: str,
    teams_required: int,
    district: str,
    warehouse: Dict[str, Any],
) -> Dict[str, Any]:
    """Compute item allocation for one warehouse."""
    _validate_mission(mission_id, int(teams_required), 0, 0)
    stock_items = warehouse.get("inventory") or []
    if not stock_items:
        raise ToolError("Selected warehouse has no stock.")

    required_units = max(25, int(teams_required) * 12)
    preferred = ["Water Bottles", "Medical Kits", "Rice Bags", "Blankets", "Relief Kit"]
    allocation: List[Dict[str, Any]] = []
    for item_name in preferred:
        match = next((i for i in stock_items if i.get("itemName") == item_name), None)
        if not match:
            continue
        cap = max(10, required_units // (2 if item_name == "Water Bottles" else 3))
        qty = min(int(match.get("quantity", 0)), cap)
        if qty > 0:
            allocation.append({"itemName": item_name, "quantity": qty})
    if not allocation:
        first = stock_items[0]
        allocation = [{"itemName": first["itemName"],
                       "quantity": min(int(first["quantity"]), required_units)}]

    return {
        "missionId": mission_id,
        "warehouseId": warehouse["id"],
        "warehouseName": warehouse["name"],
        "district": district or warehouse.get("district") or "Unknown",
        "vehicleCount": max(1, -(-int(teams_required) // 2)),
        "items": allocation,
        "routeSummary": (f"Dispatch from {warehouse['name']} to "
                         f"{district or 'destination'} "
                         f"({warehouse['distance_km']} km)."),
        "estimatedArrivalMinutes": int(max(
            45, 60 + warehouse["distance_km"] * 10 + int(teams_required) * 6)),
        "approvalStatus": "PendingApproval",
    }


@tool
def validate_dispatch_plan(
    plan: Dict[str, Any],
    warehouse: Dict[str, Any],
) -> List[str]:
    """Deterministic business-rule validation. Returns list of error strings."""
    errors: List[str] = []
    if not plan.get("items"):
        errors.append("Dispatch plan has no items.")

    stock = {i["itemName"]: int(i["quantity"])
             for i in (warehouse.get("inventory") or [])}
    for item in plan.get("items", []):
        name = item.get("itemName")
        qty = int(item.get("quantity", 0))
        if qty <= 0:
            errors.append(f"Item '{name}' has non-positive quantity {qty}.")
        if name in stock and qty > stock[name]:
            errors.append(
                f"Item '{name}' quantity {qty} exceeds available stock {stock[name]}.")

    if int(plan.get("estimatedArrivalMinutes", 0)) <= 0:
        errors.append("Estimated arrival must be positive.")
    if int(plan.get("vehicleCount", 0)) <= 0:
        errors.append("Vehicle count must be positive.")
    return errors