import unittest

from resource_agent import build_dispatch_plan


class ResourceAgentTests(unittest.TestCase):
    def test_build_dispatch_plan_selects_nearest_warehouse(self):
        warehouses = [
            {"id": "w-1", "name": "Colombo Central Depot", "district": "Colombo", "latitude": 6.9271, "longitude": 79.8612},
            {"id": "w-2", "name": "Kandy Relief Hub", "district": "Kandy", "latitude": 7.2906, "longitude": 80.6337},
        ]
        inventory = [
            {"warehouseId": "w-1", "itemName": "Water Bottles", "quantityAvailable": 220},
            {"warehouseId": "w-1", "itemName": "Rice Bags", "quantityAvailable": 80},
            {"warehouseId": "w-2", "itemName": "Blankets", "quantityAvailable": 100},
        ]

        result = build_dispatch_plan(
            mission_id="mission-123",
            teams_required=3,
            latitude=6.9271,
            longitude=79.8612,
            district="Colombo",
            warehouses=warehouses,
            inventory=inventory,
        )

        self.assertEqual(result["dispatchPlan"]["warehouseName"], "Colombo Central Depot")
        self.assertGreater(result["estimatedArrival"], 0)
        self.assertTrue(result["dispatchPlan"]["items"])


if __name__ == "__main__":
    unittest.main()
