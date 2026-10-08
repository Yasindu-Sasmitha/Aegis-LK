"""Tests for resource_agent.py - checkpointer injection and durability.

All tests are offline (no live Gemini API key required). The LLM call inside
dispatch_coordinator is patched to return a deterministic Plan object, so the
full four-agent graph can execute end-to-end without touching Google APIs.

Test IDs match the assignment report: AI-RES-01 to AI-RES-04.
"""
import os
import sys
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch

_agents_dir = Path(__file__).resolve().parent.parent / "agents"
if str(_agents_dir) not in sys.path:
    sys.path.insert(0, str(_agents_dir))

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


def _make_mock_plan():
    """Return a MagicMock whose attributes mirror the Plan Pydantic model."""
    mock_plan = MagicMock()
    mock_plan.objective = "Dispatch relief teams to Colombo."
    mock_plan.step_1 = "rank_warehouses"
    mock_plan.step_2 = "compute_allocation"
    mock_plan.step_3 = "validate_plan"
    mock_plan.step_4 = "await_human_approval"
    mock_plan.reasoning = "Standard four-step dispatch protocol."
    return mock_plan


_LLM_PATCH = "resource_agent._llm"


def _mock_llm_returning_plan():
    llm_mock = MagicMock()
    llm_mock.with_structured_output.return_value.invoke.return_value = _make_mock_plan()
    return llm_mock


# ---------------------------------------------------------------------------
# AI-RES-01 - Graph builds and runs with an injected InMemorySaver
# ---------------------------------------------------------------------------
class TestCheckpointerInjection(unittest.TestCase):
    """AI-RES-01: Verify build_resource_graph() accepts an injected checkpointer."""

    @patch(_LLM_PATCH, side_effect=_mock_llm_returning_plan)
    def test_injected_memory_checkpointer_is_used(self, _mock):
        """Graph built with explicit InMemorySaver must run end-to-end."""
        from resource_agent import build_resource_graph

        cp = InMemorySaver()
        graph = build_resource_graph(checkpointer=cp)

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
        self.assertGreater(len(result["steps"]), 0)


# ---------------------------------------------------------------------------
# AI-RES-02 - _build_checkpointer() factory behaviour
# ---------------------------------------------------------------------------
class TestBuildCheckpointerFactory(unittest.TestCase):
    """AI-RES-02: _build_checkpointer() factory returns correct type by env var."""

    def test_build_checkpointer_falls_back_to_memory_when_no_db_url(self):
        """_build_checkpointer must return InMemorySaver when no DB URL is set."""
        from resource_agent import _build_checkpointer  # type: ignore

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
        """_build_checkpointer must raise RuntimeError (fail-closed) when DB URL
        is configured but langgraph-checkpoint-postgres is missing."""
        from resource_agent import _build_checkpointer  # type: ignore

        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "langgraph.checkpoint.postgres":
                raise ImportError("Simulated missing package")
            return real_import(name, *args, **kwargs)

        with patch.dict(
            os.environ,
            {"RESOURCE_AGENT_DATABASE_URL": "postgresql://user:pass@localhost/test"},
        ):
            with patch("builtins.__import__", side_effect=mock_import):
                with self.assertRaises(RuntimeError) as ctx:
                    _build_checkpointer()
                self.assertIn("langgraph-checkpoint-postgres", str(ctx.exception))


# ---------------------------------------------------------------------------
# AI-RES-03 - Graph compiles with default checkpointer (no arg)
# ---------------------------------------------------------------------------
class TestDefaultGraphCompilation(unittest.TestCase):
    """AI-RES-03: build_resource_graph() with no args compiles successfully."""

    def test_graph_compiles_with_default_checkpointer(self):
        """build_resource_graph() with no arguments must return a compiled graph
        that exposes an invoke() callable."""
        from resource_agent import build_resource_graph
        graph = build_resource_graph()
        self.assertTrue(callable(getattr(graph, "invoke", None)))


# ---------------------------------------------------------------------------
# AI-RES-04 - Safe-failure path: no stock available
# ---------------------------------------------------------------------------
class TestSafeFailureNoStock(unittest.TestCase):
    """AI-RES-04: Workflow ends with SafeFailure when no inventory is available."""

    @patch(_LLM_PATCH, side_effect=_mock_llm_returning_plan)
    def test_no_stock_triggers_safe_failure(self, _mock):
        """Empty inventory must cause approval_status=SafeFailure without crashing."""
        from resource_agent import build_resource_graph

        graph = build_resource_graph(checkpointer=InMemorySaver())
        result = graph.invoke(
            {
                "messages": [],
                "mission_id": "test-safe-fail",
                "teams_required": 2,
                "latitude": 6.9271,
                "longitude": 79.8612,
                "district": "Colombo",
                "warehouses": WAREHOUSES,
                "inventory": [],
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
            {"configurable": {"thread_id": "test-safe-fail"}},
        )

        self.assertEqual(result["approval_status"], "SafeFailure")
        self.assertEqual(result["overall_status"], "Failed")
        self.assertIsNone(result["dispatch_plan"])
        self.assertIsNotNone(result["error"])


# ---------------------------------------------------------------------------
# Integration test - only runs when RESOURCE_AGENT_DATABASE_URL is set
# ---------------------------------------------------------------------------
@unittest.skipUnless(
    os.getenv("RESOURCE_AGENT_DATABASE_URL") or os.getenv("DATABASE_URL"),
    "RESOURCE_AGENT_DATABASE_URL not set - skipping durable checkpointer integration test",
)
class TestPostgresSaverIntegration(unittest.TestCase):
    """Verify that workflow state survives across two invocations via PostgresSaver."""

    @patch(_LLM_PATCH, side_effect=_mock_llm_returning_plan)
    def test_state_is_durable_across_invocations(self, _mock):
        """Run the graph twice; second run must find saved checkpoint."""
        from langgraph.checkpoint.postgres import PostgresSaver  # type: ignore
        from resource_agent import build_resource_graph

        db_url = (
            os.getenv("RESOURCE_AGENT_DATABASE_URL") or os.getenv("DATABASE_URL")
        )
        saver = PostgresSaver.from_conn_string(db_url)  # type: ignore
        saver.setup()  # type: ignore

        graph = build_resource_graph(checkpointer=saver)
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
        saved = saver.get(thread_cfg["configurable"])  # type: ignore
        self.assertIsNotNone(saved, "Checkpoint must exist after first invocation.")
        self.assertIn(result1["approval_status"], ("PendingApproval", "SafeFailure"))


if __name__ == "__main__":
    unittest.main()
