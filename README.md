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

## Running the project locally

_(fill in once docker-compose and the API host are set up)_

```
docker-compose up
```

- API: `http://localhost:5000/swagger`
- React: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
