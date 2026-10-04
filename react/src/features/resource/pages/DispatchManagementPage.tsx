import React, { useEffect, useMemo, useState } from 'react';
import {
  approveDispatchPlan,
  createDispatchPlan,
  deleteDispatchPlan,
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
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
      setSelectedIncidentId('');
      setMissionId(generateMissionId());
    } catch (error: any) {
      alert(error.message || 'Failed to generate dispatch plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const approvePlan = async (id: string) => {
    setApprovingId(id);
    try {
      const approved = await approveDispatchPlan(id);
      setPlans((prev) =>
        prev.map((plan) =>
          plan.id === id ? { ...plan, ...approved, approvalStatus: 'Approved' } : plan,
        ),
      );
    } catch (error: any) {
      alert(error.message || 'Failed to approve dispatch plan.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDelete = async (plan: DispatchPlan) => {
    const confirmed = window.confirm(
      `Delete this dispatch plan?\n\n` +
      `Mission: ${plan.missionId.substring(0, 12)}…\n` +
      `District: ${plan.district}\n` +
      `Warehouse: ${plan.warehouseName}\n\n` +
      `This will also release the reserved vehicle. Approved plans cannot be deleted.`
    );
    if (!confirmed) return;

    setDeletingId(plan.id);
    try {
      await deleteDispatchPlan(plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    } catch (error: any) {
      alert(error.message || 'Failed to delete dispatch plan.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#64748b', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
        <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading dispatch planning data...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.25rem' }}>
        {/* ─── LEFT: Planner form ──────────────────────────────────────── */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          borderTop: '3px solid #2563eb',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.2rem',
                color: '#fff',
                boxShadow: '0 3px 10px rgba(37,99,235,0.3)',
                flexShrink: 0,
              }}>
                📦
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '0.15rem' }}>
                  Resource Allocation
                </div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                  Dispatch &amp; Allocation Planner
                </h2>
              </div>
            </div>
            <span style={{
              background: '#dbeafe',
              color: '#1d4ed8',
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}>
              ⚡ Live
            </span>
          </div>

          {/* ─── Incident dropdown ────────────────────────────────────── */}
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <label style={fieldStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🎯</span>
                <span>Select Approved Incident</span>
                <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.75rem' }}>(optional)</span>
              </span>
              <select
                value={selectedIncidentId}
                onChange={(e) => handleIncidentSelect(e.target.value)}
                style={{
                  ...inputStyle,
                  background: selectedIncidentId ? '#f0fdf4' : '#fff',
                  borderColor: selectedIncidentId ? '#86efac' : '#cbd5e1',
                  fontWeight: 600,
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
                padding: '0.55rem 0.75rem',
                background: '#dbeafe',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#1e40af',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>ℹ️</span>
                  <span>Mission ID + District auto-filled from incident.</span>
                </span>
                <button
                  onClick={handleClearIncident}
                  style={{
                    border: '1px solid #1e40af',
                    background: '#fff',
                    color: '#1e40af',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* ─── Form grid ────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
            <label style={fieldStyle}>
              <span>Mission ID</span>
              <input
                value={missionId}
                onChange={(e) => setMissionId(e.target.value)}
                style={{
                  ...inputStyle,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.82rem',
                  background: selectedIncidentId ? '#f0fdf4' : '#fff',
                }}
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
              <input
                type="number"
                min={1}
                max={20}
                value={teamsRequired}
                onChange={(e) => setTeamsRequired(Number(e.target.value) || 1)}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span>Reference Warehouse <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.72rem' }}>(agent may choose another)</span></span>
              <select value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)} style={inputStyle}>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </label>
          </div>

          {/* ─── Suggested allocation ────────────────────────────────── */}
          <div style={{ marginTop: '1.1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <strong style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>📊 Suggested allocation</strong>
              <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>{selectedWarehouse?.name ?? 'Warehouse'}</span>
            </div>
            {allocatableItems.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.82rem', padding: '0.5rem 0' }}>No stock available for this warehouse.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.45rem' }}>
                {allocatableItems.slice(0, 6).map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{item.itemName}</div>
                      <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{item.quantityAvailable} {item.unit} available</div>
                    </div>
                    <div style={{ color: '#2563eb', fontWeight: 800, fontSize: '0.85rem' }}>
                      {Math.max(1, Math.ceil(item.quantityAvailable / 2))} units
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.1rem' }}>
            <button
              onClick={handleCreatePlan}
              disabled={submitting}
              style={{
                ...primaryButtonStyle,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? '⏳ Planning...' : '✨ Generate Dispatch Plan'}
            </button>
          </div>
        </div>

        {/* ─── RIGHT: Dispatch queue ──────────────────────────────────── */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          borderTop: '3px solid #7c3aed',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.2rem',
                color: '#fff',
                boxShadow: '0 3px 10px rgba(124,58,237,0.3)',
                flexShrink: 0,
              }}>
                🚚
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '0.15rem' }}>
                  Operations
                </div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                  Dispatch Queue
                </h3>
              </div>
            </div>
            <span style={{
              background: '#ede9fe',
              color: '#6d28d9',
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.03em',
              flexShrink: 0,
            }}>
              {plans.length} plan{plans.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* ─── Filter chips ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <FilterChip
              label={`All (${plans.length})`}
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              color="#2563eb"
            />
            <FilterChip
              label={`🚨 From Incident (${incidentCount})`}
              active={filter === 'incident'}
              onClick={() => setFilter('incident')}
              color="#dc2626"
            />
            <FilterChip
              label={`Manual (${plans.length - incidentCount})`}
              active={filter === 'manual'}
              onClick={() => setFilter('manual')}
              color="#64748b"
            />
          </div>

          {/* ─── Scrollable list ──────────────────────────────────────── */}
          {filteredPlans.length === 0 ? (
            <div style={{
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '2rem 1rem',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.82rem',
            }}>
              {plans.length === 0
                ? 'No dispatch plans have been generated yet.'
                : 'No dispatch plans match the current filter.'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '0.65rem',
              maxHeight: 'calc(100vh - 300px)',
              overflowY: 'auto',
              paddingRight: '0.35rem',
            }}>
              {filteredPlans.map((plan) => (
                <DispatchCard
                  key={plan.id}
                  plan={plan}
                  approving={approvingId === plan.id}
                  deleting={deletingId === plan.id}
                  onApprove={() => approvePlan(plan.id)}
                  onDelete={() => handleDelete(plan)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Filter chip ────────────────────────────────────────────────────────────
const FilterChip: React.FC<{ label: string; active: boolean; onClick: () => void; color: string }> = ({
  label, active, onClick, color,
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.4rem 0.75rem',
      borderRadius: '999px',
      border: active ? `1px solid ${color}` : '1px solid #cbd5e1',
      background: active ? `${color}15` : '#fff',
      color: active ? color : '#475569',
      fontWeight: 700,
      fontSize: '0.72rem',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }}
  >
    {label}
  </button>
);

// ─── Dispatch plan card ─────────────────────────────────────────────────────
interface DispatchCardProps {
  plan: DispatchPlan;
  approving: boolean;
  deleting: boolean;
  onApprove: () => void;
  onDelete: () => void;
}

const DispatchCard: React.FC<DispatchCardProps> = ({
  plan, approving, deleting, onApprove, onDelete,
}) => {
  const isApproved = plan.approvalStatus === 'Approved';
  const isRejected = plan.approvalStatus === 'Rejected';

  const statusColor = isApproved ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b';
  const statusBg = isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7';
  const statusText = isApproved ? '#166534' : isRejected ? '#991b1b' : '#92400e';

  return (
    <div style={{
      border: plan.isIncidentLinked ? '1px solid #fecaca' : '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '0.85rem 0.95rem',
      background: plan.isIncidentLinked
        ? 'linear-gradient(90deg, #fef2f2 0%, #ffffff 100%)'
        : 'linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)',
      borderLeft: `3px solid ${statusColor}`,
      transition: 'all 0.15s ease',
    }}>
      {/* Incident badge */}
      {plan.isIncidentLinked && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: 'linear-gradient(135deg, #dc2626, #ef4444)',
          color: '#fff',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
          boxShadow: '0 2px 6px rgba(220,38,38,0.25)',
        }}>
          🚨 From Incident · {plan.incidentDisasterType}
          {plan.incidentSeverity && ` · ${plan.incidentSeverity}`}
        </div>
      )}

      {/* Header row — Mission ID + status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', marginBottom: '0.55rem' }}>
        <strong style={{
          fontSize: '0.75rem',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          color: '#0f172a',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
        }}>
          {plan.missionId}
        </strong>
        <span style={{
          padding: '0.25rem 0.55rem',
          borderRadius: '999px',
          fontSize: '0.65rem',
          fontWeight: 800,
          background: statusBg,
          color: statusText,
          letterSpacing: '0.02em',
          flexShrink: 0,
        }}>
          {plan.approvalStatus}
        </span>
      </div>

      {/* Meta */}
      <div style={{ color: '#475569', fontSize: '0.78rem', lineHeight: 1.55 }}>
        {plan.isIncidentLinked && plan.incidentCreatedAt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}>
            <span style={{ color: '#64748b' }}>🕒</span>
            <span>Reported {new Date(plan.incidentCreatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ color: '#64748b' }}>📍</span>
          <span><strong>District:</strong> {plan.district}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ color: '#64748b' }}>🏬</span>
          <span><strong>Warehouse:</strong> {plan.warehouseName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ color: '#64748b' }}>👥</span>
          <span><strong>Teams:</strong> {plan.teamsRequired}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ color: '#64748b' }}>⏱️</span>
          <span><strong>ETA:</strong> {plan.estimatedArrivalMinutes} min</span>
        </div>
      </div>

      {/* Route summary */}
      {plan.routeSummary && (
        <div style={{
          marginTop: '0.45rem',
          padding: '0.45rem 0.6rem',
          background: '#f1f5f9',
          borderRadius: '6px',
          color: '#475569',
          fontStyle: 'italic',
          fontSize: '0.72rem',
          lineHeight: 1.4,
        }}>
          {plan.routeSummary}
        </div>
      )}

      {/* Items */}
      <div style={{ marginTop: '0.55rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {plan.items.map((item) => (
          <span
            key={`${plan.id}-${item.itemName}`}
            style={{
              background: '#e0e7ff',
              color: '#3730a3',
              padding: '0.15rem 0.55rem',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 700,
            }}
          >
            {item.itemName}: {item.quantity}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ marginTop: '0.7rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {!isApproved && !isRejected && (
          <button
            onClick={onApprove}
            disabled={approving || deleting}
            style={{
              ...actionBtnStyle,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              opacity: approving || deleting ? 0.6 : 1,
              cursor: approving || deleting ? 'wait' : 'pointer',
            }}
          >
            {approving ? '⏳ Approving...' : '✓ Approve dispatch'}
          </button>
        )}

        {!isApproved && (
          <button
            onClick={onDelete}
            disabled={deleting || approving}
            style={{
              ...actionBtnStyle,
              background: '#fff',
              color: '#dc2626',
              border: '1px solid #fecaca',
              opacity: deleting || approving ? 0.6 : 1,
              cursor: deleting || approving ? 'wait' : 'pointer',
            }}
          >
            {deleting ? '⏳ Deleting...' : '🗑️ Delete'}
          </button>
        )}

        {isApproved && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#166534',
          }}>
            ✓ Approved · preserved for audit
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  color: '#334155',
  fontSize: '0.8rem',
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '0.6rem 0.75rem',
  fontSize: '0.85rem',
  color: '#0f172a',
  background: '#fff',
  fontFamily: 'inherit',
  outline: 'none',
};

const primaryButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  color: '#fff',
  padding: '0.7rem 1.1rem',
  borderRadius: '9px',
  fontWeight: 800,
  fontSize: '0.85rem',
  cursor: 'pointer',
  boxShadow: '0 3px 10px rgba(37,99,235,0.25)',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  borderRadius: '7px',
  fontWeight: 700,
  fontSize: '0.72rem',
  transition: 'all 0.15s ease',
};