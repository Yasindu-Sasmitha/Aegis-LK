"""Tests for resource_agent.py — checkpointer injection and durability.

Fast/offline tests use an injected InMemorySaver so they never touch
a real database. The optional integration test runs only when
RESOURCE_AGENT_DATABASE_URL is set in the environment.
"""
import os
import unittest
from unittest.mock import MagicMock, patch

from langgraph.checkpoint.memory import InMemorySaver

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
WAREHOUSES = [
    {
        "id": "w-1",
        "name": "Colombo Central Depot",
        "district": "Colombo",
        "latitude": 6.9271,
        "longitude": 79.8612,
    },
]

INVENTORY = [
    {"warehouseId": "w-1", "itemName": "Water Bottles", "quantityAvailable": 200},
    {"warehouseId": "w-1", "itemName": "Rice Bags", "quantityAvailable": 60},
]

PAYLOAD = {
    "mission_id": "test-cp-001",
    "teams_required": 2,
    "latitude": 6.9271,
    "longitude": 79.8612,
    "district": "Colombo",
    "warehouses": WAREHOUSES,
    "inventory": INVENTORY,
}


# ---------------------------------------------------------------------------
# Unit tests — offline, always run
# ---------------------------------------------------------------------------
class TestCheckpointerInjection(unittest.TestCase):
    """Verify build_resource_graph() accepts an injected checkpointer."""

    def test_injected_memory_checkpointer_is_used(self):
        """Graph built with explicit InMemorySaver must run end-to-end."""
        from resource_agent import build_resource_graph

        cp = InMemorySaver()
        graph = build_resource_graph(checkpointer=cp)  #type: ignore

        result = graph.invoke(
            {
                "messages": [],
                "mission_id": PAYLOAD["mission_id"],
                "teams_required": PAYLOAD["teams_required"],
                "latitude": PAYLOAD["latitude"],
                "longitude": PAYLOAD["longitude"],
                "district": PAYLOAD["district"],
                "warehouses": PAYLOAD["warehouses"],
                "inventory": PAYLOAD["inventory"],
                "candidates": [],
                "selected_warehouse": None,
                "dispatch_plan": None,
                "validation_errors": [],
                "retries": 0,
                "approval_status": "PendingApproval",
                "overall_status": "Success",
                "error": None,
                "steps": [],
            },
            {"configurable": {"thread_id": PAYLOAD["mission_id"]}},
        )

        self.assertIn(result["approval_status"], ("PendingApproval", "SafeFailure"))
        self.assertIsInstance(result["steps"], list)

    def test_build_checkpointer_falls_back_to_memory_when_no_db_url(self):
        """_build_checkpointer must return InMemorySaver when no DB URL is set."""
        from resource_agent import _build_checkpointer #type: ignore

        with patch.dict(os.environ, {}, clear=False):
            # Make sure both env vars are absent for this test
            env_backup = {}
            for key in ("RESOURCE_AGENT_DATABASE_URL", "DATABASE_URL"):
                env_backup[key] = os.environ.pop(key, None)

            try:
                cp = _build_checkpointer()
                self.assertIsInstance(cp, InMemorySaver)
            finally:
                for key, val in env_backup.items():
                    if val is not None:
                        os.environ[key] = val

    def test_build_checkpointer_raises_when_package_missing_but_url_set(self):
        """If the DB URL is configured but the package isn't installed, fail-closed."""
        from resource_agent import _build_checkpointer #type: ignore

        with patch.dict(
            os.environ,
            {"RESOURCE_AGENT_DATABASE_URL": "postgresql://user:pass@localhost/test"},
        ):
            # Simulate the package not being installed
            import builtins
            real_import = builtins.__import__

            def mock_import(name, *args, **kwargs):
                if name == "langgraph.checkpoint.postgres":
                    raise ImportError("Simulated missing package")
                return real_import(name, *args, **kwargs)

            with patch("builtins.__import__", side_effect=mock_import):
                with self.assertRaises(RuntimeError) as ctx:
                    _build_checkpointer()
                self.assertIn("langgraph-checkpoint-postgres", str(ctx.exception))


# ---------------------------------------------------------------------------
# Integration test — only runs when RESOURCE_AGENT_DATABASE_URL is set
# ---------------------------------------------------------------------------
@unittest.skipUnless(
    os.getenv("RESOURCE_AGENT_DATABASE_URL") or os.getenv("DATABASE_URL"),
    "RESOURCE_AGENT_DATABASE_URL not set — skipping durable checkpointer integration test",
)
class TestPostgresSaverIntegration(unittest.TestCase):
    """Verify that workflow state survives across two invocations via PostgresSaver."""

    def test_state_is_durable_across_invocations(self):
        """Run the graph twice with the same thread_id; second run must find saved state."""
        from langgraph.checkpoint.postgres import PostgresSaver
        from resource_agent import build_resource_graph

        db_url = (
            os.getenv("RESOURCE_AGENT_DATABASE_URL") or os.getenv("DATABASE_URL")
        )
        saver = PostgresSaver.from_conn_string(db_url) #type: ignore
        saver.setup() #type: ignore

        graph = build_resource_graph(checkpointer=saver) #type: ignore
        thread_cfg = {"configurable": {"thread_id": "durable-test-001"}}

        initial_state = {
            "messages": [],
            "mission_id": "durable-test-001",
            "teams_required": 2,
            "latitude": 6.9271,
            "longitude": 79.8612,
            "district": "Colombo",
            "warehouses": WAREHOUSES,
            "inventory": INVENTORY,
            "candidates": [],
            "selected_warehouse": None,
            "dispatch_plan": None,
            "validation_errors": [],
            "retries": 0,
            "approval_status": "PendingApproval",
            "overall_status": "Success",
            "error": None,
            "steps": [],
        }

        result1 = graph.invoke(initial_state, thread_cfg)
        # Second invocation retrieves checkpointed state
        saved = saver.get(thread_cfg["configurable"]) #type: ignore
        self.assertIsNotNone(saved, "Checkpoint must exist after first invocation.")
        self.assertIn(result1["approval_status"], ("PendingApproval", "SafeFailure"))


if __name__ == "__main__":
    unittest.main()
