import React, { useEffect, useState } from 'react';
import { createWarehouse, fetchWarehouses, updateWarehouse } from '../api/resourceApi';
import type { CreateWarehouseDto, Warehouse } from '../types/resourceTypes';

const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya',
];

const normalizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 10);

const isValidPhone = (value: string) => /^\d{10}$/.test(normalizePhone(value));

const emptyForm = (): CreateWarehouseDto => ({
  name: '',
  district: 'Colombo',
  latitude: 6.9271,
  longitude: 79.8612,
  contactPhone: '',
});

interface WarehouseManagementPageProps {
  onDataChange?: () => void;
  refreshKey?: number;
}

export const WarehouseManagementPage: React.FC<WarehouseManagementPageProps> = ({ onDataChange, refreshKey }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateWarehouseDto>(emptyForm());

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchWarehouses({ page: 1, pageSize: 50 });
      setWarehouses(res.items ?? []);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEditModal = (warehouse: Warehouse) => {
    setEditingId(warehouse.id);
    setForm({
      name: warehouse.name,
      district: warehouse.district,
      latitude: Number(warehouse.latitude),
      longitude: Number(warehouse.longitude),
      contactPhone: warehouse.contactPhone ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert('Warehouse name is required.');
      return;
    }

    if (!form.district.trim()) {
      alert('District is required.');
      return;
    }

    if (Number(form.latitude) < -90 || Number(form.latitude) > 90) {
      alert('Latitude must be between -90 and 90.');
      return;
    }

    if (Number(form.longitude) < -180 || Number(form.longitude) > 180) {
      alert('Longitude must be between -180 and 180.');
      return;
    }

    const phone = normalizePhone(form.contactPhone ?? '');
    if (!phone) {
      alert('Contact phone number is required.');
      return;
    }

    if (!isValidPhone(phone)) {
      alert('Please enter a valid 10-digit contact phone number.');
      return;
    }

    setForm({ ...form, contactPhone: phone });
    setSubmitting(true);
    try {
      if (editingId) {
        await updateWarehouse(editingId, form);
      } else {
        await createWarehouse(form);
      }

      onDataChange?.();
      setShowModal(false);
      setForm(emptyForm());
      setEditingId(null);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to save warehouse.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#64748b' }}>Loading warehouses...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 8px 20px rgba(15,23,42,0.06)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Resource Module</div>
            <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.8rem' }}>Warehouse Management</h2>
          </div>
          <button
            onClick={openCreateModal}
            style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            + Add Warehouse
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={cellStyle}>Warehouse</th>
                <th style={cellStyle}>District</th>
                <th style={cellStyle}>Inventory</th>
                <th style={cellStyle}>Vehicles</th>
                <th style={cellStyle}>Coordinates</th>
                <th style={cellStyle}>Contact</th>
                <th style={cellStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={cellStyle}><strong>{warehouse.name}</strong></td>
                  <td style={cellStyle}>{warehouse.district}</td>
                  <td style={cellStyle}>{warehouse.inventoryItemCount ?? 0}</td>
                  <td style={cellStyle}>{warehouse.vehicleCount ?? 0}</td>
                  <td style={cellStyle}>{warehouse.latitude}, {warehouse.longitude}</td>
                  <td style={cellStyle}>{warehouse.contactPhone ?? '—'}</td>
                  <td style={cellStyle}>
                    <button
                      onClick={() => openEditModal(warehouse)}
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
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{editingId ? 'Edit Warehouse' : 'Add Warehouse'}</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
                <label style={fieldLabelStyle}>
                  <span>Warehouse name</span>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} required />
                </label>

                <label style={fieldLabelStyle}>
                  <span>District</span>
                  <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} style={inputStyle} required>
                    {SRI_LANKA_DISTRICTS.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </label>

                <label style={fieldLabelStyle}>
                  <span>Latitude</span>
                  <input type="number" step="0.0001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} style={inputStyle} required />
                </label>

                <label style={fieldLabelStyle}>
                  <span>Longitude</span>
                  <input type="number" step="0.0001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} style={inputStyle} required />
                </label>

                <label style={{ ...fieldLabelStyle, gridColumn: '1 / -1' }}>
                  <span>Contact phone</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={form.contactPhone ?? ''}
                    onChange={(e) => setForm({ ...form, contactPhone: normalizePhone(e.target.value) })}
                    style={inputStyle}
                    placeholder="0771234567"
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={secondaryButtonStyle}>Cancel</button>
                <button type="submit" disabled={submitting} style={primaryButtonStyle}>{submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Warehouse'}</button>
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
  background: '#2563eb',
  color: '#fff',
  padding: '0.7rem 1rem',
  borderRadius: '10px',
  fontWeight: 700,
  cursor: 'pointer',
};
