# ADR-002: Persist Dispatch Plans as PendingApproval with Cascade Delete

## Status
**Accepted** — 2026-09-30

## Context

The Resource module must persist an agent-generated dispatch plan that has
not yet been authorised. The plan is the "high-impact action" that pauses
for human approval per SE3090 §9.1. We must also decide how deletions of
a warehouse cascade through dependent rows.

## Decision

### 1. Dispatch persistence
- `Dispatch` rows are inserted with `ApprovalStatus = PendingApproval`
- Inventory is **not decremented** at plan-creation time
- Inventory is **decremented atomically on approval** inside
  `DispatchService.ApproveAsync`
- The `Dispatch.AgentReasoning` column stores the agent's route summary
  for audit purposes — **never the raw LLM trace** (that lives only in
  the ephemeral response and the .NET log)

### 2. Cascade strategy
- `Warehouse → Vehicle` — `DeleteBehavior.Cascade`
- `Warehouse → Inventory` — `DeleteBehavior.Cascade`
- `Dispatch → Warehouse` — `DeleteBehavior.Restrict` (audit preservation)
- `Dispatch → Vehicle` — `DeleteBehavior.Restrict`

Dispatch, Delivery, and ResourceRequest deletions are handled explicitly
inside `WarehouseService.DeleteAsync` in FK-safe order:
1. Deliveries
2. Dispatches
3. ResourceRequests
4. Vehicles
5. Inventory
6. Warehouse

### 3. `ItemsAllocated` storage
The plan's line items are stored as a PostgreSQL `jsonb` column on
`Dispatch.ItemsAllocated`, serialised via a `ValueConverter` and a
custom `ValueComparer<List<AllocatedItem>>`. This avoids a join table
for what is always a small, plan-local list.

### 4. Migrations
Four migrations are applied in order:
1. `InitialResourceModule`
2. `SyncResourceSchema`
3. `AddCascadeDeleteForWarehouse`
4. `SyncPendingModelChanges`

## Consequences

### Positive
- Human approval is enforced at the database level
- Cascade delete removes warehouse-specific rows without orphans
- Dispatch history is preserved (Restrict) for audit
- `ItemsAllocated` stays co-located with its parent plan

### Negative
- Schema migrations require the dependency order documented in the
  top-level README
- Deleting a warehouse is a "logical delete" for dispatch history,
  not a physical cascade
- `ItemsAllocated` becomes an opaque blob in SQL — analytical queries
  against line items must use PostgreSQL JSON operators

## Compliance
- SE3090 §6 — PostgreSQL with migrations, constraints, indexes: satisfied
- SE3090 §9.1 — Human-in-the-loop approval persisted as a status: satisfied