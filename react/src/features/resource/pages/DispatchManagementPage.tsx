import React, { useEffect, useMemo, useState } from 'react';
import { createDispatchPlan, fetchInventoryItems, fetchWarehouses } from '../api/resourceApi';
import type { DispatchPlan, InventoryItem, Warehouse } from '../types/resourceTypes';

const DISTRICTS = [
  'Colombo', 'Kandy', 'Galle', 'Matara', 'Anuradhapura', 'Jaffna', 'Batticaloa', 'Kurunegala', 'Ratnapura', 'Badulla'
];

export const DispatchManagementPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Colombo');
  const [teamsRequired, setTeamsRequired] = useState(2);
  const [missionId, setMissionId] = useState('MISSION-DR-001');
  const [plans, setPlans] = useState<DispatchPlan[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [warehouseRes, inventoryRes] = await Promise.all([
          fetchWarehouses({ page: 1, pageSize: 50 }),
          fetchInventoryItems({ page: 1, pageSize: 50 }),
        ]);

        const warehouseList = warehouseRes.items ?? [];
        const inventoryList = inventoryRes.items ?? [];

        setWarehouses(warehouseList);
        setInventory(inventoryList);
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

  const handleCreatePlan = async () => {
    if (!selectedWarehouseId) {
      alert('Select a warehouse before creating a dispatch plan.');
      return;
    }

    if (allocatableItems.length === 0) {
      alert('No inventory is available at the selected warehouse for dispatch.');
      return;
    }

    setSubmitting(true);
    try {
      const items = allocatableItems.slice(0, 4).map((item) => ({
        itemName: item.itemName,
        quantity: Math.max(1, Math.min(item.quantityAvailable, Math.ceil(item.quantityAvailable / 2))),
      }));

      const plan = await createDispatchPlan({
        missionId,
        district: selectedDistrict,
        teamsRequired: teamsRequired,
        warehouseId: selectedWarehouseId,
        items,
      });

      setPlans((prev) => [plan, ...prev]);
    } catch (error: any) {
      alert(error.message || 'Failed to generate dispatch plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const approvePlan = (id: string) => {
    setPlans((prev) => prev.map((plan) => plan.id === id ? { ...plan, approvalStatus: 'Approved' } : plan));
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#64748b' }}>Loading dispatch planning data...</div>;
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.25rem' }}>
        <div style={{ background: '#fff', borderRadius: '18px', padding: '1.5rem', boxShadow: '0 8px 20px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Resource Allocation</div>
              <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.8rem' }}>Dispatch & Allocation Planner</h2>
            </div>
            <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.45rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>Live plan</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
            <label style={fieldStyle}>
              <span>Mission ID</span>
              <input value={missionId} onChange={(e) => setMissionId(e.target.value)} style={inputStyle} />
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
              <input type="number" min={1} max={12} value={teamsRequired} onChange={(e) => setTeamsRequired(Number(e.target.value) || 1)} style={inputStyle} />
            </label>

            <label style={fieldStyle}>
              <span>Warehouse</span>
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

        <div style={{ background: '#fff', borderRadius: '18px', padding: '1.5rem', boxShadow: '0 8px 20px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Dispatch queue</h3>
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{plans.length} plan(s)</span>
          </div>

          {plans.length === 0 ? (
            <div style={{ color: '#64748b', padding: '1rem 0' }}>
              No dispatch plans have been generated yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              {plans.map((plan) => (
                <div key={plan.id} style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '0.95rem', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                    <strong>{plan.missionId}</strong>
                    <span style={{
                      padding: '0.3rem 0.55rem',
                      borderRadius: '999px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: plan.approvalStatus === 'Approved' ? '#dcfce7' : plan.approvalStatus === 'Rejected' ? '#fee2e2' : '#fef3c7',
                      color: plan.approvalStatus === 'Approved' ? '#166534' : plan.approvalStatus === 'Rejected' ? '#991b1b' : '#92400e',
                    }}>
                      {plan.approvalStatus}
                    </span>
                  </div>

                  <div style={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.6 }}>
                    <div><strong>District:</strong> {plan.district}</div>
                    <div><strong>Warehouse:</strong> {plan.warehouseName}</div>
                    <div><strong>Teams:</strong> {plan.teamsRequired}</div>
                    <div><strong>ETA:</strong> {plan.estimatedArrivalMinutes} min</div>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    {plan.items.map((item) => (
                      <div key={`${plan.id}-${item.itemName}`} style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                        <span>{item.itemName}</span>
                        <strong>{item.quantity}</strong>
                      </div>
                    ))}
                  </div>

                  {plan.approvalStatus !== 'Approved' && (
                    <button onClick={() => approvePlan(plan.id)} style={{ marginTop: '0.75rem', ...secondaryButtonStyle }}>
                      Approve dispatch
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  padding: '0.55rem 0.8rem',
  borderRadius: '8px',
  fontWeight: 700,
  cursor: 'pointer',
};
