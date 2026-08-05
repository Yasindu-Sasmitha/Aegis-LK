# Aegis-LK

Intelligent Disaster Prediction, Response and Recovery Platform for Sri Lanka.

A single deployable system — one ASP.NET Core Web API, one PostgreSQL database, one React app,
one Flutter app — organized as a **modular monolith** so four people can build independently
without merge conflicts, while the final product ships as one integrated application.

## Jump to your section

- [How this repo is organized](#how-this-repo-is-organized)
- [Member 1 — Weather Intelligence](#member-1--weather-intelligence)
- [Member 2 — Incident & Rescue Operations](#member-2--incident--rescue-operations)
- [Member 3 — Resource & Logistics](#member-3--resource--logistics)
- [Member 4 — Recovery & Community Support](#member-4--recovery--community-support)
- [Shared files — edit with care](#shared-files--edit-with-care)
- [Branching & PR workflow](#branching--pr-workflow)
- [Running the project locally](#running-the-project-locally)

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

## Member 1 — Weather Intelligence

**Owns:** `backend/Aegis.Weather/`, `react/src/features/weather/`, `flutter/lib/features/weather/`,
`agentic-ai/agents/weather_agent.py`

**What this module does:** predicts severe weather and issues early warnings for a district.

**Database entities:** WeatherStation, WeatherObservation, HistoricalWeather, Prediction,
ForecastHistory, WeatherAlert.

**Agent — Weather Prediction Agent:** given a district, collects historical + regional weather
data, runs a prediction model, calculates a confidence score, requests officer review if
confidence is low, generates an early warning.

**Third-party integration:** Open-Meteo API (free, no key required) for live/historical weather.

**Runs independently?** Yes — this module has no hard dependency on the other three. It produces
warnings that *other* modules (like Incident) can optionally consume, but it doesn't need
anything from them to function or be demoed on its own.

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

---

## Branching & PR workflow

**One branch per task, not one branch per person.** Each of us creates a new short-lived branch
for each chunk of work, merges it, deletes it, then starts the next one from an updated `main`.
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
git checkout main
git pull
git checkout -b feature/<your-IT-ID>-<task>

# ... do the work, commit as you go ...

git add .
git commit -m "..."
git push -u origin feature/<your-IT-ID>-<task>
```

**If your branch runs more than a day or two, keep it updated with `main`** so you're not
resolving a huge pile of conflicts at the end:

```powershell
git checkout main
git pull
git checkout feature/<your-IT-ID>-<task>
git merge main
```

Use `merge` here, not `rebase`. Rebase rewrites commit history, which causes real problems the
moment a branch has already been pushed and someone else might look at it (exactly our
situation, since branches get pushed for review) — merge is the safe, non-destructive option for
any branch that isn't purely local and private to you. If `git merge main` shows a conflict, fix
the conflicting lines in the flagged files, then `git add .` and `git commit` to finish the merge.

**Before opening a PR, a quick self-check:**
- Does it build and run locally?
- Is it scoped to one task (not several unrelated changes bundled together)?
- PR description says *what* changed and *why*, not just "updates"
- Tests pass, if you've added any for this piece

Open a PR into `main` on GitHub, get at least one review, merge it. Then clean up **both** the
local and the remote branch — GitHub's merge screen has a "Delete branch" button that does the
remote side for you, or do it manually:

```powershell
git checkout main
git pull
git branch -d feature/<your-IT-ID>-<task>
git push origin --delete feature/<your-IT-ID>-<task>
```

- Keep commits scoped to your own module where possible — makes review and individual Git-history
  evidence (required for the assignment) much cleaner
- `main` should always be in a working state — that's the point of small, frequently-merged
  branches instead of one long-lived branch per person

---

---

## Module boundaries & borders — full detail

### Member 1 — Weather module

**Owns, full stop:**
- Entities: `WeatherStation`, `WeatherObservation`, `HistoricalWeather`, `Prediction`, `ForecastHistory`, `WeatherAlert`
- Endpoints: `GET /api/weather/forecast/{district}`, `POST /api/weather/predict`, `GET /api/weather/alerts`, `GET /api/weather/history/{district}`
- Agent: Weather Prediction Agent — input `{ district }`, output `{ floodProbability, confidence, alert? }`
- Third-party call: Open-Meteo API — this integration lives entirely inside this module, nobody else touches it
- React: forecast dashboard, prediction graphs, alert list
- Flutter: current weather screen, rain alerts, district search

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

## Running the project locally

_(fill in once docker-compose and the API host are set up)_

```
docker-compose up
```

- API: `http://localhost:5000/swagger`
- React: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
