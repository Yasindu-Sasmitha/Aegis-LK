import asyncio
import unittest
from unittest.mock import patch

# sys.path is configured by conftest.py (adds agentic-ai/agents/ before collection)
from recovery_agent import (
    AgentRequestPayload,
    InfrastructureItem,
    run_agent_1_planner,
    run_agent_2_analysis,
    run_agent_3_matching,
    run_agent_4_validation,
    run_recovery_workflow,
)

# The module is imported from sys.path, so patches must target "recovery_agent.*"
PATCH_TARGET = "recovery_agent.call_gemini_json"


class RecoveryAgentDeterministicTests(unittest.TestCase):
    """
    Deterministic unit tests for Member 4 Recovery & Community Relief agent pipeline.
    Runs completely offline in milliseconds (0 cost, no external Gemini API key required).
    """

    def setUp(self):
        # NOTE: assets are ordered so that the "Destroyed" Bridge appears FIRST.
        # Agent 2's fallback assigns urgencyRank = index + 1, so Bridge → rank 1.
        self.sample_payload = AgentRequestPayload(
            incidentId="incident-test-001",
            disasterType="Flood & Inundation",
            location="Matara Coastal Sector",
            housesDamaged=45,
            displacedFamilies=120,
            declaredBudget=15000000.0,
            revisionGuidance="Prioritize medical posts and bridge access.",
            assets=[
                InfrastructureItem(assetName="Nilwala Bridge", assetType="Bridge", damageLevel="Destroyed"),
                InfrastructureItem(assetName="Matara District Hospital Road", assetType="Road", damageLevel="Moderate"),
                InfrastructureItem(assetName="Community Well #4", assetType="WASH", damageLevel="Minor"),
            ],
            qualifiedNgos=[
                {"name": "Red Cross Sri Lanka", "sectors": ["Health", "WASH"], "district": "Matara"},
                {"name": "Sarvodaya Shramadana", "sectors": ["Shelter", "Logistics"], "district": "Matara"},
            ],
            costBenchmarks=[
                {"assetType": "Bridge", "damageLevel": "Destroyed", "benchmarkCost": 3500000.0},
                {"assetType": "Road", "damageLevel": "Moderate", "benchmarkCost": 850000.0},
            ]
        )

    # ── Test 1: Agent 1 – disaster categorisation & phase decomposition ──────

    @patch(PATCH_TARGET, side_effect=Exception("Offline deterministic test mode"))
    def test_agent_1_planner_generates_phases_and_category(self, mock_llm):
        """Agent 1 decomposes disaster into 4 structured recovery phases with correct severity category."""
        agent1_out = run_agent_1_planner(self.sample_payload)

        self.assertIn(agent1_out.disasterCategory, ["Minor", "Moderate", "Severe", "Critical"])
        self.assertGreaterEqual(len(agent1_out.recoveryPhases), 3)
        self.assertTrue(
            any("Shelter" in p.phaseName or "Emergency" in p.phaseName for p in agent1_out.recoveryPhases)
        )
        self.assertTrue(all(p.estimatedDurationDays > 0 for p in agent1_out.recoveryPhases))

    # ── Test 2: Agent 2 – asset prioritisation ───────────────────────────────

    @patch(PATCH_TARGET, side_effect=Exception("Offline deterministic test mode"))
    def test_agent_2_analysis_ranks_damaged_assets(self, mock_llm):
        """Agent 2 prioritizes assets by damage level; destroyed critical assets get rank 1."""
        agent2_out = run_agent_2_analysis(self.sample_payload)

        self.assertEqual(len(agent2_out.prioritizedDamageList), 3)
        bridge = next(
            item for item in agent2_out.prioritizedDamageList if item.assetName == "Nilwala Bridge"
        )
        self.assertEqual(bridge.damageLevel, "Destroyed")
        self.assertEqual(bridge.repairComplexity, "Complex")
        # Bridge is first asset in payload → fallback assigns urgencyRank = 1
        self.assertEqual(bridge.urgencyRank, 1)

    # ── Test 3: Agent 3 – task composition & budget calculation ─────────────

    @patch(PATCH_TARGET, side_effect=Exception("Offline deterministic test mode"))
    def test_agent_3_matching_allocates_tasks_and_calculates_budget(self, mock_llm):
        """Agent 3 builds actionable task list matching accredited NGOs and estimating budget."""
        agent2_out = run_agent_2_analysis(self.sample_payload)
        agent3_out = run_agent_3_matching(self.sample_payload, agent2_out)

        self.assertIn("Recovery Plan", agent3_out.planName)
        self.assertGreater(agent3_out.estimatedTotalBudget, 0.0)
        self.assertGreaterEqual(len(agent3_out.tasks), 1)

        # All tasks must have positive costs and valid priority labels
        for task in agent3_out.tasks:
            self.assertGreater(task.estimatedCost, 0.0)
            self.assertIn(task.priority, ["Critical", "High", "Medium", "Low"])

    # ── Test 4: Agent 4 – budget guardrail & human-approval trigger ──────────

    def test_agent_4_guardrail_enforces_budget_ceiling(self):
        """Agent 4 enforces statutory ceiling and triggers human-approval for disaster plans."""
        with patch(PATCH_TARGET, side_effect=Exception("Offline")):
            agent2_out = run_agent_2_analysis(self.sample_payload)
            agent3_out = run_agent_3_matching(self.sample_payload, agent2_out)

        agent4_out = run_agent_4_validation(self.sample_payload, agent3_out)

        # All disaster-scale plans require human approval
        self.assertTrue(agent4_out.requiresHumanApproval)
        self.assertGreaterEqual(len(agent4_out.guardrailChecks), 1)

        # The guardrail check name in recovery_agent.py is "Budget Bounds"
        budget_check = next(
            (c for c in agent4_out.guardrailChecks if "Budget" in c.checkName), None
        )
        self.assertIsNotNone(budget_check, "Expected a Budget guardrail check to be present")
        self.assertIn(budget_check.status, ["pass", "warning"])

    # ── Test 5: Full 4-agent pipeline end-to-end ─────────────────────────────

    @patch(PATCH_TARGET, side_effect=Exception("Offline deterministic test mode"))
    def test_full_recovery_pipeline_produces_timeline_steps(self, mock_llm):
        """End-to-end 4-agent recovery synthesis generates WorkflowResponse with 4 audit steps."""
        # run_recovery_workflow is an async FastAPI route handler — must be awaited
        response = asyncio.run(run_recovery_workflow(self.sample_payload))

        # Exactly 4 timeline steps must be logged
        self.assertEqual(len(response.agentSteps), 4)
        step_numbers = [step.stepNumber for step in response.agentSteps]
        self.assertEqual(step_numbers, [1, 2, 3, 4])

        # All steps must report success with non-zero duration and non-empty output
        for step in response.agentSteps:
            self.assertEqual(step.status, "success")
            self.assertGreater(step.durationMs, 0)
            self.assertGreater(len(step.summaryOutput), 0)


if __name__ == "__main__":
    unittest.main()
