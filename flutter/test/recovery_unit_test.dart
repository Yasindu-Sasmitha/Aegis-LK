import 'package:flutter_test/flutter_test.dart';
import 'package:aegis_lk/features/recovery/models/recovery_models.dart';

void main() {
  group('Member 4: Recovery & Community Relief Unit Tests', () {
    // ── 1. ShelterModel ─────────────────────────────────────────────────────

    test('ShelterModel parsing and bed capacity calculations', () {
      final json = {
        'id': 'shelter-001',
        'name': 'Galle Relief Center',
        'location': 'Fort Road, Galle',
        'district': 'Galle',
        'latitude': 6.0535,
        'longitude': 80.2210,
        'capacity': 500,
        'currentOccupancy': 350,
        'status': 'Open',
        'contactPerson': 'Mr. Perera',
        'contactPhone': '+94 91 223 4567',
        'facilities': 'Clean Water, Electricity, Sanitation',
      };

      final shelter = ShelterModel.fromJson(json);

      expect(shelter.id, 'shelter-001');
      expect(shelter.name, 'Galle Relief Center');
      expect(shelter.district, 'Galle');
      expect(shelter.capacity, 500);
      expect(shelter.currentOccupancy, 350);
      expect(shelter.remainingBeds, 150);
      expect(shelter.occupancyPercentage, closeTo(0.70, 0.01));
      expect(shelter.status, 'Open');
    });

    test('ShelterModel handles full capacity boundary (0 remaining beds)', () {
      final json = {
        'id': 'shelter-full',
        'name': 'Matara Community Hall',
        'location': 'Beach Road',
        'district': 'Matara',
        'capacity': 200,
        'currentOccupancy': 200,
        'status': 'Full',
        'contactPerson': 'Officer Kamal',
        'contactPhone': '+94 41 222 1111',
      };

      final shelter = ShelterModel.fromJson(json);

      expect(shelter.remainingBeds, 0);
      expect(shelter.occupancyPercentage, 1.0);
    });

    // ── 2. AidRequestModel ──────────────────────────────────────────────────

    test('AidRequestModel parsing and status/urgency classification', () {
      final json = {
        'id': 'aid-req-101',
        'victimName': 'Nimal Siripala',
        'contactPhone': '0778899001',
        'district': 'Kalutara',
        'aidType': 'Food and Water Rations',
        'familySize': 5,
        'urgency': 'High',
        'status': 'Approved',
        'shelterName': 'Kalutara Central Camp',
        'notes': 'Family displaced by river overflowing.',
        'createdAt': '2026-09-28T10:00:00Z',
      };

      final aid = AidRequestModel.fromJson(json);

      expect(aid.id, 'aid-req-101');
      expect(aid.victimName, 'Nimal Siripala');
      expect(aid.familySize, 5);
      expect(aid.urgency, 'High');
      expect(aid.status, 'Approved');
      expect(aid.shelterName, 'Kalutara Central Camp');
    });

    // ── 3. DonationModel ────────────────────────────────────────────────────

    test('DonationModel parsing and fund allocation fields', () {
      final json = {
        'id': 'don-501',
        'donorName': 'Colombo Relief Trust',
        'donationType': 'Money',
        'amountOrQuantity': 250000.0,
        'itemDescription': 'Cash donation for flood relief',
        'allocationStatus': 'Received',
        'createdAt': '2026-09-28T12:00:00Z',
      };

      final donation = DonationModel.fromJson(json);

      expect(donation.id, 'don-501');
      expect(donation.donorName, 'Colombo Relief Trust');
      expect(donation.amountOrQuantity, 250000.0);
      expect(donation.donationType, 'Money');
      expect(donation.status, 'Received');
    });

    // ── 4. WorkflowTraceModel & AgentStepModel ──────────────────────────────

    test('WorkflowTraceModel and 4-Agent step timeline parsing', () {
      final json = {
        'workflowLogId': 'log-999',
        'recoveryPlanId': 'plan-999',
        'executionStatus': 'Completed',
        'totalDurationMs': 540,
        'retryCount': 0,
        'executionSummary': '4-agent pipeline completed successfully.',
        'createdAt': '2026-09-28T15:00:00Z',
        'agentSteps': [
          {
            'agentName': 'Agent 1: Orchestrator & Planner',
            'role': 'Decomposes incident into recovery phases',
            'inputSummary': 'Damage Intake: 45 houses, 120 families',
            'outputSummary': 'Generated 4 structured recovery phases',
            'durationMs': 120,
            'status': 'success',
          },
          {
            'agentName': 'Agent 2: Infrastructure Analysis',
            'role': 'Prioritizes damaged assets',
            'inputSummary': '3 damaged bridges and roads',
            'outputSummary': 'Prioritized 3 assets by urgency',
            'durationMs': 140,
            'status': 'success',
          },
          {
            'agentName': 'Agent 3: Resource & NGO Matching',
            'role': 'Drafts actionable recovery tasks',
            'inputSummary': 'Qualified NGOs and benchmarks',
            'outputSummary': 'Created 6 actionable tasks',
            'durationMs': 150,
            'status': 'success',
          },
          {
            'agentName': 'Agent 4: Safety & Policy Validation',
            'role': 'Enforces statutory budget ceilings',
            'inputSummary': 'Total budget LKR 15,000,000',
            'outputSummary': 'All guardrails passed',
            'durationMs': 130,
            'status': 'success',
          },
        ],
        'toolCalls': [
          {
            'toolName': 'tool_fetch_available_shelters',
            'inputJson': '{"district":"Galle","requiredBeds":300}',
            'outputJson': '{}',
            'durationMs': 50,
            'status': 'success',
          }
        ],
        'validationResults': [],
      };

      final trace = WorkflowTraceModel.fromJson(json);

      expect(trace.recoveryPlanId, 'plan-999');
      expect(trace.agentSteps.length, 4);
      expect(trace.totalDurationMs, 540);
      expect(trace.agentSteps[0].agentName, contains('Agent 1'));
      expect(trace.agentSteps[0].durationMs, 120);
      expect(trace.agentSteps[3].agentName, contains('Agent 4'));
      expect(trace.toolCalls.length, 1);
      expect(trace.toolCalls[0].toolName, 'tool_fetch_available_shelters');
    });

    // ── 5. RecoveryPlanModel & RecoveryTaskModel ─────────────────────────────

    test('RecoveryPlanModel and NGO task ledger status mapping', () {
      final json = {
        'id': 'plan-001',
        'incidentId': 'inc-001',
        'planName': 'Master Recovery Plan — Galle Coastal',
        'estimatedTotalBudget': 25000000.0,
        'status': 'PendingApproval',
        'planSummaryJson': '{}',
        'revisionCount': 0,
        'createdAt': '2026-09-28T10:00:00Z',
        'tasks': [
          {
            'id': 'task-1',
            'title': 'Emergency Water Network Repair',
            'description': 'Restore main supply pipe.',
            'assignedNGOName': 'Red Cross Sri Lanka',
            'priority': 'Critical',
            'estimatedCost': 3500000.0,
            'status': 'Pending',
          }
        ],
      };

      final plan = RecoveryPlanModel.fromJson(json);

      expect(plan.id, 'plan-001');
      expect(plan.planName, contains('Galle Coastal'));
      expect(plan.estimatedTotalBudget, 25000000.0);
      expect(plan.status, 'PendingApproval');
      expect(plan.tasks.length, 1);
      expect(plan.tasks[0].assignedNGOName, 'Red Cross Sri Lanka');
      expect(plan.tasks[0].priority, 'Critical');
      expect(plan.tasks[0].estimatedCost, 3500000.0);
    });
  });
}
