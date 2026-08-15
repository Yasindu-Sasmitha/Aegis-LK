# Weather Intelligence Module — Developer Notes

**Owner:** Member 1 (Weather Intelligence)
**Owns:** `backend/Aegis.Weather/`, `agentic-ai/agents/weather_agent.py` + `weather_agent_service.py`,
`react/src/features/weather/` (not started), `flutter/lib/features/weather/` (not started)

---

## 1. What this module does

Predicts three hazard types per Sri Lanka district — **Flood, Landslide, Strong Wind** — using live
Open-Meteo forecast data compared against seeded historical thresholds. A LangGraph agent reasons
over the numbers; deterministic code (not the LLM) makes the final publish/review decision.
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
                   Python FastAPI (127.0.0.1:8001) → LangGraph → Ollama
```

---

## 3. Database schema

Schema: `weather`. Migrations applied so far: `InitialWeatherSchema`, `AddLandslideAndWindHazards`.

| Table | Key columns | Notes |
|---|---|---|
| `Districts` | Id, Name (unique), Province, Latitude, Longitude, **IsLandslideProne** | 25 seeded — real SL districts + coords |
| `HistoricalWeather` | DistrictId+Month (unique), AvgRainfallMm, FloodThresholdMm, **LandslideThresholdMm** (nullable), **HighWindThresholdKmh** | Landslide threshold null for non-hill districts |
| `WeatherStation` / `WeatherObservation` | — | Scaffolded, not actively used yet (future: real station data) |
| `Predictions` | DistrictId, **AgentRunId**, **HazardType**, RiskProbabilityPct, ConfidencePct, ForecastValue, HistoricalThreshold, Unit, Status | **One row per hazard per agent run** — 3 rows share one AgentRunId |
| `WeatherAlerts` | PredictionId, HazardType, Severity, Message, Status (`PendingReview`/`Published`/`Rejected`), ReviewedByUserId, PublishedAt | Only created when action is `publish_alert` or `flag_for_review` |
| `ForecastHistory` | PredictionId, ActualDisasterOccurred, ActualValue | Not populated yet — feeds future accuracy analytics |
| `AgentExecutionLogs` | DistrictId, StepsJson, OverallStatus, ErrorMessage, StartedAt/CompletedAt | The audit trail — one row per `/predict` call |

**Landslide-prone districts (seeded true):** Kandy, Matale, Nuwara Eliya, Badulla, Kegalle, Ratnapura
(real Sri Lanka hill country, matches how NBRO actually issues landslide warnings).

---

## 4. API endpoints — current state

| Method & route | Status | Purpose |
|---|---|---|
| `GET /api/weather/districts` | ✅ done | List all districts |
| `GET /api/weather/districts/{id}/historical` | ✅ done | Historical baseline for a district |
| `GET /api/weather/forecast/{districtId}` | ✅ done | Live Open-Meteo pull + baseline, no AI |
| `POST /api/weather/predict/{districtId}` | ✅ done | Full agent workflow — forecast → agent → validate → persist |
| `POST /api/weather/predict-test/{districtId}` | ⚠️ **temporary, delete before submission** | Feeds hardcoded high-risk numbers through same logic, proves alert-writing path |
| `POST /api/weather/alerts/{id}/review` | ❌ not built | Officer approve/reject a `PendingReview` alert — the individual human-approval story |
| `GET /api/weather/alerts` (search/filter/paginate) | ❌ not built | |
| `GET /api/weather/analytics/accuracy` | ❌ not built | Reporting requirement — compares Prediction vs ForecastHistory |
| CRUD `/api/weather/stations` | ❌ not built | Admin management, low priority |

---

## 5. The agent — `weather_agent.py`

**LangGraph, 2 nodes:**
1. `compute_risk` — calls the LLM with forecast + thresholds, must return strict JSON
   (`format="json"` on Ollama + manual Pydantic validation — do **not** rely on
   `with_structured_output()`, it silently fails on models without proper tool-calling support
   through Ollama; learned this the hard way, see §7).
2. `validate_and_decide` — **code-side gate, not the LLM's own claim:**
   - `confidence_pct < 70` → forces `flag_for_review` regardless of what the model said
   - Anomaly override: if forecast value ≥ 1.3× the historical threshold but the model said
     `no_action`, force `flag_for_review` anyway
   - **Flood and Landslide compare against SUMMED 3-day rainfall** (cumulative risk); **StrongWind
     compares against MAX single-day wind** (a single bad day is what matters for wind, unlike rain)

**Hazards assessed conditionally:** Flood + StrongWind always; Landslide only if
`district.IsLandslideProne == true`.

**Model:** `minimax-m3:cloud` via Ollama (chosen for laptop hardware constraints — quality without a
local GPU). **Open item:** confirm this is genuinely free/no-cost long-term, and keep a local fallback
(`llama3.2` or `llama3.2:1b`) tested and ready, since cloud = internet-dependent = one more thing that
can fail during a live demo. **This decision needs its own ADR entry.**

**Service wrapper:** `weather_agent_service.py` — FastAPI, `POST /assess`, `GET /health`, run via:
```powershell
cd agentic-ai\agents
uvicorn weather_agent_service:app --host 127.0.0.1 --port 8001
```
Must be running *before* `/predict` is called — note this in deployment/startup docs later.

**Guardrail tests:** `test_weather_agent_guardrails.py` — deterministic, bypasses the LLM entirely,
directly tests `validate_and_decide` with fabricated "bad" model outputs. Both cases pass:
anomaly override catches an under-called risk, low confidence forces review. This is the "rule-based
assertion" evidence the Agent Evaluation section wants — LLM-as-judge alone isn't enough per spec.

---

## 6. Third-party integration — Open-Meteo

`OpenMeteoService.cs` — free, no API key. Pulls `precipitation_sum` + `wind_speed_10m_max`,
3-day forecast, per district's seeded lat/lon. 5s timeout, 3 retry attempts with backoff, returns
`null` on total failure (caller returns a 503, doesn't crash).

---

## 7. Local dev setup (from scratch)

1. **.NET 10 SDK** required — `dotnet --list-sdks` must show `10.x`. (Repo targets net10.0; a
   default `dotnet new classlib` on a machine with only .NET 8 will silently create a net8.0 project
   and cascade into NuGet + `.slnx` parse errors — install .NET 10, don't fight it.)
2. **PostgreSQL** — pgAdmin4 is fine, doesn't need to be Docker. Create a database named `aegis_lk`.
3. **Connection string** — set via user-secrets, **not** `appsettings.Development.json` (that file
   assumes the team's eventual `docker-compose.yml` on port 5433 — don't touch it):
```powershell
   cd backend/Aegis.Api
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=aegis_lk;Username=postgres;Password=YOUR_PASSWORD"
```
4. **API docs UI** — this repo uses .NET's newer `AddOpenApi()`/`MapOpenApi()`, not classic Swagger —
   there's no `/swagger` page. `Scalar.AspNetCore` is added for an interactive UI at `/scalar/v1`.
5. **Python** — `python -m venv venv`, activate, `pip install langgraph langchain-ollama pydantic fastapi "uvicorn[standard]"`.
6. **Ollama** — install from ollama.com, `ollama pull llama3.2` (local fallback model).
7. **Two processes must run together** for `/predict` to work: the FastAPI agent service (port 8001)
   and `dotnet run --project Aegis.Api`.

**EF Core commands** (always specify `--context WeatherDbContext`, since multiple DbContexts exist
in this solution and EF can't disambiguate on its own):
```powershell
dotnet ef migrations add <Name> --project Aegis.Weather --startup-project Aegis.Api --context WeatherDbContext
dotnet ef database update --project Aegis.Weather --startup-project Aegis.Api --context WeatherDbContext
```
**To fully reset just this module's schema** (clean way, don't hand-drop schemas):
```powershell
dotnet ef database update 0 --project Aegis.Weather --startup-project Aegis.Api --context WeatherDbContext
```
(Manually dropping the schema without this leaves `__EFMigrationsHistory` — which lives in `public`,
not `weather` — thinking migrations are already applied. Caused a real failure once; this command
avoids it entirely.)

---

## 8. Known gotchas already hit and fixed (so nobody repeats them)

- Class libraries (`Microsoft.NET.Sdk`) don't get ASP.NET Core types for free — needed
  `<FrameworkReference Include="Microsoft.AspNetCore.App" />` in `Aegis.Weather.csproj` **and**
  explicit usings (`Microsoft.AspNetCore.Builder`, `.Http`, `.Routing`) in any file using `WebApplication`.
- "More than one DbContext was found" on any `dotnet ef` command → always pass `--context WeatherDbContext`.
- LLM ignoring "return only JSON" → don't trust prompting alone; use `format="json"` + manual
  Pydantic validation, don't assume `with_structured_output()` works with every Ollama model.
- Guardrail bug (now fixed): Flood's anomaly check was comparing max-single-day rainfall against a
  cumulative threshold — inconsistent with how the prompt described it to the LLM. Now both Flood
  and Landslide sum all 3 days.

---

## 9. Still to build

- [ ] `POST /api/weather/alerts/{id}/review` — officer approve/reject, the human-approval endpoint
- [ ] `GET /api/weather/alerts` with status/district filter + pagination
- [ ] `GET /api/weather/analytics/accuracy` — reporting requirement
- [ ] Delete `/predict-test/{districtId}` before final submission
- [ ] React: forecast dashboard, alert review queue
- [ ] Flutter: current weather screen, district search, alerts
- [ ] Unit/integration tests beyond the agent guardrail tests
- [ ] ADR entries: modular monolith choice, LangGraph+Ollama choice (incl. cloud vs local model
      tradeoff), which hazards are predicted and why, schema-per-module DB strategy

## 10. Group-level blockers (not mine alone, but affect this module)
- No `docker-compose.yml` yet
- No shared Identity/JWT in `Aegis.Shared` — blocks role-based `[Authorize]` on all endpoints above
- No CI workflow yet (Section 13 requirement)