import React, { useEffect, useMemo, useState } from 'react';
import {
  approveDispatchPlan,
  createDispatchPlan,
  fetchApprovedIncidents,
  fetchDispatchPlans,
  fetchInventoryItems,
  fetchWarehouses,
} from '../api/resourceApi';
import type {
  ApprovedIncidentSummary,
  DispatchPlan,
  InventoryItem,
  Warehouse,
} from '../types/resourceTypes';

const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya',
];

const generateMissionId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

type FilterMode = 'all' | 'incident' | 'manual';

export const DispatchManagementPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [approvedIncidents, setApprovedIncidents] = useState<ApprovedIncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Colombo');
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [teamsRequired, setTeamsRequired] = useState(2);
  const [missionId, setMissionId] = useState(generateMissionId());
  const [plans, setPlans] = useState<DispatchPlan[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');

  useEffect(() => {
    async function load() {
      try {
        const [warehouseRes, inventoryRes, dispatchRes, incidentsRes] = await Promise.all([
          fetchWarehouses({ page: 1, pageSize: 50 }),
          fetchInventoryItems({ page: 1, pageSize: 50 }),
          fetchDispatchPlans(),
          fetchApprovedIncidents().catch(() => [] as ApprovedIncidentSummary[]),
        ]);

        const warehouseList = warehouseRes.items ?? [];
        const inventoryList = inventoryRes.items ?? [];

        setWarehouses(warehouseList);
        setInventory(inventoryList);
        setPlans(dispatchRes ?? []);
        setApprovedIncidents(incidentsRes);
        if (warehouseList.length > 0) {
          setSelectedWarehouseId((prev) => prev || warehouseList[0].id);
        }
      } catch (error) {
        console.error('Failed to load dispatch data:', error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ?? warehouses[0],
    [selectedWarehouseId, warehouses],
  );

  const allocatableItems = useMemo(
    () => inventory.filter((item) => item.warehouseId === selectedWarehouseId && item.quantityAvailable > 0),
    [inventory, selectedWarehouseId],
  );

  const filteredPlans = useMemo(() => {
    if (filter === 'incident') return plans.filter((p) => p.isIncidentLinked);
    if (filter === 'manual') return plans.filter((p) => !p.isIncidentLinked);
    return plans;
  }, [plans, filter]);

  const incidentCount = useMemo(() => plans.filter((p) => p.isIncidentLinked).length, [plans]);

  const handleIncidentSelect = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    if (!incidentId) return;

    const incident = approvedIncidents.find((i) => i.id === incidentId);
    if (!incident) return;

    // Auto-fill from the incident
    setMissionId(incident.id);
    setSelectedDistrict(incident.district);
  };

  const handleClearIncident = () => {
    setSelectedIncidentId('');
    setMissionId(generateMissionId());
    setSelectedDistrict('Colombo');
  };

  const handleCreatePlan = async () => {
    if (!selectedWarehouseId) {
      alert('Select a warehouse before creating a dispatch plan.');
      return;
    }
    if (allocatableItems.length === 0) {
      alert('No inventory is available at the selected warehouse for dispatch.');
      return;
    }

    const refWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);
    if (!refWarehouse) {
      alert('Please select a warehouse first.');
      return;
    }

    setSubmitting(true);
    try {
      const plan = await createDispatchPlan({
        missionId,
        district: selectedDistrict,
        teamsRequired: teamsRequired,
        latitude: Number(refWarehouse.latitude),
        longitude: Number(refWarehouse.longitude),
      });

      setPlans((prev) => [plan, ...prev]);

      // Reset the form for the next dispatch
      setSelectedIncidentId('');
      setMissionId(generateMissionId());
    } catch (error: any) {
      alert(error.message || 'Failed to generate dispatch plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const approvePlan = async (id: string) => {
    try {
      const approved = await approveDispatchPlan(id);
      setPlans((prev) =>
        prev.map((plan) =>
          plan.id === id ? { ...plan, ...approved, approvalStatus: 'Approved' } : plan,
        ),
      );
    } catch (error: any) {
      alert(error.message || 'Failed to approve dispatch plan.');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#64748b' }}>Loading dispatch planning data...</div>;
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.25rem' }}>
        {/* ─── LEFT: Planner form ─────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: '18px', padding: '1.5rem', boxShadow: '0 8px 20px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Resource Allocation</div>
              <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.8rem' }}>Dispatch &amp; Allocation Planner</h2>
            </div>
            <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.45rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>Live plan</span>
          </div>

          {/* ─── NEW: Select Approved Incident dropdown ─────────────────── */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={fieldStyle}>
              <span>🎯 Select Approved Incident (optional)</span>
              <select
                value={selectedIncidentId}
                onChange={(e) => handleIncidentSelect(e.target.value)}
                style={{
                  ...inputStyle,
                  background: selectedIncidentId ? '#f0fdf4' : '#fff',
                  borderColor: selectedIncidentId ? '#86efac' : '#cbd5e1',
                }}
              >
                <option value="">— Create a manual dispatch plan —</option>
                {approvedIncidents.map((incident) => (
                  <option key={incident.id} value={incident.id}>
                    [{incident.severityAssessed ?? incident.severityReported}] {incident.disasterType} — {incident.district} ({new Date(incident.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})
                  </option>
                ))}
              </select>
            </label>

            {selectedIncidentId && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.6rem 0.9rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#1e40af',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <span>
                  ℹ️ Mission ID + district auto-filled from the selected incident.
                </span>
                <button
                  onClick={handleClearIncident}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#1e40af',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
            <label style={fieldStyle}>
              <span>Mission ID</span>
              <input
                value={missionId}
                onChange={(e) => setMissionId(e.target.value)}
                style={inputStyle}
                readOnly={!!selectedIncidentId}
              />
            </label>

            <label style={fieldStyle}>
              <span>District</span>
              <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} style={inputStyle}>
                {DISTRICTS.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              <span>Teams required</span>
              <input type="number" min={1} max={20} value={teamsRequired} onChange={(e) => setTeamsRequired(Number(e.target.value) || 1)} style={inputStyle} />
            </label>

            <label style={fieldStyle}>
              <span>Reference Warehouse (agent may select a different one)</span>
              <select value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)} style={inputStyle}>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginTop: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <strong>Suggested allocation</strong>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{selectedWarehouse?.name ?? 'Warehouse'}</span>
            </div>
            {allocatableItems.length === 0 ? (
              <div style={{ color: '#64748b' }}>No stock available for this warehouse.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {allocatableItems.slice(0, 6).map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.7rem 0.9rem' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.itemName}</div>
                      <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{item.quantityAvailable} {item.unit} available</div>
                    </div>
                    <div style={{ color: '#0f172a', fontWeight: 700 }}>
                      {Math.max(1, Math.ceil(item.quantityAvailable / 2))} units
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button onClick={handleCreatePlan} disabled={submitting} style={primaryButtonStyle}>
              {submitting ? 'Planning...' : 'Generate Dispatch Plan'}
            </button>
          </div>
        </div>

        {/* ─── RIGHT: Dispatch queue with filter ──────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: '18px', padding: '1.5rem', boxShadow: '0 8px 20px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Dispatch queue</h3>
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{plans.length} plan(s)</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <FilterChip label={`All (${plans.length})`} active={filter === 'all'} onClick={() => setFilter('all')} />
            <FilterChip label={`🚨 From Incident (${incidentCount})`} active={filter === 'incident'} onClick={() => setFilter('incident')} />
            <FilterChip label={`Manual (${plans.length - incidentCount})`} active={filter === 'manual'} onClick={() => setFilter('manual')} />
          </div>

          {filteredPlans.length === 0 ? (
            <div style={{ color: '#64748b', padding: '1rem 0' }}>
              No dispatch plans match the current filter.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.8rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {filteredPlans.map((plan) => (
                <DispatchCard key={plan.id} plan={plan} onApprove={() => approvePlan(plan.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FilterChip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label, active, onClick,
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.4rem 0.75rem',
      borderRadius: '999px',
      border: active ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
      background: active ? '#dbeafe' : '#fff',
      color: active ? '#1d4ed8' : '#475569',
      fontWeight: 700,
      fontSize: '0.75rem',
      cursor: 'pointer',
    }}
  >
    {label}
  </button>
);

const DispatchCard: React.FC<{ plan: DispatchPlan; onApprove: () => void }> = ({
  plan, onApprove,
}) => {
  const isApproved = plan.approvalStatus === 'Approved';
  const isRejected = plan.approvalStatus === 'Rejected';

  return (
    <div style={{
      border: plan.isIncidentLinked ? '1px solid #fecaca' : '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '0.95rem',
      background: plan.isIncidentLinked ? '#fef2f2' : '#f8fafc',
    }}>
      {plan.isIncidentLinked && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#dc2626',
          color: '#fff',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}>
          🚨 From Incident · {plan.incidentDisasterType}
          {plan.incidentSeverity && ` · ${plan.incidentSeverity}`}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
        <strong style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
          {plan.isIncidentLinked
            ? `Incident #${plan.missionId.substring(0, 8)}…`
            : plan.missionId}
        </strong>
        <span style={{
          padding: '0.3rem 0.55rem',
          borderRadius: '999px',
          fontSize: '0.7rem',
          fontWeight: 700,
          background: isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
          color: isApproved ? '#166534' : isRejected ? '#991b1b' : '#92400e',
        }}>
          {plan.approvalStatus}
        </span>
      </div>

      <div style={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.6 }}>
        {plan.isIncidentLinked && plan.incidentCreatedAt && (
          <div>
            <strong>Reported:</strong>{' '}
            {new Date(plan.incidentCreatedAt).toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>
        )}
        <div><strong>District:</strong> {plan.district}</div>
        <div><strong>Warehouse:</strong> {plan.warehouseName}</div>
        <div><strong>Teams:</strong> {plan.teamsRequired}</div>
        <div><strong>ETA:</strong> {plan.estimatedArrivalMinutes} min</div>
        {plan.routeSummary && (
          <div style={{ marginTop: '0.35rem', color: '#64748b', fontStyle: 'italic' }}>
            {plan.routeSummary}
          </div>
        )}
      </div>

      <div style={{ marginTop: '0.75rem' }}>
        {plan.items.map((item) => (
          <div key={`${plan.id}-${item.itemName}`} style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
            <span>{item.itemName}</span>
            <strong>{item.quantity}</strong>
          </div>
        ))}
      </div>

      {!isApproved && (
        <button
          onClick={onApprove}
          style={{
            marginTop: '0.75rem',
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#0f172a',
            padding: '0.55rem 0.8rem',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Approve dispatch
        </button>
      )}
    </div>
  );
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
  color: '#334155',
  fontSize: '0.85rem',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  padding: '0.75rem 0.85rem',
  fontSize: '0.9rem',
  color: '#0f172a',
  background: '#fff',
};

const primaryButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
  color: '#fff',
  padding: '0.8rem 1.1rem',
  borderRadius: '10px',
  fontWeight: 700,
  cursor: 'pointer',
};