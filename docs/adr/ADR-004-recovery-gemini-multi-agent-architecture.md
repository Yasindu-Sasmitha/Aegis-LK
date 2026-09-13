# ADR-004: Autonomous Multi-Step Agentic AI Workflow for Disaster Recovery & Reconstruction

## Status
**Accepted** — 2026-09-10

## Context & Problem Statement
In disaster-impacted environments like Sri Lanka (frequent monsoons, landslides, and floods), creating a comprehensive post-disaster recovery plan involves high-stakes decision-making across heterogeneous domains:
1. Identifying damaged public assets (bridges, water lines, clinics, schools) and ranking reconstruction urgency.
2. Estimating evacuee volume and optimizing shelter bed allocations without causing local overcrowding.
3. Matching registered NGOs with verified sector capabilities to specific rebuilding tasks.
4. Estimating financial budgets and calculating emergency family living stipends.
5. Deterministically enforcing government fiscal ceilings, anti-corruption policies, and human-in-the-loop validation before committing municipal funds.

A naive single-prompt LLM wrapper fails to meet enterprise requirements because:
- LLMs hallucinate non-existent NGOs, arbitrary costs, and exceed physical shelter capacities.
- Single prompts lack auditability, explainability, and intermediate validation gates.
- Direct execution without deterministic safety guardrails risks unverified budget allocations and prompt injection vulnerabilities.

## Decision
We implemented a **4-Agent Multi-Step Agentic AI Workflow** powered by Google Gemini (`gemini-2.5-flash` / `gemini-1.5-pro` with resilient deterministic fallback) in `Aegis.Recovery`.

### The 4 Specialized Agents & Responsibilities

1. **Agent 1: Recovery Orchestrator / Planner Agent**
   - *Role*: Deconstructs disaster incident data into 4 recovery phases: (a) Immediate Shelter & Evacuee Care, (b) Critical Lifeline Infrastructure Repair, (c) Community Financial Aid, and (d) Secondary Rehabilitation.
   - *Input*: `{ incidentId, district, disasterType, housesDamaged, displacedFamilies, infrastructureItems }`
   - *Output*: `{ disasterCategory, recoveryPhases: [...], targetObjectives, plannerRationale }`

2. **Agent 2: Infrastructure & Shelter Domain Analysis Agent**
   - *Role*: Analyzes damaged infrastructure criticality (Bridges, Hospitals, Water lines vs. local roads), calculates required shelter bed count ($Families \times 4$), and evaluates district shelter sufficiency.
   - *Input*: `{ recoveryPhases, infrastructureItems, displacedFamilies, availableShelterCapacity }`
   - *Output*: `{ prioritizedDamageList: [...], requiredShelterBeds, estimatedReliefDays, shelterSufficient }`

3. **Agent 3: Resource & NGO Matching Tool Agent**
   - *Role*: Interacts with allow-listed deterministic system tools to query active shelters, match verified NGOs registered for specific emergency sectors, compute cost benchmarks, and calculate family living stipends.
   - *Input*: Tool outputs from `tool_query_shelter_capacity`, `tool_match_ngo_by_sector`, `tool_estimate_repair_costs`, `tool_calculate_family_stipend`.
   - *Output*: Structured task draft `{ planName, estimatedTotalBudget, tasks: [...] }`

4. **Agent 4: Safety, Budget & Policy Validation Agent (Deterministic Guardrails)**
   - *Role*: Deterministically enforces business rules:
     - All assigned NGOs must exist in the database and be in active/verified standing.
     - No task has an invalid cost unless explicitly volunteer/in-kind.
     - Budget cap enforcement: Plans $> \text{LKR } 500,000$ automatically transition to `PendingApproval` state for Human-in-the-Loop officer review.
     - Maximum budget ceiling guardrail ($\le \text{LKR } 50,000,000$).
     - Prompt injection and suspicious command detection in victim notes.
   - *Output*: `{ requiresHumanApproval, approvalReason, violations, correctedTasks, executionSummary }`

### Allow-Listed Deterministic Tools
- `tool_query_shelter_capacity`: Queries remaining shelter capacity in the district.
- `tool_match_ngo_by_sector`: Filters verified NGOs by matching expertise sectors (Infrastructure, Shelter, Medical, WaterSanitation).
- `tool_estimate_repair_costs`: Computes standardized cost benchmarks based on damage severity (Destroyed, Severe, Moderate, Minor).
- `tool_calculate_family_stipend`: Calculates government living relief stipends ($Families \times Days \times Rate$).

### Human-in-the-Loop State Machine
```
[Intake Damage Report]
        │
        ▼
[4-Agent Reasoning Engine]
        │
   (Validation)
        │
   Budget > 500k LKR?
     ├── Yes ──► Status: PendingApproval ──► Officer Review (React / Flutter)
     │                                            ├── Approve ──► Status: Approved ──► Spawn DB Tasks
     │                                            ├── Reject  ──► Status: Rejected ──► Safe Audit Log
     │                                            └── Revise  ──► Status: Draft ──► Re-run with Guidance
     └── No  ──► Status: Approved ──► Spawn DB Tasks
```

## Consequences

### Positive
- **Determinism & Safety**: Allow-listed tools eliminate NGO hallucination and enforce real-world database constraints.
- **Observability**: Full execution traces (inputs, outputs, durations, tool call payloads) are recorded in `RecoveryPlan.PlanSummaryJson` and visible in real-time in React Web and Flutter.
- **Resilience**: If Gemini API is unreachable or rate-limited, the system falls back to a deterministic rule-based heuristic generator with full trace fidelity without crashing.
- **Modularity**: Member 4's Recovery component operates independently with its own intake form, database schema (`recovery.*`), and cross-platform UI.

### Negative / Trade-offs
- Multi-step LLM calls introduce ~1.5s - 3.5s latency per workflow execution (mitigated by asynchronous background job handling and instant UI progress indicators).
