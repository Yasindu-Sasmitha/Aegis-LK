import React, { useEffect, useState } from 'react';
import { fetchShelters, createShelter, updateShelterOccupancy } from '../api/recoveryApi';
import { ShelterList } from '../components/ShelterList';
import { Shelter } from '../types/recoveryTypes';

const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya',
];

export const ShelterManagementPage: React.FC = () => {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfficer, setIsOfficer] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    location: '',
    district: 'Kalutara',
    latitude: 6.5854,
    longitude: 79.9607,
    capacity: 150,
    contactPerson: '',
    contactPhone: '',
    facilities: 'Clean Water, Sanitation, Hot Meals, Emergency Medical Post, Generator',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchShelters(selectedDistrict === 'all' ? undefined : selectedDistrict);
      setShelters(Array.isArray(data) ? data : (data as any).items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDistrict]);

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
    if (!form.name.trim() || !form.location.trim()) {
      alert('Please fill in the shelter name and location.');
      return;
    }

    setSubmitting(true);
    try {
      await createShelter(form);
      setShowModal(false);
      setForm({
        name: '',
        location: '',
        district: 'Kalutara',
        latitude: 6.5854,
        longitude: 79.9607,
        capacity: 150,
        contactPerson: '',
        contactPhone: '',
        facilities: 'Clean Water, Sanitation, Hot Meals, Emergency Medical Post, Generator',
      });
      loadData();
      alert('New emergency relief shelter registered successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to register shelter');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredShelters = shelters.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      s.district.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q)
    );
  });

  const totalCap = shelters.reduce((sum, s) => sum + (s.capacity || 0), 0);
  const totalOcc = shelters.reduce((sum, s) => sum + (s.currentOccupancy || 0), 0);
  const totalAvailableBeds = Math.max(0, totalCap - totalOcc);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── HEADER & ROLE SWITCHER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.85rem' }}>⛺</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#0f172a' }}>
              Emergency Shelter & Evacuation Network
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Real-time bed availability tracking, relief camp logistics, and citizen evacuation reception centers.
          </p>
        </div>

        {/* User Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.4rem 0.75rem', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Active Mode:</span>
          <button
            onClick={() => setIsOfficer(!isOfficer)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              background: isOfficer ? '#1e3a8a' : '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>{isOfficer ? '🛡️ Camp Officer View' : '👤 Citizen / Evacuee View'}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>(Click to switch)</span>
          </button>
        </div>
      </div>

      {/* ── METRICS & ACTION BUTTON ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Relief Centers</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>{shelters.length} Shelters</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Available Bed Capacity</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', margin: '0.2rem 0' }}>{totalAvailableBeds} Beds Open</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Current Sheltered Population</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', margin: '0.2rem 0' }}>{totalOcc} / {totalCap}</div>
        </div>

        {isOfficer && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowModal(true)}
              style={{
                width: '100%',
                height: '100%',
                padding: '0.85rem 1.25rem',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <span>➕</span>
              <span>Register Emergency Shelter</span>
            </button>
          </div>
        )}
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Filter District:</span>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            style={{ padding: '0.45rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', background: '#fff' }}
          >
            <option value="all">All Districts Islandwide</option>
            {SRI_LANKA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <input
          type="text"
          placeholder="🔍 Search shelter name, location, contact..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '0.45rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', minWidth: '260px' }}
        />
      </div>

      {/* ── SHELTER CARDS LIST ── */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <p>Loading emergency shelters...</p>
        </div>
      ) : (
        <ShelterList shelters={filteredShelters} isOfficer={isOfficer} onOccupancyChange={isOfficer ? handleOccupancyChange : undefined} />
      )}

      {/* ── REGISTER SHELTER MODAL ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', width: '540px', maxWidth: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⛺</span>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Register Emergency Relief Shelter
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Facility / Shelter Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kalutara Royal College Emergency Shelter"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Street / Town Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Galle Road, Kalutara North"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    District *
                  </label>
                  <select
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }}
                  >
                    {SRI_LANKA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Max Bed Capacity *
                  </label>
                  <input
                    type="number"
                    min={10}
                    required
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Coordinator Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0771234567"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Camp Coordinator Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunil Perera (Grama Niladhari)"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Available On-Site Facilities
                </label>
                <input
                  type="text"
                  placeholder="e.g. Clean Water, Sanitation, Hot Meals, Emergency Medical Post, Generator"
                  value={form.facilities}
                  onChange={(e) => setForm({ ...form, facilities: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.65rem 1.25rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Registering...' : '✓ Register Shelter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
