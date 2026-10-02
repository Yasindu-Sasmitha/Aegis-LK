# ADR-003: React State Management for the Resource Module

## Status
**Accepted** — 2026-09-30

## Context

The Resource module has four React pages with shared data (warehouses,
inventory, dispatches) and a refresh dependency between them (approving
a dispatch must refresh the dashboard's KPIs). We need a state management
approach that keeps the module easy to test, easy to reason about, and
small in bundle size.

## Options Considered

### Option 1 — Redux Toolkit
- ✅ Very powerful, mature ecosystem
- ❌ Overkill for four pages
- ❌ Adds a ~13 KB runtime dependency
- ❌ Requires reducer/action/slice boilerplate for simple CRUD

### Option 2 — Zustand
- ✅ Lightweight (~1 KB), hooks-first
- ✅ Good for medium-sized apps
- ❌ Adds a dependency for what React already provides
- ❌ More migration work if the module moves away

### Option 3 — React Context API + useReducer
- ✅ Built-in, no dependency
- ✅ Good for cross-cutting concerns (auth, theme)
- ❌ Overkill for page-local state
- ❌ Re-renders all consumers on any context change

### Option 4 — Local state + window custom events (CHOSEN)
- ✅ No new dependency — uses `useState`, `useEffect`, `useMemo`
- ✅ Cross-page invalidation via one documented event name
- ✅ Parent-driven `refreshKey` prop for forced remounts
- ✅ Easy to test each page in isolation

## Decision

**We chose Option 4.**

- Per-page state uses **local `useState` + `useEffect` + `useMemo`**
- Cross-page invalidation uses **window Custom Events**:
  `window.dispatchEvent(new CustomEvent('aegis:resource-changed'))`
- The parent `App.tsx` listens for that event and bumps a
  `resourceRefreshKey` state, which is passed as `key={refreshKey}` to
  force remounts of `ResourceDashboardPage`, `WarehouseManagementPage`,
  and `InventoryManagementPage`
- **React Context is used only for auth** (`AuthContext`), which is the
  standard pattern in the codebase

## Consequences

### Positive
- No new runtime dependency (keeps the bundle small)
- Cross-page coordination is explicit via one custom event name —
  documented and easy to trace
- Every page is testable in isolation with mocked API clients
- Trivial to migrate to Zustand later if the module grows

### Negative
- Cross-page state is not centrally visible — developers must know
  the `aegis:resource-changed` event exists
- No time-travel debugging (a Redux strength we don't need)

### Mitigation
- The event name and its flow are documented in the README and in
  `DispatchManagementPage.tsx` where the event is dispatched

## Compliance
- SE3090 §7 — React with functional components, hooks, routing and a
  justified state-management approach: satisfied