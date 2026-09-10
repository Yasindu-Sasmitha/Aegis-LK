import React, { useEffect, useState } from 'react';
import { fetchShelters, createShelter, updateShelterOccupancy } from '../api/recoveryApi';
import { ShelterList } from '../components/ShelterList';
import { Shelter } from '../types/recoveryTypes';

export const ShelterManagementPage: React.FC = () => {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    location: '',
    district: 'Kalutara',
    latitude: 6.5854,
    longitude: 79.9607,
    capacity: 100,
    contactPerson: '',
    contactPhone: '',
    facilities: 'Water, Sanitation, First Aid',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchShelters();
      setShelters(Array.isArray(data) ? data : (data as any).items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOccupancyChange = async (id: string, newOccupancy: number) => {
    try {
      await updateShelterOccupancy(id, newOccupancy);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createShelter(form);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>⛺ Emergency Shelter Management</h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0' }}>Monitor shelter capacities, update occupancy, and register new relief centers.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          + Register Shelter
        </button>
      </div>

      {loading ? <div>Loading shelters...</div> : <ShelterList shelters={shelters} onOccupancyChange={handleOccupancyChange} />}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleCreate} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', width: '450px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Register Emergency Shelter</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input placeholder="Shelter Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input placeholder="Location Address" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input placeholder="District" required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input type="number" placeholder="Capacity" required min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input placeholder="Contact Person" required value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input placeholder="Contact Phone" required value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input placeholder="Facilities (JSON/CSV)" value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Shelter</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
