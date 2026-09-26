# Weather Intelligence Module — Developer Notes

**Owner:** Member 1 (Weather Intelligence)  
**Owns:** `backend/Aegis.Weather/`, `agentic-ai/agents/weather_agent.py` + `weather_agent_service.py` + `eval_weather_agent.py`, `react/src/features/weather/` (✅ completed), `flutter/lib/features/weather/` (✅ completed)

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
| `HistoricalWeather` | DistrictId+Month (unique), AvgRainfallMm, FloodThresholdMm, **LandslideThresholdMm** (nullable), **HighWindThresholdKmh** | **Seeded for all 12 months per district** (see §9 — this was a real bug, now fixed) |
| `WeatherStation` / `WeatherObservation` | — | Scaffolded, not actively used yet (future: real station data) |
| `Predictions` | DistrictId, **AgentRunId**, **HazardType**, RiskProbabilityPct, ConfidencePct, ForecastValue, HistoricalThreshold, Unit, Status | **One row per hazard per agent run** — up to 3 rows share one AgentRunId |
| `WeatherAlerts` | PredictionId, HazardType, Severity, Message, Status (`PendingReview`/`Published`/`Rejected`), ReviewedByUserId, PublishedAt | Only created when action is `publish_alert` or `flag_for_review` |
| `ForecastHistory` | PredictionId, ActualDisasterOccurred, ActualValue | Feeds accuracy analytics comparing predictions vs ground truth |
| `AgentExecutionLogs` | DistrictId, StepsJson, OverallStatus, ErrorMessage, StartedAt/CompletedAt | The audit trail — one row per `/predict` call, includes retry attempts |

**Landslide-prone districts (seeded true):** Kandy, Matale, Nuwara Eliya, Badulla, Kegalle, Ratnapura
(real Sri Lanka hill country, matches how NBRO actually issues landslide warnings).

---

## 4. API endpoints — current state

| Method & route | Status | Purpose |
|---|---|---|
| `GET /api/weather/districts` | ✅ done | List all 25 districts |
| `GET /api/weather/districts/{id}/historical` | ✅ done | Historical baseline for a district |
| `GET /api/weather/forecast/{districtId}` | ✅ done | Live Open-Meteo pull + baseline, no AI |
| `POST /api/weather/predict/{districtId}` | ✅ done | Protected (`DisasterOfficer`, `Admin`). Full 3-node agent pipeline — forecast → Assessor → Critic → validate → persist. Response now includes a `trace` array of agent reasoning steps. |
| `GET /api/weather/agent-runs/{agentRunId}` | ✅ done | Protected (`DisasterOfficer`, `Admin`). Fetch the full reasoning trace for a past prediction run from `AgentExecutionLogs`. |
| `POST /api/weather/alerts/{id}/review` | ✅ done | Protected (`DisasterOfficer`, `Admin`). Officer approve/reject a `PendingReview` alert — human audit with authentic JWT `ReviewedByUserId` (rejects missing/invalid identity, no fallback identity). |
| `GET /api/weather/alerts` | ✅ done | Paginated & filterable list (status, district, hazardType) |
| `GET /api/weather/analytics/accuracy` | ✅ done | Reporting requirement — compares `Predictions` vs `ForecastHistory` |
| CRUD `/api/weather/stations` | ❌ not built | Admin management, low priority |

---

## 5. The agent — `weather_agent.py`

### Architecture: Assessor / Critic split (3-node LangGraph)

The pipeline was upgraded from a single "compute + validate" node into a proper **two-LLM, three-node graph** where each node has a well-defined and separate responsibility:

```
assess_hazards  →  critique_assessment  →  validate_and_decide
  (Assessor LLM)      (Critic LLM)           (deterministic code gate)
```

**Node 1 — `assess_hazards` (Assessor LLM)**  
Roles: domain expert. Receives raw forecast values and historical thresholds, reasons over them, and proposes a `{ risk_probability_pct, confidence_pct, reasoning_summary, recommended_action }` per relevant hazard. Retries once on any structured-output failure before giving up. Logs attempt details and a plain-English summary to `steps` whether it succeeds or fails.

**Node 2 — `critique_assessment` (Critic LLM)**  
Roles: independent quality control. Receives the Assessor's full output but **not the Assessor's prompt** — it cannot just repeat the same reasoning. It checks three things:
- Is `recommended_action` logically consistent with the reported `risk_probability_pct` and `confidence_pct`?
- Does `reasoning_summary` actually support the numbers?
- Are any values implausible given the raw forecast data?

Outputs `CritiqueOutput { agrees: bool, concerns: [{ hazard_type, issue }] }`. Designed to be fault-tolerant — if the Critic itself fails or times out, the pipeline continues on the Assessor's output alone and logs the failure honestly. The Critic never silently succeeds.

**Node 3 — `validate_and_decide` (deterministic code gate)**  
The LLM does not make the final publish/review decision. Code does, using three ordered rules:
1. **Confidence gate:** `confidence_pct < 70` → forces `flag_for_review`
2. **Anomaly gate:** forecast ≥ 1.3× threshold but model said `no_action` → forces `flag_for_review`
3. **Critic override:** if the Critic flagged a specific hazard as inconsistent, forces `flag_for_review` and appends `[auto-flagged: critic agent flagged an inconsistency]` to `reasoning_summary`

This means the Critic's disagreement has a real, auditable consequence — it is not decorative.

**Hazard scope:** Flood + StrongWind always assessed; Landslide only if `district.IsLandslideProne == true`.  
**Rainfall aggregation:** Flood and Landslide compare against **summed 3-day rainfall** (cumulative risk); StrongWind compares against **max single-day wind** (one bad day is what matters).

**Model:** `gemini-2.5-flash-lite` (free-tier) via `langchain-google-genai`. Both Assessor and Critic use the same underlying model via `with_structured_output()` with different Pydantic schemas (`WeatherAgentOutput` and `CritiqueOutput`).

**Step logging helper — `_log_step()`**  
Every node calls a shared helper that records `{ step, tool, duration_ms, status, summary, error? }`. This is the contract the UI and backend consume — any new node added to the graph must call `_log_step()` and append its entry to `state["steps"]`.

**Service wrapper:** `weather_agent_service.py` — FastAPI, `POST /assess`, `GET /health`.
```powershell
cd agentic-ai/agents
..\venv\Scripts\activate
uvicorn weather_agent_service:app --host 127.0.0.1 --port 8001
```

**Sample trace output (Kandy test run):**
```json
[
  { "step": "assess_hazards",      "tool": "gemini:...", "duration_ms": 4811, "status": "success", "summary": "Assessed 3 hazard(s): Flood 95%, Landslide 85%, StrongWind 15%" },
  { "step": "critique_assessment", "tool": "gemini:...", "duration_ms": 3659, "status": "success", "summary": "Agrees with assessment" },
  { "step": "validate_and_decide", "tool": "code",      "duration_ms": 0,    "status": "success", "summary": "Applied confidence/anomaly/critique gates" }
]
```

**Guardrail tests:** `test_weather_agent_guardrails.py` — tests all three deterministic overrides (confidence gate, anomaly gate, critic override).  
**Golden-case evaluation:** `eval_weather_agent.py` — runs real Gemini calls against 4 scenarios (4/4 passing).

---

## 6. React Web Application (`react/src/features/weather/`)

A rich light/dark React interface integrated into the main `App.tsx` via a top-level module switcher:

| File / Component | Purpose |
|---|---|
| `types/weatherTypes.ts` | TypeScript interfaces mirroring backend DTOs and API responses. Includes `AgentStep` interface and the `trace: AgentStep[]` field on `PredictResponse`. |
| `api/weatherApi.ts` | REST fetch clients with typing for all `/api/weather` endpoints |
| `pages/WeatherDashboardPage.tsx` | District selector with search & landslide badges; interactive 3-day rainfall and wind charts with threshold baselines; trigger button for Agentic AI prediction; live risk cards; **Agent Reasoning Trace panel** rendered after each prediction |
| `pages/AlertReviewQueuePage.tsx` | Human-in-the-loop review queue for `PendingReview` alerts with one-click **Approve & Publish** or **Reject** dialogs and officer audit notes |
| `pages/PredictionHistoryPage.tsx` | Historical predictions/alerts table with status, district, and hazard filters |
| `pages/AnalyticsPage.tsx` | AI model accuracy KPIs and per-hazard accuracy visualizations vs ground truth |
| `index.ts` | Barrel export of the weather feature module |

### Agent Reasoning Trace Timeline (`react/src/shared/components/AgentTraceTimeline.tsx`)

A shared React component that renders the agent pipeline's execution trace visually — a vertical timeline showing each step with icon, label, latency, status chip, and plain-English summary. Placed in `shared/components/` because it is re-usable by any future module that exposes LangGraph traces.

| Step displayed | Icon | Tool logged |
|---|---|---|
| `assess_hazards` | 🔍 Assessor Agent | `gemini:<model>` |
| `critique_assessment` | 🛡️ Critic Agent | `gemini:<model>` |
| `validate_and_decide` | ⚖️ Validation Gate | `code` |

The trace is conditionally rendered in `WeatherDashboardPage.tsx` immediately after the hazard risk cards. If the trace array is empty or absent (e.g., old cached prediction), the panel is hidden. If the Critic step shows status `failed`, the chip turns red — making error visibility automatic and requiring no custom error-handling code in the page.

---

## 7. Flutter Mobile Application (`flutter/lib/features/weather/`)

Clean Material 3 mobile application screens:

| File / Component | Purpose |
|---|---|
| `models/weather_models.dart` | Strongly typed Dart models with `fromJson` constructors |
| `services/weather_service.dart` | HTTP service client connecting to the `/api/weather` backend |
| `screens/weather_home_screen.dart` | Sri Lanka district overview with search, province chips, and landslide indicators |
| `screens/district_forecast_screen.dart` | Live 3-day forecast metrics, thresholds, and trigger button for AI hazard reasoning |
| `screens/alerts_screen.dart` | Active weather alerts list with status & hazard filters and officer approve/reject actions |
| `shared/router/app_router.dart` | Centralized router managing navigation across Weather and Recovery screens |

---

## 8. Third-party integration — Open-Meteo

`OpenMeteoService.cs` — free, no API key. Pulls `precipitation_sum` + `wind_speed_10m_max`,
3-day forecast, per district's seeded lat/lon. 5s timeout, 3 retry attempts with backoff, returns
`null` on total failure (caller returns a 503, doesn't crash).

---

## 9. Local dev setup & How to run

### Prerequisites:
- **.NET 10 SDK** (`dotnet --list-sdks`)
- **PostgreSQL** (`aegis_lk` database)
- **Python 3.10+** with `venv`
- **Node.js** for React

### 1. Python AI Agent (Terminal 1)
```powershell
cd agentic-ai/agents
..\venv\Scripts\activate
uvicorn weather_agent_service:app --host 127.0.0.1 --port 8001 --reload
```

### 2. ASP.NET Core Backend (Terminal 2)
```powershell
cd backend
dotnet run --project Aegis.Api
```
- Runs at `http://localhost:5012`
- Interactive API documentation: `http://localhost:5012/scalar/v1`

### 3. React Web Frontend (Terminal 3)
```powershell
cd react
npm install
npm run dev
```
- Open `http://localhost:3000` in your browser.
- Select the **Weather Intelligence** module from the header.

### 4. Flutter Mobile App (Optional)
```powershell
cd flutter
flutter pub get
flutter run
```

---

## 10. Known gotchas already hit and fixed

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
- Ollama+minimax's `with_structured_output()` silently failed — switched to `gemini-2.5-flash-lite`,
  which reliably handles structured JSON outputs.

---

## 11. Feature Completion Status

- [x] `POST /api/weather/alerts/{id}/review` — officer approve/reject human-in-the-loop endpoint
- [x] `GET /api/weather/alerts` with status/district/hazard filter + pagination
- [x] `GET /api/weather/analytics/accuracy` — model accuracy analytics vs ground truth
- [x] React: forecast dashboard, alert review queue, prediction history, analytics
- [x] Flutter: weather home screen, district forecast, alert review queue
- [x] Agent evaluation suite (`eval_weather_agent.py` + `test_weather_agent_guardrails.py`)
- [x] Shared Role-Based Authentication & Authorization (JWT) in `Aegis.Shared` & `Aegis.Api`
- [x] **Assessor / Critic multi-agent split** — `weather_agent.py` refactored from 2-node to 3-node LangGraph graph: `assess_hazards` (Assessor LLM) → `critique_assessment` (Critic LLM) → `validate_and_decide` (code gate). Critic disagreements produce deterministic `flag_for_review` overrides with annotated reasoning.
- [x] **Agent Reasoning Trace** — every pipeline run emits a `steps` array with per-node timing, status, and plain-English summary. Persisted to `AgentExecutionLogs.StepsJson`, returned in `POST /predict` response as `trace`, retrievable independently via protected `GET /api/weather/agent-runs/{agentRunId}` (`DisasterOfficer`, `Admin`). Visualized in React via `AgentTraceTimeline.tsx`.
- [x] **Audit Security & Deterministic Guardrails** — Alert review strictly extracts and records authentic officer GUID from JWT (rejects missing/invalid claims, eliminates default GUID fallback). Guardrail test suite deterministically verifies Confidence Gate, Anomaly Gate, and Critic Override Gate.
- [ ] CRUD `/api/weather/stations` (optional future enhancement)
- [ ] Group-level shared blockers: `docker-compose.yml`, CI workflow (Section 13 requirement)