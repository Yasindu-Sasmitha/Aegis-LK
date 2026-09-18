# Member 4 — Recovery & Community Support Module

Aegis-LK: Intelligent Disaster Prediction, Response and Recovery Platform for Sri Lanka.

---

## 1. Overview & Module Scope

The **Recovery & Community Support** module is responsible for post-disaster rehabilitation, community relief coordination, and resource allocation across Sri Lanka. It bridges the gap between emergency response closure and long-term community recovery by automating:

- **Emergency Shelter Management**: Real-time capacity, occupancy tracking, and geo-location mapping.
- **Victim Aid Applications**: Food, medical, shelter, and financial assistance workflows.
- **Relief Donations**: Monetary and supply contributions with transparent shelter allocation.
- **Financial Compensation Claims**: Verification and disbursement governance with NIC validation.
- **Infrastructure Damage Assessment**: Asset prioritization (bridges, roads, water, power, healthcare).
- **NGO Partner Coordination**: Sector-based and district-aligned non-governmental organization matching.
- **Autonomous Multi-Agent Planning**: 4-Agent collaborative workflow using Google Gemini API with deterministic code guardrails.
- **Human-in-the-Loop Governance**: Strict role-based approval, rejection, and revision-feedback mechanisms.
- **Audit & Compliance Reporting**: Automated financial and operational recovery summary reports.

---

## 2. Module Ownership & Directory Structure

```
Aegis-LK/
├── backend/Aegis.Recovery/
│   ├── Data/
│   │   ├── RecoveryDbContext.cs          # EF Core context, relationships & configurations
│   │   └── RecoveryDataSeeder.cs         # Seed data for shelters, NGOs, and sample claims
│   ├── Dtos/
│   │   └── RecoveryDtos.cs               # Strongly-typed request/response records
│   ├── Endpoints/
│   │   └── RecoveryEndpoints.cs          # ASP.NET Core Minimal API endpoints
│   ├── Migrations/                       # EF Core database migrations & snapshot
│   ├── Models/
│   │   ├── Shelter.cs                    # Shelter entity with capacity constraints
│   │   ├── AidRequest.cs                 # Victim assistance application
│   │   ├── Donation.cs                   # Monetary / supply donation records
│   │   ├── Compensation.cs               # Financial compensation claims
│   │   ├── RecoveryTask.cs               # Actionable tasks linked to plans & NGOs
│   │   ├── InfrastructureDamage.cs       # Damaged assets & repair estimates
│   │   ├── NGO.cs                        # Partner organization records
│   │   ├── RecoveryReport.cs             # Post-disaster audit report
│   │   ├── RecoveryPlan.cs               # Master recovery strategy
│   │   └── RecoveryWorkflowLog.cs        # Agentic AI execution trace & audit log
│   └── Services/
│       ├── IIncidentIntegrationService.cs# Inter-module damage report contract
│       ├── IncidentIntegrationService.cs # HTTP client with fallback resilience
│       └── RecoveryAgentClientService.cs # 4-Agent Gemini orchestration & guardrails
│
├── react/src/features/recovery/
│   ├── api/recoveryApi.ts                # TypeScript Axios API client
│   ├── types/recoveryTypes.ts            # Frontend domain interfaces & DTOs
│   ├── components/
│   │   ├── ShelterList.tsx               # Shelter card directory & occupancy
│   │   ├── AidRequestTable.tsx           # Paginated aid application table
│   │   ├── DonationTracker.tsx           # Donation registry & shelter allocator
│   │   ├── CompensationTable.tsx         # Compensation claim reviewer & approval
│   │   └── RecoveryPlanViewer.tsx        # Agent plan details & task breakdown
│   └── pages/
│       ├── RecoveryDashboardPage.tsx     # High-level recovery metrics & KPIs
│       ├── ShelterManagementPage.tsx     # Shelter registry & live occupancy editor
│       ├── AidRequestsPage.tsx           # Aid application submission & triage
│       ├── DonationsPage.tsx             # Relief donation intake & allocation
│       ├── CompensationPage.tsx          # Victim compensation claims portal
│       ├── RecoveryPlanningPage.tsx      # Agentic AI studio, trace & officer approval
│       └── RecoveryReportsPage.tsx       # Historical audit reports & generator
│
├── flutter/lib/features/recovery/
│   ├── models/recovery_models.dart       # Dart models with JSON serialization
│   ├── services/recovery_service.dart    # Mobile HTTP client for Recovery APIs
│   └── screens/
│       ├── recovery_home_screen.dart     # Mobile recovery hub & navigation cards
│       ├── shelter_finder_screen.dart    # Shelter locator with occupancy status
│       ├── aid_request_screen.dart       # Citizen emergency aid submission form
│       ├── my_aid_requests_screen.dart   # Personal aid application status tracker
│       ├── donate_screen.dart            # Community supply & monetary donation form
│       ├── recovery_plan_status_screen.dart # Public recovery strategy viewer
│       └── citizen_damage_report_screen.dart# Citizen damage report & AI plan trigger
│
├── agentic-ai/agents/
│   └── recovery_agent.py                 # Standalone Python agent implementation
│
└── backend/Aegis.Tests/
    └── RecoveryBusinessRulesTests.cs     # 29 automated xUnit unit & rule tests
```

---

## 3. Architecture & Domain Entities

### Entity Relationship Model

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Shelter     │◄──────┤   AidRequest    │       │  Compensation   │
├─────────────────┤ 1   * ├─────────────────┤       ├─────────────────┤
│ Id (PK)         │       │ Id (PK)         │       │ Id (PK)         │
│ Name            │       │ VictimName      │       │ ApplicantName   │
│ District        │       │ ContactPhone    │       │ NIC             │
│ Capacity        │       │ FamilySize      │       │ ClaimAmount     │
│ CurrentOccupancy│       │ ShelterId (FK)  │       │ ApprovedAmount  │
│ Status          │       │ Status          │       │ Status          │
└────────┬────────┘       └─────────────────┘       └─────────────────┘
         │ 1
         │ *
┌────────┴────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Donation     │       │  RecoveryPlan   │◄──────┤  RecoveryTask   │
├─────────────────┤       ├─────────────────┤ 1   * ├─────────────────┤
│ Id (PK)         │       │ Id (PK)         │       │ Id (PK)         │
│ DonorName       │       │ IncidentId      │       │ Title           │
│ DonationType    │       │ Status          │       │ EstimatedCost   │
│ TargetShelterId │       │ Budget          │       │ AssignedNGOId   │
│ AllocationStatus│       │ RevisionCount   │       │ Priority        │
└─────────────────┘       └────────┬────────┘       └────────┬────────┘
                                   │ 1                       │ *
                                   │ 1                       │ 1
                          ┌────────┴────────┐       ┌────────┴────────┐
                          │RecoveryWorkflow-│       │       NGO       │
                          │      Log        │       ├─────────────────┤
                          ├─────────────────┤       │ Id (PK)         │
                          │ ExecutionSteps  │       │ Name            │
                          │ ToolCalls       │       │ Sectors         │
                          │ GuardrailResults│       │ AssignedBudget  │
                          └─────────────────┘       └─────────────────┘
```

---

## 4. Multi-Agent AI Workflow

The Recovery Planning Agent is a **4-Agent Collaborative Pipeline** built with Google Gemini (`gemini-3.1-flash-lite-preview` / `gemini-2.5-flash-lite`) and reinforced by deterministic C# guardrails:

```
                  ┌─────────────────────────────────────┐
                  │ Incident Damage Report / Intake Form│
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │ AGENT 1: Orchestrator & Planner     │
                  │ Decomposes disaster into phases     │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │ AGENT 2: Infrastructure & Shelter   │
                  │ Prioritizes assets & shelter deficit│
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │ AGENT 3: Resource & NGO Tools       │
                  │ Executes allow-listed matching tools│
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │ AGENT 4: Safety & Policy Validation │
                  │ Evaluates budget against thresholds │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │ DETERMINISTIC CODE GUARDRAILS       │
                  │ - Cost range anomaly check          │
                  │ - Shelter overflow prevention       │
                  │ - LKR 500,000 human-review threshold│
                  └──────────────────┬──────────────────┘
                                     │
                     Status: 'PendingApproval'
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │ RECOVERY OFFICER REVIEW & DECISION  │
                  ├─────────────────────────────────────┤
                  │ [Approve] -> Tasks become InProgress│
                  │ [Reject]  -> Strategy closed        │
                  │ [Revise]  -> AI re-runs with feedback│
                  └─────────────────────────────────────┘
```

### Allow-Listed Tools
1. `tool_filter_ngos_by_sector(sector, district)`: Discovers certified NGO partners matching damage types.
2. `tool_match_shelter_capacity(district, displacedCount)`: Selects shelters with adequate vacancy.
3. `tool_calculate_infrastructure_costs(assetType, damageLevel)`: Estimates baseline repair costs using Sri Lankan standard rates.

### Deterministic Guardrails
- **Budget Threshold Rule**: Any plan with estimated budget $> \text{LKR } 500,000$ automatically mandates human review (`RequiresHumanApproval = true`).
- **Cost Ceiling Rule**: Enforces standard cost bounds per asset type (e.g., Road repair $\le 1.5\text{M LKR}$, Bridge rebuild $\le 8\text{M LKR}$).
- **Capacity Integrity**: Rejects allocations that exceed shelter maximum capacities.

---

## 5. REST API Reference

All endpoints are prefixed with `/api/recovery` and require appropriate authorization headers:

### Emergency Shelters
- `GET /api/recovery/shelters` — List shelters with filtering (`district`, `status`, `search`) and pagination.
- `GET /api/recovery/shelters/{id}` — Retrieve detailed shelter facility data.
- `POST /api/recovery/shelters` — Register a new shelter (*Officer / Admin*).
- `PUT /api/recovery/shelters/{id}/occupancy` — Update current occupancy (*Officer / Admin*).

### Victim Aid Applications
- `GET /api/recovery/aid-requests` — List aid requests with status and urgency filters (*Officer / Admin*).
- `POST /api/recovery/aid-requests` — Submit an emergency assistance request (*Public / Citizen*).
- `PUT /api/recovery/aid-requests/{id}/status` — Approve or fulfill an aid request (*Officer / Admin*).

### Relief Donations
- `GET /api/recovery/donations` — Paginated list of monetary and supply donations (*Authenticated*).
- `POST /api/recovery/donations` — Record a new donation (*Public / Citizen*).
- `PUT /api/recovery/donations/{id}/allocation` — Allocate a donation to a shelter center (*Officer / Admin*).

### Victim Compensation Claims
- `GET /api/recovery/compensations` — Paginated list of compensation claims (*Officer / Admin*).
- `POST /api/recovery/compensations` — Submit a property/livelihood claim with NIC (*Citizen*).
- `PUT /api/recovery/compensations/{id}/approve` — Approve claim and disburse funds (*Officer / Admin*).

### Agentic AI Planning & Workflows
- `POST /api/recovery/workflows/start` — Initiate 4-Agent Planning Workflow from damage intake.
- `GET /api/recovery/workflows` — List historical recovery strategies and statuses.
- `GET /api/recovery/workflows/{planId}/trace` — Retrieve complete observability trace, step logs, and guardrail verdicts.
- `POST /api/recovery/workflows/{planId}/approve` — Human-in-the-loop decision: `Approve`, `Reject`, or `Revise` (*Officer / Admin*).

### Audit Reports
- `GET /api/recovery/reports` — List generated post-disaster audit reports (*Officer / Admin*).
- `POST /api/recovery/reports/generate` — Compile recovery metrics into an audit report (*Officer / Admin*).
- `DELETE /api/recovery/reports/{id}` — Remove an audit report (*Officer / Admin*).

---

## 6. How to Run Locally

### 1. Backend (.NET 10 API)
```powershell
cd "backend"
dotnet run --project Aegis.Api
```
- API Base: `http://localhost:5012`
- Interactive API Docs: `http://localhost:5012/scalar/v1`

### 2. React Frontend
```powershell
cd "react"
npm run dev
```
- URL: `http://localhost:5173`

### 3. Flutter Mobile App
```powershell
cd "flutter"
flutter pub get
flutter run -d chrome
```

### 4. Running Automated Tests
```powershell
dotnet test backend/Aegis.Tests/Aegis.Tests.csproj
```
All **29 automated tests** test business rules, shelter occupancy, aid requests, compensation ceilings, guardrails, and role permissions.
