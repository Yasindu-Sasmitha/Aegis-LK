import React, { useEffect, useState } from 'react';
import { createInventoryItem, fetchInventoryItems, fetchWarehouses, updateInventoryItem } from '../api/resourceApi';
import type { CreateInventoryDto, InventoryItem, UpdateInventoryDto, Warehouse } from '../types/resourceTypes';
import { getItemTypeLabel } from '../types/resourceTypes';

const ITEM_TYPE_OPTIONS = ['Food', 'Medical', 'Shelter', 'RescueEquipment', 'Fuel', 'Other'];

const emptyForm = (warehouseId?: string): CreateInventoryDto => ({
  warehouseId: warehouseId ?? '',
  itemName: '',
  itemType: 'Food',
  quantityAvailable: 0,
  unit: 'units',
  reorderThreshold: 0,
});

interface InventoryManagementPageProps {
  onDataChange?: () => void;
  onNavigate?: (tab: string) => void;
  refreshKey?: number;
}

export const InventoryManagementPage: React.FC<InventoryManagementPageProps> = ({ onDataChange, onNavigate, refreshKey }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateInventoryDto>(emptyForm());

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryRes, warehouseRes] = await Promise.all([
        fetchInventoryItems({ page: 1, pageSize: 50 }),
        fetchWarehouses({ page: 1, pageSize: 50 }),
      ]);

      setInventory(inventoryRes.items ?? []);
      setWarehouses(warehouseRes.items ?? []);

      if (!form.warehouseId && (warehouseRes.items?.length ?? 0) > 0) {
        setForm((prev) => ({ ...prev, warehouseId: warehouseRes.items[0].id }));
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const openCreateModal = () => {
    const defaultWarehouseId = warehouses[0]?.id ?? '';
    setEditingId(null);
    setForm(emptyForm(defaultWarehouseId));
    setShowModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      warehouseId: item.warehouseId,
      itemName: item.itemName,
      itemType: item.itemType as any,
      quantityAvailable: item.quantityAvailable,
      unit: item.unit,
      reorderThreshold: item.reorderThreshold ?? 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.warehouseId) {
      alert('Please select a warehouse.');
      return;
    }

    if (!form.itemName.trim()) {
      alert('Item name is required.');
      return;
    }

    if (form.quantityAvailable < 0) {
      alert('Quantity cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        itemType: form.itemType,
        reorderThreshold: form.reorderThreshold ?? 0,
      };

      if (editingId) {
        const updatePayload: UpdateInventoryDto = {
          itemName: payload.itemName,
          itemType: payload.itemType,
          quantityAvailable: payload.quantityAvailable,
          unit: payload.unit,
          reorderThreshold: payload.reorderThreshold,
        };
        await updateInventoryItem(editingId, updatePayload);
      } else {
        await createInventoryItem(payload);
      }

      onDataChange?.();
      setShowModal(false);
      setForm(emptyForm(warehouses[0]?.id ?? ''));
      setEditingId(null);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to save inventory item.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#64748b' }}>Loading inventory data...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 8px 20px rgba(15,23,42,0.06)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Resource Module</div>
            <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.8rem' }}>Inventory Management</h2>
          </div>
          <button onClick={openCreateModal} style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            + Add Stock Item
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={cellStyle}>Item</th>
                <th style={cellStyle}>Type</th>
                <th style={cellStyle}>Warehouse</th>
                <th style={cellStyle}>Quantity</th>
                <th style={cellStyle}>Threshold</th>
                <th style={cellStyle}>Status</th>
                <th style={cellStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={cellStyle}><strong>{item.itemName}</strong></td>
                  <td style={cellStyle}>{getItemTypeLabel(item.itemType)}</td>
                  <td style={cellStyle}>{item.warehouseName}</td>
                  <td style={cellStyle}>{item.quantityAvailable} {item.unit}</td>
                  <td style={cellStyle}>{item.reorderThreshold ?? '—'}</td>
                  <td style={cellStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: item.isLowStock ? '#fef3c7' : '#dcfce7',
                      color: item.isLowStock ? '#92400e' : '#166534',
                    }}>
                      {item.isLowStock ? 'Low Stock' : 'Healthy'}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <button
                      onClick={() => openEditModal(item)}
                      style={{ background: '#e0f2fe', border: 'none', borderRadius: 8, color: '#0c4a6e', fontWeight: 700, padding: '0.45rem 0.7rem', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={modalBackdropStyle} onClick={() => setShowModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{editingId ? 'Edit Stock Item' : 'Add Stock Item'}</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
                <label style={{ ...fieldLabelStyle, gridColumn: '1 / -1' }}>
                  <span>Warehouse</span>
                  {warehouses.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                      <div style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: '10px',
                        border: '1px solid #fcd34d',
                        background: '#fffbeb',
                        color: '#92400e',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}>
                        No warehouses available yet. Create a warehouse first before adding stock.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          onNavigate?.('warehouses');
                        }}
                        style={{
                          ...secondaryButtonStyle,
                          width: 'fit-content',
                          background: '#f8fafc',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        Go to Warehouses
                      </button>
                    </div>
                  ) : (
                    <select value={form.warehouseId || ''} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} style={inputStyle} disabled={!!editingId} required>
                      <option value="">Select a warehouse</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                      ))}
                    </select>
                  )}
                </label>

                <label style={fieldLabelStyle}>
                  <span>Item name</span>
                  <input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} style={inputStyle} required />
                </label>

                <label style={fieldLabelStyle}>
                  <span>Item type</span>
                  <select value={String(form.itemType)} onChange={(e) => setForm({ ...form, itemType: e.target.value as any })} style={inputStyle}>
                    {ITEM_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label style={fieldLabelStyle}>
                  <span>Quantity</span>
                  <input type="number" min={0} value={form.quantityAvailable} onChange={(e) => setForm({ ...form, quantityAvailable: Number(e.target.value) })} style={inputStyle} required />
                </label>

                <label style={fieldLabelStyle}>
                  <span>Unit</span>
                  <input value={form.unit ?? 'units'} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={inputStyle} />
                </label>

                <label style={{ ...fieldLabelStyle, gridColumn: '1 / -1' }}>
                  <span>Reorder threshold</span>
                  <input type="number" min={0} value={form.reorderThreshold ?? 0} onChange={(e) => setForm({ ...form, reorderThreshold: Number(e.target.value) })} style={inputStyle} />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={secondaryButtonStyle}>Cancel</button>
                <button type="submit" disabled={submitting} style={primaryButtonStyle}>{submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const cellStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.9rem 0.85rem',
  color: '#0f172a',
  fontSize: '0.87rem',
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.5)',
  display: 'grid',
  placeItems: 'center',
  padding: '1rem',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  width: 'min(720px, 100%)',
  borderRadius: '18px',
  padding: '1.25rem',
  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.2)',
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
  fontSize: '0.85rem',
  color: '#334155',
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

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  padding: '0.7rem 1rem',
  borderRadius: '10px',
  fontWeight: 700,
  cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
  border: 'none',
  background: '#16a34a',
  color: '#fff',
  padding: '0.7rem 1rem',
  borderRadius: '10px',
  fontWeight: 700,
  cursor: 'pointer',
};
