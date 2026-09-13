# Aegis.Incident — Incident & Rescue Operations Module

Owns citizen disaster reports, automated screening (plausibility + deduplication),
officer assessment/approval workflow, and damage reporting. See `INCIDENT_MODULE_PLAN.md`
(project root) for the original design rationale and build history.

**Owner:** Student IT24100876, Member 2 of 4.

---

## 1. What this module does

A citizen reports a disaster (flood, landslide, etc.) with a description, GPS location, and
optional photo. Two AI agents run automatically and silently in the background the moment the
report is created — one screens it for plausibility, one checks whether it's a duplicate of an
event someone else already reported. An officer then reviews the (deduplicated, screened) queue,
triggers a third AI agent to assess severity and recommend a response, and gives the human
approval required before a rescue mission is created. Once the mission concludes, the officer
logs damage, which becomes available to the Recovery module.

## 2. Endpoints

Base route `/api/incidents` (plural). One exception below uses singular `/api/incident` —
this is a deliberate, contract-verified match to how the Recovery module calls it.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/incidents` | List all **primary** incidents (duplicates hidden — see §5) |
| GET | `/api/incidents/{id}` | Single incident, full detail |
| GET | `/api/incidents/nearby?lat=&lng=&radiusKm=&hours=` | Internal — used by the Dedup Agent's `search_nearby_incidents` tool |
| GET | `/api/incidents/{id}/related-reports` | Duplicate reports linked to a primary incident |
| POST | `/api/incidents` | Citizen creates a report. Triggers the Plausibility and Dedup agents in the background (non-blocking) |
| POST | `/api/incidents/{id}/photo` | Attach a photo (multipart/form-data, field name `file`) — uploads to Cloudinary, stores the public URL |
| POST | `/api/incidents/{id}/assess` | Officer-triggered — calls the Assessment Agent, stores `severityAssessed`, `teamsRequired`-derived recommendation |
| POST | `/api/incidents/{id}/approve` | Officer approves, creates a `RescueMission` (the required human-approval gate) |
| POST | `/api/incidents/{id}/damage-report` | Closes the incident, records damage. Deliberately **not** agentic — see §6 |
| GET | `/api/incident/{id}/damage-report` | **Singular "incident"** — cross-module contract Recovery pulls from |

## 3. The three agents

Each has a distinct responsibility, a defined input/output contract, and its own controlled
tool permissions, per the assignment's requirement that agents be genuinely separate rather than
the same prompt renamed.

### 3a. Assessment Agent — Pattern A (structured output)
- **File:** `agentic-ai/agents/incident_agent.py` + `incident_agent_service.py`
- **Trigger:** officer clicks "Assess" → `POST /{id}/assess`
- **Model:** Gemini via LangGraph, structured output (`IncidentAssessment` schema), retry-once
- **Input:** disasterType, severityReported, description, lat/lng (all already on the record —
  no external data needed, which is why this doesn't need tool-calling)
- **Output:** `severityAssessed` (Low/Medium/High/Critical), `teamsRequired`, `recommendation`
- **Deterministic safety net:** Critical severity is code-side floored to at least 3 teams,
  regardless of what the model says
- **Failure mode:** if the agent service is unreachable, `/assess` returns `502` and logs the
  failure to `MissionLog` — never crashes, never silently succeeds with fake data

### 3b. Plausibility Agent — Pattern B (genuine tool-calling)
- **File:** `agentic-ai/agents/incident_plausibility_agent.py`
- **Trigger:** automatic, fires as a background task the instant `POST /api/incidents` succeeds
  — the citizen's `201` response never waits for this
- **Framework:** LangGraph's `create_react_agent` — the LLM itself decides which tools to call
  and when, not a fixed fetch-then-prompt sequence
- **Tools:**
  - `get_weather(district)` — calls Open-Meteo directly (an independent third-party
    integration, not a call into the Weather module) for the last 48h rainfall
  - `get_upstream_districts(district)` — a small hardcoded lookup table of major Sri Lankan
    districts and their known upstream neighbours
  - `analyze_image(photo_url, ...)` — Gemini vision, only offered as a tool when the incident
    actually has a photo
- **Key design decision:** Sri Lankan floods are frequently river-driven — heavy rain in an
  upstream district can flood a downstream one with zero local rainfall. The agent decides
  *for itself*, mid-reasoning, whether to widen its search to an upstream district — this only
  happens for Flood reports where local rainfall is low. Landslide/other types stay local-only,
  since those are soil-saturation driven and genuinely local.
- **Output:** `plausibilityScore` (0-100) + `plausibilityReasoning` (the actual reasoning
  trail, naming which checks it made). **Never a hard pass/fail** — always a soft signal for
  officer attention, since single-point weather data is known to be an unreliable signal on
  its own (that's the whole reason the upstream logic exists).
- **Honesty constraint:** this is plausibility *screening*, not hoax or deepfake detection. It
  catches obvious inconsistencies, not sophisticated fakes — documented here explicitly because
  overclaiming this at viva is a real risk.

### 3c. Dedup/Clustering Agent — Pattern B (genuine tool-calling)
- **File:** `agentic-ai/agents/incident_dedup_agent.py`
- **Trigger:** automatic, fires concurrently alongside the Plausibility Agent on report creation
- **Tools:**
  - `search_nearby_incidents(lat, lng, radius_km, hours)` — calls back into **this module's
    own** `GET /api/incidents/nearby` endpoint over HTTP, rather than querying Postgres
    directly from Python. This keeps all data access in one place (the C# API), matching the
    project's rule that Python agents call into ASP.NET Core rather than around it.
  - `compare_reports(report_a, report_b, disaster_type)` — one focused LLM call per candidate,
    not a single giant batch comparison
- **Key design decision:** the agent picks its own search radius and time window based on
  disaster type (wider for Flood, tighter for Landslide) rather than one fixed value hardcoded
  for every case.
- **Output:** either "new distinct incident" or a matched primary incident ID + confidence +
  reasoning. If matched, the new report's `LinkedIncidentId` is set, pointing at the primary.
  A safety check prevents chaining — a report is never linked to an incident that is itself
  already a duplicate.

## 4. Database fields added beyond the original model

| Field | Type | Set by |
|---|---|---|
| `SeverityAssessed` | string, nullable | Assessment Agent |
| `PhotoUrl` | string, nullable | Photo upload endpoint (Cloudinary URL) |
| `PlausibilityScore` | int, nullable | Plausibility Agent (background) |
| `PlausibilityReasoning` | string, nullable | Plausibility Agent (background) |
| `LinkedIncidentId` | Guid, nullable, self-referencing FK | Dedup Agent (background) |

`LinkedIncidentId` uses `ON DELETE RESTRICT` — deleting a primary incident is blocked rather
than cascading or silently orphaning its linked duplicates.

## 5. How deduplication affects the officer's queue

`GET /api/incidents` returns **primaries only** (`LinkedIncidentId == null`). Nothing is ever
deleted or hidden permanently — duplicate reports remain fully queryable via
`GET /api/incidents/{primaryId}/related-reports`, so an officer investigating one incident can
still see every citizen report that contributed to it.

## 6. Deliberately NOT agentic — and why

`POST /{id}/damage-report` stays a plain administrative endpoint. The officer already knows the
real numbers firsthand from running the mission — there's no ambiguity or judgment call an
agent would meaningfully add. Forcing AI in here would dilute an otherwise well-justified
three-agent story and invites a fair "why does an agent need to type in a number the officer
already knows?" question at viva. The closest legitimate AI opportunity near this data
(estimating repair costs/priority from damage descriptions) already belongs to Recovery's own
agent.

## 7. Required local secrets

Set via `dotnet user-secrets` in `backend/Aegis.Api/` (never committed — each developer sets
their own):

```powershell
cd backend/Aegis.Api
dotnet user-secrets set "Cloudinary:CloudName" "<your_cloud_name>"
dotnet user-secrets set "Cloudinary:ApiKey" "<your_api_key>"
dotnet user-secrets set "Cloudinary:ApiSecret" "<your_api_secret>"
```

Get these from a free account at https://cloudinary.com/users/register/free — Dashboard →
"Go to API Keys". Free tier (25GB storage/bandwidth) is more than sufficient.

### Why Cloudinary, not local disk

Local static-file storage (e.g. saving to `wwwroot/uploads/`) would break on redeployment —
most free/student-tier cloud hosts use ephemeral or container-based filesystems, so anything
written to local disk is lost on restart, and may not even be shared across instances.
Cloudinary gives a genuinely permanent, publicly-fetchable URL regardless of where or how many
times the API is deployed. This also satisfies the assignment's third-party service integration
requirement.

## 8. Running the agent services locally

All three Python agents are served by one FastAPI app on port `8002`:

```powershell
cd agentic-ai/agents
# copy .env.example -> .env, fill in GOOGLE_API_KEY (Google AI Studio, free tier)
# current working model: gemini-3.5-flash-lite (gemini-2.5-flash-lite is deprecated
# for new API keys as of Sep 2026 — .env.example reflects the current name)
uvicorn incident_agent_service:app --host 127.0.0.1 --port 8002
```

Routes exposed: `POST /assess`, `POST /plausibility`, `POST /dedup`, `GET /health`.

`Aegis.Api` registers three separate `HttpClient`s (`IncidentAgentClient`,
`IncidentPlausibilityAgentClient`, `IncidentDedupAgentClient`), all pointed at
`http://127.0.0.1:8002` — same service, different routes.

**If this service isn't running:** `/assess` degrades gracefully (502, logged). The background
Plausibility/Dedup checks fail silently and log to `MissionLog` rather than crashing report
creation — a citizen can always submit a report even if the AI layer is down.

## 9. Full local setup checklist

1. .NET 10 SDK, PostgreSQL running locally
2. `dotnet user-secrets set "ConnectionStrings:DefaultConnection" "..."` in `Aegis.Api`
3. Cloudinary secrets (see §7)
4. Apply migrations: `dotnet ef database update --project Aegis.Incident --startup-project Aegis.Api --context IncidentDbContext`
   (also apply Weather/Recovery/Shared's own migrations if starting fresh — see project root README)
5. `agentic-ai/agents/.env` with `GOOGLE_API_KEY` and `CHAT_MODEL=gemini-3.5-flash-lite`
6. Run both processes: `dotnet run --project Aegis.Api` (port 5012) and
   `uvicorn incident_agent_service:app --host 127.0.0.1 --port 8002`
7. Test via Scalar at `http://localhost:5012/scalar/v1` (not `/swagger`)

## 10. Testing evidence

Each agent was verified at three levels before merging:
1. **Standalone** — running the `.py` file directly (`python incident_agent.py`, etc.),
   confirming real Gemini/tool output
2. **HTTP** — via `curl.exe` against the FastAPI service directly
3. **Full end-to-end** — through the actual C# endpoint in Scalar, confirming the whole chain
   (citizen request → C# → Python agent → Gemini/tools → back through C# → Postgres) works
   together, including the fire-and-forget background triggering for Plausibility and Dedup

## 11. Explicitly deferred (correctly, not a gap)

- **Rescue mission ETA** — belongs to the Resource module's agent output, not this module's.
- **Outbound POST to Resource on mission approval** — stubbed as a TODO comment in
  `POST /{id}/approve`, wrapped so approval still succeeds standalone since Resource doesn't
  exist yet in the repo.
- **Role-based authorization on these endpoints** — JWT auth now exists project-wide; applying
  `[Authorize(Roles = "...")]` to these specific routes is planned once the module's core
  functionality and UI are complete.
