# Weather Intelligence Module — Developer Notes

**Owner:** Member 1 (Weather Intelligence)
**Owns:** `backend/Aegis.Weather/`, `agentic-ai/agents/weather_agent.py` + `weather_agent_service.py`
+ `eval_weather_agent.py`, `react/src/features/weather/` (not started),
`flutter/lib/features/weather/` (not started)

---

## 1. What this module does

Predicts three hazard types per Sri Lanka district — **Flood, Strong Wind, and Landslide** — using
live Open-Meteo forecast data compared against seeded historical thresholds. A LangGraph agent
reasons over the numbers; deterministic code (not the LLM) makes the final publish/review decision.
Low-confidence or under-called risks get routed to a human officer instead of auto-publishing.

**Explicitly out of scope** (documented decision, not an oversight):
- **Drought** — needs long-term trend data (weeks/months), not a 3-day forecast. Noted as future work.
- **Tsunami** — not a weather phenomenon (seismic, not meteorological). Real design would be a manually-posted
  official alert type sourced from DMC Sri Lanka, not an AI prediction. Not built — out of this module's scope.

---

## 2. Architecture

One ASP.NET Core Web API (`Aegis.Api`), one PostgreSQL database, modules separated by **PostgreSQL schema**
(not separate databases, not microservices) — `builder.HasDefaultSchema("weather")` in `WeatherDbContext`.
This module's own DbContext, own migrations, own tables — nobody else touches them directly.

The Agentic AI part is a **separate Python process** (FastAPI + LangGraph), called internally by the
ASP.NET Core backend only — never exposed to React/Flutter directly (assignment's mandatory backend rule).
It runs on `127.0.0.1:8001` (loopback only, not reachable from outside the machine) and holds **no database
credentials at all** — pure stateless reasoning in, JSON out. All persistence happens in C#.

```
Flutter/React → ASP.NET Core (Aegis.Api) → WeatherDbContext (PostgreSQL, schema "weather")
                              ↓ internal HTTP call only
                   Python FastAPI (127.0.0.1:8001) → LangGraph → Gemini (gemini-2.5-flash-lite)
```

---

## 3. Database schema

Schema: `weather`. Migrations applied so far: `InitialWeatherSchema`, `AddLandslideAndWindHazards`.

| Table | Key columns | Notes |
|---|---|---|
| `Districts` | Id, Name (unique), Province, Latitude, Longitude, **IsLandslideProne** | 25 seeded — real SL districts + coords |
| `HistoricalWeather` | DistrictId+Month (unique), AvgRainfallMm, FloodThresholdMm, **LandslideThresholdMm** (nullable), **HighWindThresholdKmh** | **Seeded for all 12 months per district** (see §8 — this was a real bug, now fixed) |
| `WeatherStation` / `WeatherObservation` | — | Scaffolded, not actively used yet (future: real station data) |
| `Predictions` | DistrictId, **AgentRunId**, **HazardType**, RiskProbabilityPct, ConfidencePct, ForecastValue, HistoricalThreshold, Unit, Status | **One row per hazard per agent run** — up to 3 rows share one AgentRunId |
| `WeatherAlerts` | PredictionId, HazardType, Severity, Message, Status (`PendingReview`/`Published`/`Rejected`), ReviewedByUserId, PublishedAt | Only created when action is `publish_alert` or `flag_for_review` |
| `ForecastHistory` | PredictionId, ActualDisasterOccurred, ActualValue | Not populated yet — feeds future accuracy analytics |
| `AgentExecutionLogs` | DistrictId, StepsJson, OverallStatus, ErrorMessage, StartedAt/CompletedAt | The audit trail — one row per `/predict` call, includes retry attempts |

**Landslide-prone districts (seeded true):** Kandy, Matale, Nuwara Eliya, Badulla, Kegalle, Ratnapura
(real Sri Lanka hill country, matches how NBRO actually issues landslide warnings).

---

## 4. API endpoints — current state

| Method & route | Status | Purpose |
|---|---|---|
| `GET /api/weather/districts` | ✅ done | List all districts |
| `GET /api/weather/districts/{id}/historical` | ✅ done | Historical baseline for a district |
| `GET /api/weather/forecast/{districtId}` | ✅ done | Live Open-Meteo pull + baseline, no AI |
| `POST /api/weather/predict/{districtId}` | ✅ done, tested end-to-end with Gemini | Full agent workflow — forecast → agent → validate → persist |
| `POST /api/weather/predict-test/{districtId}` | ✅ removed | Was temporary scaffolding, deleted after confirming the alert-writing path worked |
| `POST /api/weather/alerts/{id}/review` | ❌ not built | Officer approve/reject a `PendingReview` alert — the individual human-approval story |
| `GET /api/weather/alerts` (search/filter/paginate) | ❌ not built | |
| `GET /api/weather/analytics/accuracy` | ❌ not built | Reporting requirement — compares Prediction vs ForecastHistory |
| CRUD `/api/weather/stations` | ❌ not built | Admin management, low priority |

---

## 5. The agent — `weather_agent.py`

**LangGraph, 2 nodes:**
1. `compute_risk` — calls Gemini via `with_structured_output()`, **tries once, retries once** on
   any failure (parse error, transient network issue) before giving up — a self-correction pattern
   mirroring Lab 06's grade/rewrite loop. Every attempt (success or failure) is logged to `steps`.
2. `validate_and_decide` — **code-side gate, not the LLM's own claim:**
   - `confidence_pct < 70` → forces `flag_for_review` regardless of what the model said
   - Anomaly override: if forecast value ≥ 1.3× the historical threshold but the model said
     `no_action`, force `flag_for_review` anyway
   - **Flood and Landslide compare against SUMMED 3-day rainfall** (cumulative risk); **StrongWind
     compares against MAX single-day wind** (a single bad day is what matters for wind, unlike rain)

**Hazards assessed conditionally:** Flood + StrongWind always; Landslide only if
`district.IsLandslideProne == true`.

**Model:** `gemini-2.5-flash-lite` via `langchain-google-genai` — the same free-tier Gemini setup
used throughout the SE3090 labs (Weeks 5–7). Switched from an Ollama cloud model (`minimax-m3:cloud`)
after that model was discontinued; this is genuinely a better fit anyway since it matches taught
material directly and Google's free tier is well-documented (RPM/TPM/RPD limits), unlike the
Ollama community-hosted model whose free status was never fully confirmed. No local model or
Ollama installation needed at all now — one less moving piece for setup and deployment.

**Service wrapper:** `weather_agent_service.py` — FastAPI, `POST /assess`, `GET /health`, run via:
```powershell
cd agentic-ai/agents
uvicorn weather_agent_service:app --host 127.0.0.1 --port 8001
```
Must be running *before* `/predict` is called — note this in deployment/startup docs later.

**Guardrail tests:** `test_weather_agent_guardrails.py` — deterministic, bypasses the LLM entirely,
directly tests `validate_and_decide` with fabricated "bad" model outputs. Both cases pass:
anomaly override catches an under-called risk, low confidence forces review.

**Golden-case evaluation:** `eval_weather_agent.py` — runs the REAL agent (real Gemini calls)
against 4 known scenarios and reports a pass/fail count with a denominator (4/4 passing as of
last run), covering: severe multi-hazard district, calm non-landslide district, wind-only severe
case, and calm hill district. This plus the guardrail tests together satisfy the "Agent Evaluation"
testing requirement — rule-based assertions and golden cases, not just LLM-as-judge.

---

## 6. Third-party integration — Open-Meteo

`OpenMeteoService.cs` — free, no API key. Pulls `precipitation_sum` + `wind_speed_10m_max`,
3-day forecast, per district's seeded lat/lon. 5s timeout, 3 retry attempts with backoff, returns
`null` on total failure (caller returns a 503, doesn't crash).

---

## 7. Local dev setup (from scratch)

1. **.NET 10 SDK** required — `dotnet --list-sdks` must show `10.x`.
2. **PostgreSQL** — pgAdmin4 is fine, doesn't need to be Docker. Create a database named `aegis_lk`.
3. **Connection string** — set via user-secrets, **not** `appsettings.Development.json`:
```powershell
   cd backend/Aegis.Api
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=aegis_lk;Username=postgres;Password=YOUR_PASSWORD"
```
4. **API docs UI** — `/scalar/v1`, not `/swagger` (this repo uses `AddOpenApi()`/`MapOpenApi()`).
5. **Python** — `python -m venv venv`, activate, then:
```powershell
   pip install langgraph langchain-google-genai python-dotenv pydantic fastapi "uvicorn[standard]"
```
6. **Gemini API key** — free, from https://aistudio.google.com/apikey (same key as SE3090 labs).
   Create `agentic-ai/agents/.env`:
```
   GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   CHAT_MODEL=gemini-2.5-flash-lite
```
   (`.env` is already covered by `.gitignore` — safe to create, never gets committed.)
7. **Two processes must run together** for `/predict` to work: the FastAPI agent service (port 8001)
   and `dotnet run --project Aegis.Api`.

**EF Core commands** (always specify `--context WeatherDbContext`):
```powershell
dotnet ef migrations add <Name> --project Aegis.Weather --startup-project Aegis.Api --context WeatherDbContext
dotnet ef database update --project Aegis.Weather --startup-project Aegis.Api --context WeatherDbContext
```
**To fully reset just this module's schema:**
```powershell
dotnet ef database update 0 --project Aegis.Weather --startup-project Aegis.Api --context WeatherDbContext
```

---

## 8. Known gotchas already hit and fixed (so nobody repeats them)

- Class libraries (`Microsoft.NET.Sdk`) don't get ASP.NET Core types for free — needed
  `<FrameworkReference Include="Microsoft.AspNetCore.App" />` in `Aegis.Weather.csproj` **and**
  explicit usings (`Microsoft.AspNetCore.Builder`, `.Http`, `.Routing`) in any file using `WebApplication`.
- "More than one DbContext was found" on any `dotnet ef` command → always pass `--context WeatherDbContext`.
- Guardrail bug (now fixed): Flood's anomaly check was comparing max-single-day rainfall against a
  cumulative threshold — inconsistent with how the prompt described it to the LLM. Now both Flood
  and Landslide sum all 3 days.
- **Seeder bug (now fixed) — the important one:** `HistoricalWeather` was originally only seeded
  for whichever month the seeder happened to first run in (e.g. August). Once the calendar rolled
  into September, every baseline lookup returned null, `/forecast` showed nulls, and `/predict`
  500'd with "No historical baseline seeded." Fix: the seeder now inserts a row for **all 12 months**
  per district. If you ever see this exact 500 again, it means someone reverted the seeder — check
  `WeatherDataSeeder.cs` loops `for (int month = 1; month <= 12; month++)`.
- Ollama+minimax's `with_structured_output()` silently failed (model ignored the JSON-only
  instruction and returned markdown prose) — this is why the agent briefly did manual JSON parsing.
  Not relevant anymore now that we're on Gemini, where `with_structured_output()` works properly,
  but worth remembering if anyone else on the team hits the same issue with a different local model.

---

## 9. Still to build

- [ ] `POST /api/weather/alerts/{id}/review` — officer approve/reject, the human-approval endpoint
- [ ] `GET /api/weather/alerts` with status/district filter + pagination
- [ ] `GET /api/weather/analytics/accuracy` — reporting requirement
- [ ] React: forecast dashboard, alert review queue
- [ ] Flutter: current weather screen, district search, alerts
- [ ] Unit/integration tests beyond the agent guardrail + eval tests
- [ ] ADR entries: modular monolith choice, LangGraph+Gemini choice (and why the Ollama attempt
      was abandoned), which hazards are predicted and why, schema-per-module DB strategy,
      why an LLM-decided tool call wasn't used for the deterministic Open-Meteo/baseline fetches

## 10. Group-level blockers (not mine alone, but affect this module)
- No `docker-compose.yml` yet
- No shared Identity/JWT in `Aegis.Shared` — blocks role-based `[Authorize]` on all endpoints above
- No CI workflow yet (Section 13 requirement)
- **New since last update:** confirmed the group's actual PR base branch is `dev`, not `main` —
  make sure everyone's aware (see main README's branching section, now corrected)