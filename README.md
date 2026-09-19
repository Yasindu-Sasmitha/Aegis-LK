# Aegis-LK

Intelligent Disaster Prediction, Response and Recovery Platform for Sri Lanka.

A single deployable system — one ASP.NET Core Web API, one PostgreSQL database, one React app,
one Flutter app — organized as a **modular monolith** so four people can build independently
without merge conflicts, while the final product ships as one integrated application.

## Jump to your section

- [How this repo is organized](#how-this-repo-is-organized)
- [Local setup gotchas — read this before you open an issue](#local-setup-gotchas--read-this-before-you-open-an-issue)
- [Member 1 — Weather Intelligence](#member-1--weather-intelligence)
- [Member 2 — Incident & Rescue Operations](#member-2--incident--rescue-operations)
- [Member 3 — Resource & Logistics](#member-3--resource--logistics)
- [Member 4 — Recovery & Community Support](#member-4--recovery--community-support)
- [Shared files — edit with care](#shared-files--edit-with-care)
- [Branching & PR workflow](#branching--pr-workflow)
- [Running the project locally](#running-the-project-locally)
- [Team Member Implementation Guide & Upcoming Tasks](#team-member-implementation-guide--upcoming-tasks)
  - [Current System Status & Completed Foundation](#current-system-status--completed-foundation)
  - [Member 2 — Incident & Rescue Operations Roadmap](#member-2--incident--rescue-operations-roadmap)
  - [Member 3 — Resource & Logistics Roadmap](#member-3--resource--logistics-roadmap)
  - [Member 4 — Recovery & Community Support Roadmap](#member-4--recovery--community-support-roadmap)
  - [Cross-Module Integration Contracts & Data Flows](#cross-module-integration-contracts--data-flows)
  - [Flutter Development Guide for Team Members](#flutter-development-guide-for-team-members)

---

## How this repo is organized

```
Aegis-LK/
  backend/
    Aegis.Api/          # host project — Program.cs wires all 4 modules together
    Aegis.Shared/        # auth, JWT, base entities used by everyone
    Aegis.Weather/       # Member 1's module
    Aegis.Incident/      # Member 2's module
    Aegis.Resource/      # Member 3's module
    Aegis.Recovery/      # Member 4's module
    Aegis.Data/           # DbContexts and EF Core migrations
    Aegis.Tests/
  agentic-ai/
    agents/                # one Python file per member's agent
    orchestrator/           # shared coordinator — agree before editing
  react/src/
    features/               # one folder per member
    shared/                  # api client, auth context, layout — shared
  flutter/lib/
    features/               # one folder per member
    shared/                  # api client, auth provider, router — shared
  docs/
    adr/                    # one .md per architecture decision
    diagrams/                # ER diagram, architecture diagram
```

**Rule of thumb:** if your change only touches your own folder, just push to your branch and
open a PR. If it touches anything in "Shared files" below, flag it in the group chat first.

---

## Local setup gotchas — read this before you open an issue

Real problems the group has already hit, so nobody loses an hour rediscovering them:

- **A fresh `git pull` can crash your local run if you don't also update your database.** If a
  teammate's PR adds a new DbContext + migration + seeder call in `Program.cs`, pulling their code
  is not enough — their tables don't exist on *your* local Postgres until you also run **their**
  `dotnet ef database update`. After every pull, check `Program.cs` for `AddDbContext<...>()` lines
  you don't recognize, and run that module's migration too.
- **`dotnet new classlib` silently uses whatever SDK is installed on your machine.** If you only
  have .NET 8, it creates a net8.0 project even though this whole repo targets net10.0 — and
  everything downstream (NuGet restore, `dotnet sln add`) fails with confusing errors that don't
  mention .NET versions at all. Install the .NET 10 SDK before you start (`dotnet --list-sdks`
  should show `10.x`).
- **"More than one DbContext was found"** on any `dotnet ef` command → you forgot `--context
  <YourModule>DbContext`. The solution has multiple DbContexts; EF can't guess which one you mean.
- **No classic Swagger UI.** This repo uses .NET's newer `AddOpenApi()`/`MapOpenApi()`. The
  interactive docs page is `/scalar/v1`, not `/swagger`.
- **PRs go into `dev`, not `main`.** `dev` is our actual integration branch — see below.

---

## Member 1 — Weather Intelligence

**Owns:** `backend/Aegis.Weather/`, `react/src/features/weather/` (✅ completed),
`flutter/lib/features/weather/` (✅ completed), `agentic-ai/agents/weather_agent.py` +
`weather_agent_service.py`

**What this module does:** predicts three hazard types per district — **Flood, Strong Wind, and
Landslide** (landslide only for seeded landslide-prone hill districts) — using live Open-Meteo
forecast data compared against seeded historical thresholds. Deliberately excludes Drought (needs
long-term trend data, not a 3-day forecast) and Tsunami (a seismic phenomenon, not a weather one)
— both documented decisions, not gaps. Full detail in `docs/weather-module-notes.md`.

**Database entities:** District, HistoricalWeather, WeatherStation, WeatherObservation,
Prediction, WeatherAlert, ForecastHistory, AgentExecutionLog.

**Agent — Weather Prediction Agent (Assessor / Critic split):** given a district's forecast and historical thresholds, runs a **3-node LangGraph pipeline**: (1) Assessor LLM proposes risk probability, confidence, and recommended action per hazard; (2) Critic LLM independently checks for internal inconsistencies in the Assessor's output; (3) deterministic code gate applies confidence, anomaly, and critic-override rules before any alert is published. Critic disagreements produce auditable `flag_for_review` overrides, not silent failures. Every run emits a full `steps` trace (per-node timing, status, plain-English summary) returned in the API response, persisted to `AgentExecutionLogs`, and rendered in the React UI via `AgentTraceTimeline`. Built with LangGraph + Gemini (`gemini-2.5-flash-lite`, free tier).

**Third-party integration:** Open-Meteo API (free, no key required) for live weather forecasts.

**Runs independently?** Yes — this module has no hard dependency on the other three. All endpoints
(district baselines, live Open-Meteo forecasts, Agentic AI prediction, human-in-the-loop officer alert
review, and accuracy analytics) are live, fully functional, and secured with JWT role-based authorization.

---

## Member 2 — Incident & Rescue Operations

**Owns:** `backend/Aegis.Incident/`, `react/src/features/incident/`, `flutter/lib/features/incident/`,
`agentic-ai/agents/incident_agent.py`

**What this module does:** citizens report disasters (photo, GPS, description); the system
assesses severity and recommends a rescue response.

**Database entities:** Incident, Victim, Volunteer, RescueTeam, RescueMission, MissionLog,
DamageReport.

**Agent — Incident Assessment Agent:** given a citizen report, identifies disaster type,
estimates severity and affected population, recommends required rescue teams — officer reviews
and approves, mission is created.

**Runs independently?** Yes — a citizen can report an incident regardless of whether a weather
warning triggered it. No hard dependency on the Weather module.

---

## Member 3 — Resource & Logistics

**Owns:** `backend/Aegis.Resource/`, `react/src/features/resource/`, `flutter/lib/features/resource/`,
`agentic-ai/agents/resource_agent.py`

**What this module does:** manages warehouses, inventory and vehicles; plans how to dispatch
resources to a rescue mission.

**Database entities:** Warehouse, Inventory, Vehicle, Dispatch, ResourceRequest, Fuel, Delivery.

**Agent — Resource Allocation Agent:** given a resource need, finds warehouses with stock,
checks vehicles and road closures, calculates delivery routes, generates a dispatch plan —
manager approves, resources are dispatched.

**Runs independently?** Mostly — it can be built and demoed with mock resource requests before
Incident is finished. In the full end-to-end demo it consumes Incident's output, but that's a
later integration step, not a blocker for early development.

---

## Member 4 — Recovery & Community Support

**Owns:** `backend/Aegis.Recovery/`, `react/src/features/recovery/`, `flutter/lib/features/recovery/`,
`agentic-ai/agents/recovery_agent.py`

**What this module does:** manages shelters, aid requests, donations and post-disaster recovery
planning.

**Database entities:** Shelter, AidRequest, Donation, Compensation, RecoveryTask,
InfrastructureDamage, NGO, RecoveryReport.

**Agent — Recovery Planning Agent:** given damage reports, prioritizes infrastructure repairs,
allocates families to shelters, estimates budget, assigns NGOs — recovery officer approves.
**Status note:** entities, endpoints and migration are live; the actual agent reasoning is
currently a placeholder in `RecoveryAgentClientService.cs` (simulated, not yet calling
`recovery_agent.py`) — needs to be wired up the same way Weather's `WeatherAgentClient` calls its
Python service, for a real Agentic AI contribution.

**Runs independently?** Yes for early development (shelters, donations, aid requests all work
standalone). It naturally consumes Incident's damage data in the full workflow, same caveat as
Resource above.

---

## Shared files — edit with care

Changes here affect everyone, so keep edits additive (one line, one registration call) and flag
anything bigger in the group chat before merging:

- `backend/Aegis.Api/Program.cs`
- `backend/Aegis.Shared/`
- `react/src/shared/`, `react/src/App.tsx`
- `flutter/lib/shared/`, `flutter/lib/shared/router/app_router.dart`
- `agentic-ai/orchestrator/`
- `docker-compose.yml`

### Authentication & Role-Based Access Control (`Aegis.Shared`)

A centralized, JWT-based authentication system runs in the `auth` PostgreSQL schema (`AuthDbContext`):
- **Roles:** `Admin`, `DisasterOfficer`, `Responder`, `Citizen`.
- **Public Registration:** `POST /api/auth/register` strictly creates `Citizen` accounts. Staff roles are provisioned by Admins via `POST /api/auth/admin/users`.
- **Pre-Seeded Demo Accounts** (Password: `Aegis@123`):
  - `admin@aegis.lk` (`Admin`)
  - `officer@aegis.lk` (`DisasterOfficer`)
  - `responder@aegis.lk` (`Responder`)
  - `citizen@aegis.lk` (`Citizen`)
- **Quick Demo Login:** Both React (`http://localhost:3000`) and Flutter feature one-click demo login buttons for each role for instant testing and viva demonstrations.
- **Secret Storage:** `Jwt:SigningKey` is stored in `dotnet user-secrets` for `Aegis.Api`, never committed to git (satisfying Section 18.2).

---

## Branching & PR workflow

**Our integration branch is `dev`, not `main`.** Everything below targets `dev`.

**One branch per task, not one branch per person.** Each of us creates a new short-lived branch
for each chunk of work, merges it, deletes it, then starts the next one from an updated `dev`.
Nobody keeps a single branch open for their whole module across the whole project — small,
reviewable, frequently-merged branches are the actual industry standard (called "feature
branching"), and they also give much stronger individual Git-history evidence for the assignment
than one giant branch merged at the end.

**Branch naming:** `feature/<your-IT-ID>-<short-description>`

Examples: `feature/ITxxxxxxxx-incident-entities`, `feature/ITxxxxxxxx-incident-api`,
`feature/ITxxxxxxxx-incident-agent`.

Rule of thumb for branch size: if you can describe it in one sentence without using "and" more
than once, it's the right size. `ITxxxxxxxx-incident-entities` — good.
`ITxxxxxxxx-incident-everything` — split it up.

**ID → module mapping** (fill in once, keep here as the single source of truth):

| IT ID | Module |
|---|---|
| ITxxxxxxxx | Weather |
| ITxxxxxxxx | Incident |
| ITxxxxxxxx | Resource |
| ITxxxxxxxx | Recovery |

**The loop, every time:**

```powershell
git checkout dev
git pull
git checkout -b feature/<your-IT-ID>-<task>

# ... do the work, commit as you go ...

git add .
git commit -m "..."
git push -u origin feature/<your-IT-ID>-<task>
```

**If your branch runs more than a day or two, keep it updated with `dev`** so you're not
resolving a huge pile of conflicts at the end:

```powershell
git checkout dev
git pull
git checkout feature/<your-IT-ID>-<task>
git merge dev
```

Use `merge` here, not `rebase`. Rebase rewrites commit history, which causes real problems the
moment a branch has already been pushed and someone else might look at it (exactly our
situation, since branches get pushed for review) — merge is the safe, non-destructive option for
any branch that isn't purely local and private to you. If `git merge dev` shows a conflict, fix
the conflicting lines in the flagged files, then `git add .` and `git commit` to finish the merge.

**Before opening a PR, a quick self-check:**
- Does it build and run locally?
- Is it scoped to one task (not several unrelated changes bundled together)?
- PR description says *what* changed and *why*, not just "updates"
- Tests pass, if you've added any for this piece

Open a PR into **`dev`** on GitHub, get at least one review, merge it. Then clean up **both** the
local and the remote branch — GitHub's merge screen has a "Delete branch" button that does the
remote side for you, or do it manually:

```powershell
git checkout dev
git pull
git branch -d feature/<your-IT-ID>-<task>
git push origin --delete feature/<your-IT-ID>-<task>
```

- Keep commits scoped to your own module where possible — makes review and individual Git-history
  evidence (required for the assignment) much cleaner
- `dev` should always be in a working state — that's the point of small, frequently-merged
  branches instead of one long-lived branch per person
- `main` is reserved for the final, submitted state of the project — nobody pushes to it directly
  until the group agrees it's time to promote `dev` → `main` near the deadline

---

## Module boundaries & borders — full detail

### Member 1 — Weather module

**Owns, full stop:**
- Entities: `District`, `HistoricalWeather`, `WeatherStation`, `WeatherObservation`, `Prediction`, `WeatherAlert`, `ForecastHistory`, `AgentExecutionLog`
- Endpoints: `GET /api/weather/districts`, `GET /api/weather/districts/{id}/historical`, `GET /api/weather/forecast/{districtId}`, `POST /api/weather/predict/{districtId}`, `POST /api/weather/alerts/{id}/review` (✅ completed), `GET /api/weather/alerts` (✅ completed), `GET /api/weather/analytics/accuracy` (✅ completed), `GET /api/weather/agent-runs/{agentRunId}` (✅ completed)
- Agent: Weather Prediction Agent — input `{ districtName, isLandslideProne, forecastRainfallMm[], forecastWindKmh[], floodThresholdMm, landslideThresholdMm, windThresholdKmh }`, output `{ hazards: [{ hazardType, riskProbabilityPct, confidencePct, reasoningSummary, recommendedAction }] }` — one entry per relevant hazard (Flood + StrongWind always; Landslide only if the district is landslide-prone)
- Third-party call: Open-Meteo API — this integration lives entirely inside this module, nobody else touches it
- React: forecast dashboard, prediction graphs, alert review queue, prediction history, analytics dashboard (✅ completed)
- Flutter: current weather screen, rain/wind/landslide alerts, district search & forecast, review queue (✅ completed)

**Explicitly NOT this module's job:**
- Deciding what a citizen does with a warning (that's Incident's UI choice, not Weather's)
- Anything with GPS-tagged reports or photos — that's a citizen report, not a forecast
- No `Incident`, `RescueMission`, or any other module's table gets touched, read, or joined against, ever

**Borders:**
- Outbound only, and it's soft. Weather may optionally expose `GET /api/weather/alerts?district=X` for another module's UI to display — e.g. Incident's report screen might show "active alert in this district" as read-only context. That's the entire relationship. No other module's logic depends on Weather having run.
- Nothing flows in. Weather never calls another module's API and never reads another module's data.

**The exact line:** if you find yourself writing code in the Weather module that creates an `Incident`, or code in Incident that reads `WeatherObservation` rows directly from the database — stop, that's the border being crossed wrong. The only legal crossing is an HTTP GET to Weather's own alerts endpoint.

---

### Member 2 — Incident module

**Owns, full stop:**
- Entities: `Incident`, `Victim`, `Volunteer`, `RescueTeam`, `RescueMission`, `MissionLog`, `DamageReport`
- Endpoints: `POST /api/incidents`, `GET /api/incidents`, `POST /api/incidents/{id}/assess`, `POST /api/incidents/{id}/approve`, `POST /api/incidents/{id}/damage-report`
- Agent: Incident Assessment Agent — input `{ disasterType, severityReported, description, location }`, output `{ severityAssessed, teamsRequired, recommendation }`
- React: incident dashboard, approve/reject controls, mission tracking
- Flutter: report-disaster form (photo, GPS, description — this is your device-feature requirement), SOS button, track-rescue-team screen

**Explicitly NOT this module's job:**
- Actually sourcing food/water/vehicles/boats — you decide how many teams are needed, Resource decides how to get them there
- Managing shelters or long-term recovery — once the mission is done and damage is logged, your module's involvement ends
- Reading Weather's tables directly to "check if there's a warning" — if you want that context, call Weather's API, don't touch its DB

**Borders:**
- Inbound (optional): you may call `GET /api/weather/alerts?district=X` purely to show context on the report screen. Nothing in your agent logic should require this to succeed — if that call fails or Weather isn't built yet, your module still works.
- Outbound to Resource (hard border, you own this contract): the moment an officer approves a mission, you POST to Resource:
```
  POST /api/resource/dispatch-requests
  { "missionId": "...", "teamsRequired": 3, "location": { "lat": ..., "lng": ... } }
```
  You send exactly this — not the citizen's photo, not the full description, not victim names. Resource has no business seeing that.
- Outbound to Recovery (hard border): once damage is logged and the incident closes, Recovery pulls:
```
  GET /api/incident/{id}/damage-report
  → { "incidentId": "...", "housesDamaged": 40, "displacedFamilies": 120, "infrastructureDamage": [...] }
```
  You expose this endpoint; Recovery calls it, not the other way around.

**The exact line:** your module's responsibility ends the moment you've told Resource "here's what's needed and where," and ends again the moment you've told Recovery "here's what got damaged." You never plan a dispatch route and you never allocate a shelter — those verbs belong to your neighbors.

---

### Member 3 — Resource module

**Owns, full stop:**
- Entities: `Warehouse`, `Inventory`, `Vehicle`, `Dispatch`, `ResourceRequest`, `Fuel`, `Delivery`
- Endpoints: `POST /api/resource/dispatch-requests`, `GET /api/resource/dispatch/{id}`, `POST /api/resource/dispatch/{id}/approve`, `GET /api/resource/inventory`
- Agent: Resource Allocation Agent — input `{ missionId, teamsRequired, location }`, output `{ dispatchPlan, estimatedArrival }`
- Third-party call: Maps/routing API for road closures and route calculation — lives here, nowhere else
- React: warehouse/inventory/dispatch dashboards
- Flutter: delivery tracking, QR delivery confirmation

**Explicitly NOT this module's job:**
- Deciding whether a rescue mission is needed — that decision was already made and approved by the time you see a `missionId`
- Knowing anything about the citizen, the incident description, or victims — you only ever see `missionId + teamsRequired + location`
- Allocating displaced families to shelters — that's a different kind of "allocation," owned by Recovery

**Borders:**
- Inbound from Incident (hard border, you're the receiver): you implement `POST /api/resource/dispatch-requests` exactly as Incident's contract above. Your agent starts here — this is your trigger, you don't poll or watch for incidents yourself.
- Nothing flows onward to Recovery. This is a common mistake to avoid: it feels natural to think "Resource dispatches supplies, so Resource should also handle post-disaster resource needs for recovery" — it shouldn't. Recovery gets its information from Incident's damage report, not from you. If Recovery genuinely needs to request more supplies during rebuilding, that's a new `ResourceRequest` coming through your same public endpoint, initiated by Recovery's officer through normal UI action — not a special direct pipe between your two modules.

**The exact line:** your module starts at "here's a mission that needs resources" and ends at "resources have been dispatched, here's an ETA." You never touch a `RescueMission` row and you never look ahead to what happens after delivery.

---

### Member 4 — Recovery module

**Owns, full stop:**
- Entities: `Shelter`, `AidRequest`, `Donation`, `Compensation`, `RecoveryTask`, `InfrastructureDamage`, `NGO`, `RecoveryReport`
- Endpoints: `GET /api/recovery/plan/{incidentId}`, `POST /api/recovery/shelters`, `POST /api/recovery/aid-requests`, `POST /api/recovery/plan/{id}/approve`
- Agent: Recovery Planning Agent — input `{ incidentId, damageReport }`, output `{ recoveryPlan, shelterAllocations, budgetEstimate }`
- React: shelter/donation/compensation dashboards
- Flutter: find-shelter, request-aid, donate, report-damage screens

**Explicitly NOT this module's job:**
- Anything before the incident closes — you don't assess severity, you don't approve missions, you don't know about rescue teams at all
- Dispatch logistics — if a shelter needs supplies, that's Resource's `ResourceRequest` flow, not something you build a parallel version of

**Borders:**
- Inbound from Incident (hard border): you call `GET /api/incident/{id}/damage-report` when an incident closes. This is the only data you pull from another module — everything else in your workflow (shelters, donations, budget) is entirely your own domain.
- Nothing flows onward — Recovery is the end of the chain. No module downstream of you needs anything you produce.

**The exact line:** you only ever look backward to Incident's damage report, never sideways to Resource, never forward to anything (there's nothing after you).

---

## Running the project locally

There's no `docker-compose.yml` yet (still on the group's to-do list) — for now, everyone runs
PostgreSQL locally themselves. This is the current, actually-working setup:

1. Install .NET 10 SDK (`dotnet --list-sdks` must show `10.x`) — the whole solution targets net10.0.
2. Install PostgreSQL (pgAdmin4 is fine) and create one database, e.g. `aegis_lk`.
3. Set your connection string via user-secrets — **do not** edit `appsettings.Development.json`,
   it's a shared file reserved for the eventual `docker-compose.yml` setup:
```powershell
   cd backend/Aegis.Api
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=aegis_lk;Username=postgres;Password=YOUR_PASSWORD"
```
4. Run the API:
```powershell
   cd backend
   dotnet run --project Aegis.Api
```
   API docs UI: `http://localhost:5012/scalar/v1` — this repo uses .NET's newer `AddOpenApi()`/
   `MapOpenApi()`, **not classic Swagger**, so there's no `/swagger` page.
5. Each module owns its own DbContext and migrations — always specify `--context` on `dotnet ef`
   commands:
```powershell
   dotnet ef migrations add <Name> --project Aegis.<YourModule> --startup-project Aegis.Api --context <YourModule>DbContext
   dotnet ef database update --project Aegis.<YourModule> --startup-project Aegis.Api --context <YourModule>DbContext
```
6. **If your module has a Python agent** (FastAPI + LangGraph), run it as its own loopback-only
   process, called internally by `Aegis.Api` — never by React/Flutter directly. Port convention so
   we don't collide:
   - **Weather Agent:** `http://127.0.0.1:8001` (Member 1 — active)
   - **Incident Agent:** `http://127.0.0.1:8002` (Member 2 — upcoming)
   - **Resource Agent:** `http://127.0.0.1:8003` (Member 3 — upcoming)
   - **Recovery Agent:** `http://127.0.0.1:8004` (Member 4 — upcoming)

   To run an agent service:
```powershell
cd agentic-ai/agents
uvicorn <your>_agent_service:app --host 127.0.0.1 --port 800X
```
   Free-tier Gemini (`gemini-2.5-flash-lite` via `langchain-google-genai`) is the recommended model
   for any agent.

7. **React Web Frontend:**
```powershell
cd react
npm install
npm run dev
```
   Runs at `http://localhost:3000`. Quick demo login buttons are available on the login page.

8. **Flutter Mobile & Web Client:**
```powershell
cd flutter
flutter pub get
flutter run -d chrome            # Run in Chrome Web
# or
flutter run -d emulator-5554     # Run on Android Emulator
```
   See `flutter/README.md` for full mobile architecture and emulator network configuration.

---

## Team Member Implementation Guide & Upcoming Tasks

This section outlines what has been completed and provides a step-by-step roadmap for **Member 2**, **Member 3**, and **Member 4** to build out their respective modules.

### Current System Status & Completed Foundation

1. **Backend & Architecture:**
   - Modular monolith setup with shared JWT authentication (`AuthDbContext`, `Aegis.Shared`).
   - Role-Based Access Control (`Admin`, `DisasterOfficer`, `Responder`, `Citizen`) with pre-seeded demo accounts.
   - Swagger replacement with interactive OpenAPI documentation at `http://localhost:5012/scalar/v1`.

2. **Weather Intelligence Module (Member 1 — Complete):**
   - Live Open-Meteo weather forecast integration across all 25 Sri Lanka districts.
   - 3-node LangGraph Agentic AI pipeline: Assessor LLM (`assess_hazards`), Critic LLM (`critique_assessment`), and deterministic code gate (`validate_and_decide`).
   - Per-node execution audit traces saved in `AgentExecutionLogs` and rendered in React via `AgentTraceTimeline`.
   - Officer Alert Review Queue, Accuracy Analytics dashboard, and real published alerts broadcast to both React and Flutter homepages.

3. **Client Applications (React & Flutter):**
   - **React Frontend:** Full Weather dashboard, prediction history, alert review queue, accuracy analytics, dark mode UI with high-contrast styling.
   - **Flutter Mobile/Web:** Complete application shell (`MainShell`), shared theme (`AegisTheme`), centralized auth (`AuthProvider`), and a comprehensive Homepage featuring Sri Lanka emergency hotlines (117 / 119 / 110), live alert carousel, 25-district risk matrix, and capability routing.

---

### Member 2 — Incident & Rescue Operations Roadmap

**Goal:** Citizens report incidents (with camera photo & GPS coordinates); AI assesses severity and required teams; Disaster Officers review and dispatch rescue missions; missions trigger Resource dispatch.

#### 1. Backend (`backend/Aegis.Incident/`)
- [ ] Implement EF Core entities: `Incident`, `Victim`, `Volunteer`, `RescueTeam`, `RescueMission`, `MissionLog`, `DamageReport`.
- [ ] Implement endpoints:
  - `POST /api/incidents`: Citizen submits incident report (type, description, lat/lng, photo URL).
  - `GET /api/incidents`: List active incidents (filter by status: `Reported`, `Assessed`, `Dispatched`, `Resolved`).
  - `POST /api/incidents/{id}/assess`: Calls `incident_agent.py` to assess severity and calculate `teamsRequired`.
  - `POST /api/incidents/{id}/approve`: Officer approves mission, changes status to `Dispatched`, and invokes the outbound call to Resource module:
    ```http
    POST /api/resource/dispatch-requests
    { "missionId": "...", "teamsRequired": 3, "location": { "lat": 6.9271, "lng": 79.8612 } }
    ```
  - `GET /api/incident/{id}/damage-report`: Read endpoint exposed for Member 4 (Recovery) after incident closure.

#### 2. Agentic AI (`agentic-ai/agents/incident_agent.py`)
- [ ] Create `incident_agent.py` and `incident_agent_service.py` running on **port 8002**.
- [ ] Input schema: `{ disasterType, severityReported, description, location }`.
- [ ] Output schema: `{ severityAssessed: "Low"|"Medium"|"High"|"Critical", teamsRequired: int, recommendedEquipment: string[], reasoning: string }`.
- [ ] Use LangGraph with validation guardrails (ensure teams required is positive and bounded).

#### 3. React Frontend (`react/src/features/incident/`)
- [ ] Incident management dashboard: table of incoming reports with severity badges.
- [ ] Incident detail view with map location, citizen description, and AI recommended response.
- [ ] Officer approval/rejection buttons to trigger rescue missions.

#### 4. Flutter Mobile App (`flutter/lib/features/incident/`)
- [ ] Implement `screens/report_incident_screen.dart`:
  - Camera/Photo capture via `image_picker`.
  - GPS coordinate capture via `geolocator`.
  - Form validation and submission to `POST /api/incidents`.
- [ ] Implement `screens/sos_emergency_screen.dart`: 1-tap emergency SOS broadcast with current GPS coordinates.
- [ ] Implement `screens/incident_list_screen.dart` and `screens/incident_assessment_screen.dart`.

---

### Member 3 — Resource & Logistics Roadmap

**Goal:** Receive dispatch requests from Incident missions, allocate warehouse inventory and response vehicles, calculate delivery routes, and track fulfillment.

#### 1. Backend (`backend/Aegis.Resource/`)
- [ ] Implement EF Core entities: `Warehouse`, `Inventory`, `Vehicle`, `Dispatch`, `ResourceRequest`, `Fuel`, `Delivery`.
- [ ] Implement endpoints:
  - `POST /api/resource/dispatch-requests`: Inbound receiver contract from Member 2's Incident module.
  - `GET /api/resource/dispatch/{id}`: Fetch dispatch plan details.
  - `POST /api/resource/dispatch/{id}/approve`: Logistics manager approves dispatch plan and reserves inventory/vehicle.
  - `GET /api/resource/inventory`: Current stock levels across Sri Lanka warehouses.
  - `POST /api/resource/delivery/{id}/confirm`: Confirm arrival of resources at mission site.

#### 2. Agentic AI (`agentic-ai/agents/resource_agent.py`)
- [ ] Create `resource_agent.py` and `resource_agent_service.py` running on **port 8003**.
- [ ] Input schema: `{ missionId, teamsRequired, location: { lat, lng } }`.
- [ ] Output schema: `{ warehouseId, allocatedItems: [{ itemName, quantity }], vehicleId, routeSummary, estimatedArrivalMinutes }`.
- [ ] Check stock availability before recommending allocation.

#### 3. React Frontend (`react/src/features/resource/`)
- [ ] Warehouse & Inventory Dashboard: visual bars showing stock of food rations, medical kits, water, and boats.
- [ ] Dispatch Plan Review: map showing origin warehouse, destination mission, and allocated resources.
- [ ] Vehicle Fleet tracking table with status tags (`Available`, `EnRoute`, `Maintenance`).

#### 4. Flutter Mobile App (`flutter/lib/features/resource/`)
- [ ] Implement `screens/warehouse_inventory_screen.dart`: Stock browser for field officers.
- [ ] Implement `screens/dispatch_plan_screen.dart`: Review and confirm outbound dispatches.
- [ ] Implement `screens/delivery_qr_screen.dart`: QR code scanner or confirmation code entry for field responders verifying delivery.

---

### Member 4 — Recovery & Community Support Roadmap

**Goal:** Citizens find emergency shelters and submit aid requests; Recovery Officers coordinate post-disaster infrastructure repair, donations, and long-term aid using damage reports from closed incidents.

#### 1. Backend (`backend/Aegis.Recovery/`)
- [ ] Implement EF Core entities: `Shelter`, `AidRequest`, `Donation`, `Compensation`, `RecoveryTask`, `InfrastructureDamage`, `NGO`, `RecoveryReport`.
- [ ] Implement endpoints:
  - `POST /api/recovery/shelters` & `GET /api/recovery/shelters`: Shelter locations, capacity, and current occupancy.
  - `POST /api/recovery/aid-requests` & `GET /api/recovery/aid-requests`: Citizens request emergency aid (food, medicine, shelter).
  - `POST /api/recovery/donations`: Public donations recording.
  - `GET /api/recovery/plan/{incidentId}`: Ingests damage report from Incident module (`GET /api/incident/{id}/damage-report`) and generates recovery plan.
- [ ] Connect `RecoveryAgentClientService.cs` to real Python service instead of simulated placeholders.

#### 2. Agentic AI (`agentic-ai/agents/recovery_agent.py`)
- [ ] Create `recovery_agent.py` and `recovery_agent_service.py` running on **port 8004**.
- [ ] Input schema: `{ incidentId, damageReport: { housesDamaged, displacedFamilies, infrastructureDamage } }`.
- [ ] Output schema: `{ recoveryPlanSummary, shelterAllocations, estimatedBudgetLkr, prioritizedTasks: string[] }`.

#### 3. React Frontend (`react/src/features/recovery/`)
- [ ] Shelter Capacity Dashboard: real-time occupancy meters.
- [ ] Aid Request review queue with status toggles (`Pending`, `Approved`, `Dispatched`).
- [ ] Recovery plan visualization showing damage metrics and allocated budgets.

#### 4. Flutter Mobile App (`flutter/lib/features/recovery/`)
- [ ] Wire existing scaffolded screens in `flutter/lib/features/recovery/screens/`:
  - `shelter_finder_screen.dart`: Display real shelters from `GET /api/recovery/shelters`.
  - `aid_request_screen.dart`: Connect form to `POST /api/recovery/aid-requests`.
  - `donate_screen.dart`: Public donation intake.
  - `citizen_damage_report_screen.dart`: Citizen post-disaster damage filing.

---

### Cross-Module Integration Contracts & Data Flows

The platform's end-to-end workflow connects the 4 modules in a clean sequence:

```
[1. Weather Warning] (Member 1)
        ↓ (Optional read context: GET /api/weather/alerts)
[2. Incident Occurs & Reported] (Member 2)
        ↓ Officer approves mission
        → POST /api/resource/dispatch-requests (Hard contract to Member 3)
[3. Resource Allocation & Dispatch] (Member 3)
        ↓ Rescue completed & incident closed
        → GET /api/incident/{id}/damage-report (Hard contract from Member 4)
[4. Recovery & Shelter Management] (Member 4)
```

**Key API Contracts to adhere to:**
1. **Incident → Resource:**
   ```json
   POST /api/resource/dispatch-requests
   {
     "missionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
     "teamsRequired": 3,
     "location": { "latitude": 6.9271, "longitude": 79.8612 }
   }
   ```
2. **Incident → Recovery:**
   ```json
   GET /api/incident/{id}/damage-report
   {
     "incidentId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
     "housesDamaged": 24,
     "displacedFamilies": 85,
     "infrastructureDamage": ["Bridge collapsed", "Road submerged"]
   }
   ```

---

### Flutter Development Guide for Team Members

When adding your screens and features to Flutter:

1. **Follow the Folder Structure:**
   Create your code in `flutter/lib/features/<your-module>/`:
   - `models/`: Dart data classes with `fromJson` and `toJson`.
   - `services/`: HTTP client methods calling `http://localhost:5012/api/<your-module>`.
   - `screens/`: UI pages using Flutter `StatelessWidget` / `StatefulWidget`.

2. **Use Shared Design Tokens (`AegisTheme`):**
   ```dart
   import 'package:aegis_lk/shared/theme/aegis_theme.dart';

   // Backgrounds & Cards
   color: kCardBg,
   border: Border.all(color: kBorder),

   // Accent Colors
   kPrimary      // Cyan accent (0xFF06B6D4)
   kIndigo       // Indigo accent (0xFF6366F1)
   kStatusRed    // Critical/Emergency (0xFFEF4444)
   kStatusGreen  // Operational/Safe (0xFF10B981)
   ```

3. **Access User Role & JWT Token:**
   ```dart
   import 'package:provider/provider.dart';
   import 'package:aegis_lk/shared/auth/auth_provider.dart';

   final auth = Provider.of<AuthProvider>(context, listen: false);
   final token = auth.token;          // Pass in 'Authorization': 'Bearer $token'
   final isOfficer = auth.isOfficerOrAdmin;
   ```

4. **Register Routes:**
   - Add your route constants to `flutter/lib/shared/router/app_router.dart`.
   - Add your module tab to `flutter/lib/shared/shell/main_shell.dart`.

5. **Running Locally:**
   - Web: `flutter run -d chrome` (connects to `localhost:5012`).
   - Android Emulator: `flutter run -d emulator-5554` (use `10.0.2.2:5012`).
   - Quick Demo Login: Use the pre-seeded buttons on the login screen (`officer@aegis.lk`, `citizen@aegis.lk`, etc.).