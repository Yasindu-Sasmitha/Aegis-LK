import json
import math
from typing import Any, Dict, List, Optional, TypedDict


DEFAULT_WAREHOUSES: List[Dict[str, Any]] = [
    {"id": "w-1", "name": "Colombo Central Depot", "district": "Colombo", "latitude": 6.9271, "longitude": 79.8612},
    {"id": "w-2", "name": "Kandy Relief Hub", "district": "Kandy", "latitude": 7.2906, "longitude": 80.6337},
    {"id": "w-3", "name": "Galle Supply Base", "district": "Galle", "latitude": 6.0535, "longitude": 80.2210},
]

DEFAULT_INVENTORY: List[Dict[str, Any]] = [
    {"warehouseId": "w-1", "itemName": "Water Bottles", "quantityAvailable": 420},
    {"warehouseId": "w-1", "itemName": "Medical Kits", "quantityAvailable": 75},
    {"warehouseId": "w-1", "itemName": "Rice Bags", "quantityAvailable": 150},
    {"warehouseId": "w-2", "itemName": "Rice Bags", "quantityAvailable": 180},
    {"warehouseId": "w-2", "itemName": "Blankets", "quantityAvailable": 140},
    {"warehouseId": "w-3", "itemName": "Blankets", "quantityAvailable": 120},
    {"warehouseId": "w-3", "itemName": "Water Bottles", "quantityAvailable": 300},
]


class ResourceAgentState(TypedDict):
    mission_id: str
    teams_required: int
    latitude: float
    longitude: float
    district: str
    warehouses: List[Dict[str, Any]]
    inventory: List[Dict[str, Any]]
    dispatch_plan: Optional[Dict[str, Any]]
    estimated_arrival: Optional[int]
    steps: List[Dict[str, Any]]
    overall_status: str
    error: Optional[str]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    )
    return 2 * radius_km * math.asin(math.sqrt(a))


def _warehouse_items(warehouse_id: str, inventory: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    items = []
    for record in inventory:
        if record.get("warehouseId") == warehouse_id:
            items.append({
                "itemName": record.get("itemName", "Relief Kit"),
                "quantity": int(record.get("quantityAvailable", 0)),
            })
    return items


def _allocate_items(teams_required: int, warehouse_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not warehouse_items:
        return [{"itemName": "Relief Kit", "quantity": max(25, teams_required * 10)}]

    required_units = max(25, teams_required * 12)
    allocation: List[Dict[str, Any]] = []
    preferred_order = ["Water Bottles", "Medical Kits", "Rice Bags", "Blankets", "Relief Kit"]

    for item_name in preferred_order:
        item = next((record for record in warehouse_items if record["itemName"] == item_name), None)
        if not item:
            continue
        quantity = min(int(item["quantity"]), max(10, required_units // 2 if item_name == "Water Bottles" else required_units // 3))
        if quantity > 0:
            allocation.append({"itemName": item_name, "quantity": quantity})

    if not allocation:
        allocation = [{"itemName": warehouse_items[0]["itemName"], "quantity": min(warehouse_items[0]["quantity"], required_units)}]

    return allocation


def build_dispatch_plan(
    mission_id: str,
    teams_required: int,
    latitude: float,
    longitude: float,
    district: str,
    warehouses: Optional[List[Dict[str, Any]]] = None,
    inventory: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    warehouse_list = warehouses or DEFAULT_WAREHOUSES
    inventory_list = inventory or DEFAULT_INVENTORY

    candidates = []
    for warehouse in warehouse_list:
        warehouse_id = str(warehouse.get("id", "unknown"))
        warehouse_name = warehouse.get("name", "Emergency Depot")
        warehouse_lat = float(warehouse.get("latitude", latitude))
        warehouse_lon = float(warehouse.get("longitude", longitude))
        distance_km = _haversine_km(latitude, longitude, warehouse_lat, warehouse_lon)
        items = _warehouse_items(warehouse_id, inventory_list)
        total_stock = sum(int(item["quantity"]) for item in items)
        candidates.append({
            "id": warehouse_id,
            "name": warehouse_name,
            "district": warehouse.get("district", district),
            "distance_km": distance_km,
            "inventory": items,
            "total_stock": total_stock,
        })

    if not candidates:
        return {
            "dispatchPlan": {
                "missionId": mission_id,
                "warehouseId": "",
                "warehouseName": "No warehouse available",
                "district": district,
                "vehicleCount": max(1, math.ceil(teams_required / 2)),
                "items": [{"itemName": "Relief Kit", "quantity": max(25, teams_required * 10)}],
                "routeSummary": "No warehouse has stock available; manual dispatch review required.",
                "approvalStatus": "PendingManualReview",
            },
            "estimatedArrival": 0,
        }

    best_candidate = max(candidates, key=lambda candidate: (candidate["total_stock"], -candidate["distance_km"]))
    if best_candidate["total_stock"] <= 0:
        best_candidate = min(candidates, key=lambda candidate: candidate["distance_km"])

    items = _allocate_items(teams_required, best_candidate["inventory"])
    estimated_arrival = int(max(45, 60 + best_candidate["distance_km"] * 10 + teams_required * 6))

    dispatch_plan = {
        "missionId": mission_id,
        "warehouseId": best_candidate["id"],
        "warehouseName": best_candidate["name"],
        "district": best_candidate["district"],
        "vehicleCount": max(1, math.ceil(teams_required / 2)),
        "items": items,
        "routeSummary": (
            f"Dispatch from {best_candidate['name']} to {district} via the nearest emergency route; "
            f"estimated clearance time {estimated_arrival} minutes."
        ),
        "approvalStatus": "PendingApproval",
    }

    return {"dispatchPlan": dispatch_plan, "estimatedArrival": estimated_arrival}


def execute_dispatch(state: ResourceAgentState) -> ResourceAgentState:
    result = build_dispatch_plan(
        mission_id=state["mission_id"],
        teams_required=state["teams_required"],
        latitude=state["latitude"],
        longitude=state["longitude"],
        district=state.get("district", "Unknown"),
        warehouses=state.get("warehouses", DEFAULT_WAREHOUSES),
        inventory=state.get("inventory", DEFAULT_INVENTORY),
    )

    return {
        **state,
        "dispatch_plan": result["dispatchPlan"],
        "estimated_arrival": result["estimatedArrival"],
        "steps": state.get("steps", []) + [{
            "step": "select_warehouse_and_plan_dispatch",
            "tool": "code",
            "status": "success",
            "details": result["dispatchPlan"]["routeSummary"],
        }],
        "overall_status": "Success",
        "error": None,
    }


if __name__ == "__main__":
    sample_state: ResourceAgentState = {
        "mission_id": "mission-demo-001",
        "teams_required": 3,
        "latitude": 6.9271,
        "longitude": 79.8612,
        "district": "Colombo",
        "warehouses": DEFAULT_WAREHOUSES,
        "inventory": DEFAULT_INVENTORY,
        "dispatch_plan": None,
        "estimated_arrival": None,
        "steps": [],
        "overall_status": "Success",
        "error": None,
    }
    final_state = execute_dispatch(sample_state)
    print(json.dumps({
        "dispatchPlan": final_state["dispatch_plan"],
        "estimatedArrival": final_state["estimated_arrival"],
        "overall_status": final_state["overall_status"],
    }, indent=2))
