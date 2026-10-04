# Member 3 — Resource & Logistics Module

Aegis-LK: Intelligent Disaster Prediction, Response and Recovery Platform for Sri Lanka.

---

## 1. Overview & Module Scope

The **Resource & Logistics** module is the operational backbone of Aegis-LK, delivering real-time visibility into emergency warehouses, stock levels, response vehicles, and AI-assisted dispatch planning across all **25 administrative districts of Sri Lanka**. It provides:

- **Warehouse Management**: Full CRUD with district-level coordinate mapping and cascade delete.
- **Inventory Management**: Per-warehouse stock levels with reorder thresholds, low-stock detection, and signed-quantity adjustments.
- **Vehicle Fleet**: Warehouse-bound vehicles with type, capacity, and status lifecycle (`Available` / `Dispatched` / `Maintenance`).
- **Dispatch Planning**: Agentic AI multi-step planning that selects the optimal warehouse, allocates items, computes an ETA, and pauses for human approval.
- **Human-in-the-Loop Governance**: Dispatch plans persist as `PendingApproval`; inventory is only reserved after authorised approval.
- **Cross-Module Integration**: Consumes dispatch requests from the Incident module and produces audit trails for Recovery consumption.
- **Auditable Trace**: Every dispatch response includes the full 4-agent execution trace (per-step timings, tool calls, guardrail verdicts).

---

## 2. Module Ownership & Directory Structure
Aegis-LK/
├── backend/Aegis.Resource/
│ ├── Data/
│ │ ├── ResourceDbContext.cs # EF Core context, relationships & configurations
│ │ └── ResourceDataSeeder.cs # 25 district warehouses + baseline inventory
│ ├── DTOs/
│ │ ├── WarehouseDtos.cs # Create/Update/Response DTOs
│ │ ├── InventoryDtos.cs # Inventory + AdjustQuantity DTOs
│ │ └── DispatchDtos.cs # CreateDispatchRequest + Response DTOs
│ ├── Endpoints/
│ │ ├── WarehouseEndpoints.cs # Warehouse CRUD Minimal API group
│ │ ├── InventoryEndpoints.cs # Inventory CRUD + adjust endpoint
│ │ ├── DispatchEndpoints.cs # Dispatch requests + approve endpoint
│ │ └── ResourceEndpoints.cs # Module root registration
│ ├── Entities/
│ │ ├── Warehouse.cs # Warehouse entity with coordinates
│ │ ├── Inventory.cs # Stock rows per warehouse per item
│ │ ├── Vehicle.cs # Fleet assigned to warehouses
│ │ ├── Fuel.cs # Fuel readings per vehicle (1:1)
│ │ ├── ResourceRequest.cs # Inbound mission from Incident module
│ │ ├── Dispatch.cs # Generated plan (jsonb items column)
│ │ ├── Delivery.cs # Delivery confirmation with QR code
│ │ ├── ItemType.cs # Food / Medical / Shelter / Rescue / Fuel / Other
│ │ ├── VehicleEnums.cs # VehicleType + VehicleStatus
│ │ ├── DispatchApprovalStatus.cs # PendingApproval / Approved / Rejected
│ │ ├── ResourceRequestStatus.cs # Pending / Approved / Rejected
│ │ └── ResourceModuleModelConfiguration.cs # EF Core relationship + cascade + jsonb ValueComparer
│ ├── Migrations/ # EF Core migrations (4 total)
│ └── Services/
│ ├── IWarehouseService.cs # Warehouse contract
│ ├── WarehouseService.cs # CRUD + manual FK-safe delete order
│ ├── IInventoryService.cs # Inventory contract
│ ├── InventoryService.cs # CRUD + adjust quantity
│ ├── IDispatchService.cs # Dispatch contract
│ ├── DispatchService.cs # Agent integration + 2-tier vehicle resolution
│ ├── ResourceAgentClient.cs # Typed HttpClient to Python agent (port 8003)
│ └── ResourceAgentModels.cs # Request/response DTOs for the agent HTTP call
│
├── agentic-ai/agents/
│ ├── resource_agent.py # 4-agent LangGraph pipeline
│ ├── resource_tools.py # Allow-listed tools with validation
│ ├── resource_agent_service.py # FastAPI wrapper on port 8003
│ └── tests/test_agent.py # 5 golden-case workflow tests
│
├── react/src/features/resource/
│ ├── api/resourceApi.ts # Typed API client with JWT injection
│ ├── types/resourceTypes.ts # Frontend domain interfaces & DTOs
│ └── pages/
│ ├── ResourceDashboardPage.tsx # KPIs, warehouses, low-stock, approved plans
│ ├── WarehouseManagementPage.tsx # CRUD table + add/edit modal + delete confirm
│ ├── InventoryManagementPage.tsx # Inventory table with status badges
│ └── DispatchManagementPage.tsx # Dispatch planner + approval queue
│
├── flutter/lib/features/resource/
│ ├── models/resource_models.dart # Dart models with JSON serialization
│ ├── services/resource_service.dart # Mobile HTTP client (AuthService pattern)
│ └── screens/
│ ├── warehouse_inventory_screen.dart # Search + filter warehouse stock (field officers)
│ ├── dispatch_plan_screen.dart # Plan review + approve (field officers)
│ └── delivery_qr_screen.dart # QR-scan delivery confirmation (device feature)
│
└── backend/Aegis.Tests/
└── DispatchServiceTests.cs # 7 xUnit tests for dispatch workflow


---

## 3. Architecture & Domain Entities

### Entity Relationship Model
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Warehouse │ │ Inventory │ │ Vehicle │
├─────────────────┤ 1 * ├─────────────────┤ ├─────────────────┤
│ Id (PK) │◄──────┤ Id (PK) │ │ Id (PK) │
│ Name │ │ WarehouseId(FK) │ │ WarehouseId(FK) │
│ District │ │ ItemName │ │ RegistrationNr │
│ Latitude │ │ ItemType (enum) │ │ VehicleType │
│ Longitude │ │ QuantityAvail │ │ Capacity │
│ ContactPhone │ │ ReorderThreshold│ │ Status (enum) │
└────────┬────────┘ └─────────────────┘ └────────┬────────┘
│ 1 │ 1
│ * │ 1
┌────────┴────────┐ ┌─────────────────┐ ┌────────┴────────┐
│ Vehicle │ │ResourceRequest │ │ Fuel │
│ (Cascade FK) │ ├─────────────────┤ ├─────────────────┤
└─────────────────┘ │ Id (PK) │ │ Id (PK) │
│ MissionId (Guid)│ │ VehicleId (FK) │
│ TeamsRequired │ │ LitresRemaining │
│ District │ │ LastRefueledAt │
│ Status (enum) │ └─────────────────┘
└────────┬────────┘
│ 1
│ 1
┌────────┴────────┐ ┌─────────────────┐
│ Dispatch │◄──────┤ Vehicle │
├─────────────────┤ │ (Restrict FK) │
│ Id (PK) │ └─────────────────┘
│ ResourceReqId │
│ WarehouseId (FK)│ ┌─────────────────┐
│ VehicleId (FK) │ │ Warehouse │
│ ItemsAllocated │ │ (Restrict FK) │
│ (jsonb) │ └─────────────────┘
│ EstimatedArrMin │
│ ApprovalStatus │ ┌─────────────────┐
│ AgentReasoning │◄──────┤ Delivery │
└─────────────────┘ 1 1 │ ConfirmationQR │
└─────────────────┘


**Cascade policy:**
- `Warehouse → Inventory` : `DeleteBehavior.Cascade`
- `Warehouse → Vehicle` : `DeleteBehavior.Cascade`
- `Dispatch → Warehouse` : `DeleteBehavior.Restrict` (audit preserved)
- `Dispatch → Vehicle` : `DeleteBehavior.Restrict` (audit preserved)
- Manual FK-safe delete order in `WarehouseService.DeleteAsync` handles dispatches/deliveries/resource requests.

**JSONB Storage:**
- `Dispatch.ItemsAllocated` is a `List<AllocatedItem>` stored as PostgreSQL `jsonb`.
- A custom `ValueComparer<List<AllocatedItem>>` allows EF Core to detect changes correctly.

---

## 4. Multi-Agent AI Workflow

The Resource Allocation Agent is a **4-Agent Collaborative Pipeline** built with **LangGraph** and **Google Gemini** (`gemini-3.5-flash-lite`), wrapped in a **FastAPI** service bound to `127.0.0.1:8003` and called only by the .NET backend.


**Cascade policy:**
- `Warehouse → Inventory` : `DeleteBehavior.Cascade`
- `Warehouse → Vehicle` : `DeleteBehavior.Cascade`
- `Dispatch → Warehouse` : `DeleteBehavior.Restrict` (audit preserved)
- `Dispatch → Vehicle` : `DeleteBehavior.Restrict` (audit preserved)
- Manual FK-safe delete order in `WarehouseService.DeleteAsync` handles dispatches/deliveries/resource requests.

**JSONB Storage:**
- `Dispatch.ItemsAllocated` is a `List<AllocatedItem>` stored as PostgreSQL `jsonb`.
- A custom `ValueComparer<List<AllocatedItem>>` allows EF Core to detect changes correctly.

---

## 4. Multi-Agent AI Workflow

The Resource Allocation Agent is a **4-Agent Collaborative Pipeline** built with **LangGraph** and **Google Gemini** (`gemini-3.5-flash-lite`), wrapped in a **FastAPI** service bound to `127.0.0.1:8003` and called only by the .NET backend.
┌─────────────────────────────────────┐
│ Mission Objective (JSON payload) │
│ {missionId, teams, district, lat/lng│
│ warehouses[], inventory[]} │
└──────────────────┬──────────────────┘
│
▼
┌─────────────────────────────────────┐
│ AGENT 1: Dispatch Coordinator │
│ Produces structured 4-step plan │
│ (LLM with Pydantic Plan output) │
└──────────────────┬──────────────────┘
│
▼
┌─────────────────────────────────────┐
│ AGENT 2: Warehouse Analyst │
│ Tool: get_warehouse_candidates() │
│ Ranks warehouses by stock + distance│
└──────────────────┬──────────────────┘
│
┌──────────┴───────────┐
│ │
(has stock) (no stock)
│ │
▼ ▼
┌──────────────┐ ┌──────────┐
│ Continue │ │ END │
│ │ │ SafeFail │
└──────┬───────┘ └──────────┘
│
▼
┌─────────────────────────────────────┐
│ AGENT 3: Dispatch Planner │
│ Tool: compute_allocation() │
│ Allocates items from chosen warehouse│
└──────────────────┬──────────────────┘
│
▼
┌─────────────────────────────────────┐
│ AGENT 4: Validation & Safety │
│ Tool: validate_dispatch_plan() │
│ Deterministic business-rule gate │
└──────────────────┬──────────────────┘
│
Status: 'PendingApproval'
│
▼
┌─────────────────────────────────────┐
│ .NET PERSISTS DISPATCH + RESERVES │
│ VEHICLE (2-tier fallback: local │
│ warehouse → system-wide) │
└──────────────────┬──────────────────┘
│
▼
┌─────────────────────────────────────┐
│ RESOURCE MANAGER REVIEW & APPROVE │
│ POST /dispatch/{id}/approve │
│ → Inventory decremented atomically │
└─────────────────────────────────────┘


### Allow-Listed Tools
1. `get_warehouse_candidates(latitude, longitude, district, teams_required, warehouses, inventory)` — ranks warehouses by total stock (descending) then distance (ascending).
2. `compute_allocation(mission_id, teams_required, district, warehouse)` — allocates items using per-item caps derived from team count.
3. `validate_dispatch_plan(plan, warehouse)` — deterministic checks: no empty items, positive quantities, no overallocation, positive ETA, positive vehicle count.

### Deterministic Guardrails
- **Empty plan rejection**: a plan with zero items fails validation.
- **Stock ceiling**: any item quantity exceeding the warehouse's stock fails validation.
- **Positive quantity**: zero or negative quantities fail validation.
- **ETA positivity**: ETA must be strictly greater than 0 minutes.
- **Vehicle count positivity**: at least 1 vehicle.
- **Safe-failure fast path**: if the Warehouse Analyst finds no stock, the graph terminates immediately (`route_after_analyst` → END) instead of looping.
- **Recursion cap**: `recursion_limit = 25` by default; safe failures prevent runaway loops.

---

## 5. REST API Reference

All endpoints are prefixed with `/api/resource` and require JWT authentication. 11 endpoints total:

### Warehouses
- `GET /api/resource/warehouses` — Paginated list with `district` filter, `search`, sorting, pagination.
- `GET /api/resource/warehouses/{id}` — Retrieve a single warehouse.
- `POST /api/resource/warehouses` — Register a warehouse (*DisasterOfficer / Admin*).
- `PUT /api/resource/warehouses/{id}` — Update a warehouse (*DisasterOfficer / Admin*).
- `DELETE /api/resource/warehouses/{id}` — Delete with cascading vehicle + inventory cleanup (*Admin only*).

### Inventory
- `GET /api/resource/inventory` — Paginated list with `warehouseId`, `itemType`, `lowStockOnly`, sorting.
- `GET /api/resource/inventory/{id}` — Retrieve a single inventory row.
- `POST /api/resource/inventory` — Create an inventory row (*DisasterOfficer / Admin*).
- `PUT /api/resource/inventory/{id}` — Update an inventory row (*DisasterOfficer / Admin*).
- `PATCH /api/resource/inventory/{id}/adjust` — **Business-specific operation**: signed `QuantityChange` with audit `Reason`. Rejects negative-stock attempts with `400 Bad Request`.
- `DELETE /api/resource/inventory/{id}` — Delete an inventory row (*Admin only*).

### Dispatch
- `POST /api/resource/dispatch/requests` — **Core business operation**: trigger the Agentic AI dispatch planning workflow. Returns the full 4-agent trace and a `PendingApproval` plan (*DisasterOfficer / Admin*).
- `GET /api/resource/dispatch` — List recent dispatch plans (last 50, ordered by CreatedAt DESC).
- `GET /api/resource/dispatch/{id}` — Fetch a single dispatch plan with its items and route summary.
- `POST /api/resource/dispatch/{id}/approve` — **Human-in-the-loop**: approve a plan and atomically reserve inventory (*DisasterOfficer / Admin*).

### Business Operations Beyond CRUD
1. **Inventory Adjustment** — signed-quantity changes with validation against negative stock.
2. **Dispatch Approval** — atomic inventory reservation across multiple line items with rollback on failure.

---

## 6. How to Run Locally

### 1. Backend (.NET 10 API)

```powershell
cd backend
dotnet run --project Aegis.Api
```

### 2. Python Resource Agent (port 8003) 

```powershell
cd agentic-ai/agents
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

uvicorn resource_agent_service:app --host 127.0.0.1 --port 8003 --reload
```

Health check:
```powershell
curl.exe http://127.0.0.1:8003/health
# → {"status":"ok","service":"resource-agent","port":8003}
```

### 3. React Frontend

```powershell
cd react
npm install
npm run dev
```

### 4. Flutter Mobile App

```powershell
cd flutter
flutter pub get
flutter run -d chrome

# Or Android emulator:
# flutter run -d emulator-5554
```

### 5. Running Automated Tests

Backend (xUnit) — 140 tests total across the platform, including Resource dispatch tests:

```powershell
cd backend
dotnet test Aegis.Tests/Aegis.Tests.csproj
```

Expected: `Passed! - Failed: 0, Passed: 140, Skipped: 0`

### 6. Agent (Python pytest) — 5 golden-case tests:

```powershell
cd agentic-ai/agents
python -m pytest tests/test_agent.py -v
```

Expected: `5 passed`



