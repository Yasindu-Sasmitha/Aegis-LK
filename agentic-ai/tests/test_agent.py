import unittest
from resource_tools import (
    ToolError, compute_allocation,
    get_warehouse_candidates, validate_dispatch_plan,
)
from resource_agent import run_resource_workflow

WAREHOUSES = [
    {"id": "w-1", "name": "Colombo Central Depot", "district": "Colombo",
     "latitude": 6.9271, "longitude": 79.8612},
    {"id": "w-2", "name": "Kandy Relief Hub", "district": "Kandy",
     "latitude": 7.2906, "longitude": 80.6337},
]

INVENTORY = [
    {"warehouseId": "w-1", "itemName": "Water Bottles", "quantityAvailable": 220},
    {"warehouseId": "w-1", "itemName": "Rice Bags", "quantityAvailable": 80},
    {"warehouseId": "w-2", "itemName": "Blankets", "quantityAvailable": 100},
]


class ResourceAgentGoldenCaseTests(unittest.TestCase):
    """Covers planning, delegation, tool selection, structured output,
    deterministic validation, safe failure — the SE3090 §9.1 acceptance set."""

    def test_full_workflow_produces_plan_pending_approval(self):
        result = run_resource_workflow({
            "mission_id": "mission-golden-001",
            "teams_required": 3,
            "latitude": 6.9271,
            "longitude": 79.8612,
            "district": "Colombo",
            "warehouses": WAREHOUSES,
            "inventory": INVENTORY,
        })

        # All four agents left a visible trace
        agent_names = {s["agent"] for s in result["steps"]}
        self.assertEqual(
            agent_names,
            {"dispatch_coordinator", "warehouse_analyst",
             "dispatch_planner", "validation_safety"},
        )

        # Highest-stock warehouse chosen
        self.assertEqual(result["selected_warehouse"]["name"],
                         "Colombo Central Depot")

        # Structured output present
        self.assertTrue(result["dispatch_plan"]["items"])
        self.assertGreater(result["dispatch_plan"]["estimatedArrivalMinutes"], 0)

        # Validation passed, awaiting human approval
        self.assertEqual(result["validation_errors"], [])
        self.assertEqual(result["approval_status"], "PendingApproval")
        self.assertEqual(result["overall_status"], "Success")

    def test_no_stock_anywhere_is_a_safe_failure(self):
        result = run_resource_workflow({
            "mission_id": "mission-golden-002",
            "teams_required": 2,
            "latitude": 6.9271,
            "longitude": 79.8612,
            "district": "Colombo",
            "warehouses": WAREHOUSES,
            "inventory": [],
        })
        self.assertIsNone(result["dispatch_plan"])
        self.assertEqual(result["approval_status"], "SafeFailure")
        self.assertEqual(result["overall_status"], "Failed")
        self.assertIsNotNone(result["error"])

    def test_validator_rejects_overallocated_plan(self):
        warehouse = {
            "id": "w-1", "name": "Test WH", "district": "Colombo",
            "distance_km": 1.0,
            "inventory": [{"itemName": "Water Bottles", "quantity": 10}],
        }
        bad_plan = {
            "items": [{"itemName": "Water Bottles", "quantity": 999}],
            "vehicleCount": 1,
            "estimatedArrivalMinutes": 60,
        }
        errors = validate_dispatch_plan.invoke(
            {"plan": bad_plan, "warehouse": warehouse})
        self.assertTrue(any("exceeds available stock" in e for e in errors))

    def test_tool_rejects_invalid_teams_required(self):
        with self.assertRaises(ToolError):
            get_warehouse_candidates.invoke({
                "latitude": 6.9, "longitude": 79.8,
                "district": "Colombo",
                "teams_required": -5,   # invalid
                "warehouses": [], "inventory": [],
            })

    def test_allocation_matches_known_result(self):
        ranked = get_warehouse_candidates.invoke({
            "latitude": 6.9271, "longitude": 79.8612,
            "district": "Colombo", "teams_required": 3,
            "warehouses": WAREHOUSES, "inventory": INVENTORY,
        })
        best = ranked[0]
        plan = compute_allocation.invoke({
            "mission_id": "mission-golden-003",
            "teams_required": 3,
            "district": "Colombo",
            "warehouse": best,
        })
        self.assertEqual(plan["warehouseName"], "Colombo Central Depot")
        self.assertTrue(plan["items"])


if __name__ == "__main__":
    unittest.main()