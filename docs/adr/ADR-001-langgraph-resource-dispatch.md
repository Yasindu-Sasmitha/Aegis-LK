# ADR-001: Use LangGraph for the Resource 4-Agent Dispatch Pipeline

## Status
**Accepted** — 2026-09-30

## Context

The Resource & Logistics module must deliver a domain-relevant, multi-step
Agentic AI capability that satisfies SE3090 §9.1. The workflow has to:

- Receive a domain objective (mission + teams + district + lat/lng)
- Create a **structured multi-step plan**
- Delegate each step to a **distinct agent** with a defined contract
- Call **allow-listed tools** with validated inputs and structured outputs
- Persist workflow state across steps (auditable trace)
- Apply **deterministic validation** (business rules, schema checks)
- Pause for **authorised human approval** on the high-impact action
  (inventory reservation)
- Produce an **auditable result** or a **safe failure** outcome

The initial prototype was a single deterministic Python function that
ranked warehouses and computed allocations. It passed functional tests
but **failed the assignment's "distinct agents" and "planning /
delegation" criteria** — it had no LLM, no plan, no delegation, and no
tools with structured contracts. It also had no human-in-the-loop path.

## Decision Drivers

- Must satisfy SE3090 §9.1 minimum assessed workflow (four distinct agents)
- Must not hardcode business logic into a prompt (deterministic validation)
- Must run reliably during the viva (no external service dependency risk)
- Must be callable from .NET over HTTP (mandatory backend rule, §2)
- Must be free-tier (no paid subscriptions — assignment constraint)
- Must support safe failure with an auditable trace

## Options Considered

### Option 1 — Single deterministic Python function
- ✅ Simple, fast, deterministic
- ❌ No planning, no delegation, no distinct agents
- ❌ Fails §9.1 acceptance criterion

### Option 2 — Single LLM prompt with function-calling tools
- ✅ Uses an LLM, has tools
- ❌ No separation of concerns; one prompt does everything
- ❌ Non-deterministic validation — business rules embedded in prompt
- ❌ Hard to test / audit individual steps

### Option 3 — LangGraph with a four-agent pipeline (CHOSEN)
- ✅ **Coordinator** (LLM, structured `Plan` output via Pydantic)
- ✅ **Warehouse Analyst** (allow-listed `get_warehouse_candidates` tool)
- ✅ **Dispatch Planner** (allow-listed `compute_allocation` tool)
- ✅ **Validation & Safety** (deterministic gate + retry policy)
- ✅ State passed via `TypedDict` + `add_messages` reducer
- ✅ Per-step trace auditable in the response
- ✅ Safe-failure and retry paths are code, not prose

### Option 4 — Microsoft Agent Framework / LlamaIndex / Google ADK
- ✅ Feature-comparable
- ❌ Higher setup cost during CI/CD
- ❌ Fewer free-tier examples at the time of decision (Sept 2026)
- ❌ Not the stack used in the SE3090 lab sheets (Lab 05/06/07)

## Decision

**We chose LangGraph (Option 3).**

The four-agent pipeline is compiled as a `StateGraph` with explicit nodes
and conditional edges. Every agent has an **identifiable responsibility**,
a **defined input/output contract**, **allow-listed tool permissions**,
and a **visible participation** in the workflow trace returned to .NET.

The `validation_safety` node applies **deterministic** business rules
(schema checks, stock limits, ETA positivity, vehicle count positivity)
that the LLM cannot bypass. The `route_after_analyst` and
`route_after_validation` functions implement retry and fast-fail edges
in code, not in prompts.

The graph is wrapped in a **FastAPI** service bound to `127.0.0.1:8003`
and called by the .NET backend via a typed `HttpClient`
(`ResourceAgentClient`). **React and Flutter never talk to the agent
directly** — this satisfies SE3090 §2 (mandatory backend rule).

## Consequences

### Positive
- Satisfies §9.1 "four distinct agents" criterion
- Deterministic validation gate rejects unsafe plans before persistence
- Human-in-the-loop approval is enforced downstream by .NET, keeping the
  LLM out of the authorisation decision
- Full per-step trace exposed in the API response, which the React
  dashboard renders as an agent-execution timeline
- Safe-failure paths emit a clear, structured error string

### Negative
- Adds ~13 seconds of latency per dispatch request (LLM call)
- Requires a separate Python process running alongside .NET
- Adds one additional runtime dependency (Google Gemini API)
- Introduces risk of upstream model deprecation (e.g. Google retired
  `gemini-2.5-flash-lite` in mid-2026 — mitigated by making the model
  name configurable via the `CHAT_MODEL` environment variable)

### Mitigations
- The .NET `ResourceAgentClient` catches all exceptions and returns
  `null`, which is converted into a `SafeFailure` response — the UI
  never crashes when the agent service is down
- The agent service is optional for demo: the module works without it
  for all CRUD operations

## Compliance

- SE3090 §2 — Mandatory backend rule: enforced (agent service is loopback-only)
- SE3090 §5 — At least 4 meaningful API endpoints: satisfied (11 endpoints)
- SE3090 §6 — PostgreSQL with migrations: satisfied (4 migrations)
- SE3090 §9.1 — Four distinct agents, allow-listed tools, deterministic
  validation, human approval, safe failure: satisfied
- SE3090 §12 — Agent golden-case tests authored: satisfied

## References

- SE3090 Lab Practical 05 — "Hello, Agent"
- SE3090 Lab Practical 06 — Stateful graph, checkpointing, interrupt/resume
- SE3090 Lab Practical 07 — Multi-agent supervisor, evaluation, injection
- LangGraph documentation — https://langchain-ai.github.io/langgraph/
- Google AI Studio free tier — https://aistudio.google.com/apikey