import React, { useEffect, useState } from 'react';
import { fetchNGOs, createNGO } from '../api/recoveryApi';
import { NGO } from '../types/recoveryTypes';
import { useAuth } from '../../../shared/auth/AuthContext';

const SRI_LANKA_DISTRICTS = [
  'All Districts', 'Islandwide', 'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa',
  'Colombo', 'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy',
  'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara',
  'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam',
  'Ratnapura', 'Trincomalee', 'Vavuniya',
];

const SECTOR_OPTIONS = [
  'Medical',
  'Emergency Relief',
  'Water & Sanitation',
  'Housing Reconstruction',
  'Infrastructure',
  'Shelter Repair',
  'Food Distribution',
  'Community Support',
  'Livelihood Recovery',
  'Child Protection',
  'Psychosocial Support',
];

export const NGOManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isOfficer = user?.role === 'DisasterOfficer' || user?.role === 'Admin';
  const isCitizen = user?.role === 'Citizen';

  const [ngos, setNgos] = useState<NGO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const [form, setForm] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    sectors: [] as string[],
    operatingDistricts: [] as string[],
    assignedBudget: 3000000,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchNGOs();
      setNgos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load NGOs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!form.name.trim()) errors.name = 'Organization name is required.';
    if (!form.contactEmail.trim() || !form.contactEmail.includes('@')) {
      errors.contactEmail = 'Valid contact email is required.';
    }
    if (!form.contactPhone.trim()) errors.contactPhone = 'Contact phone number is required.';
    if (form.sectors.length === 0) errors.sectors = 'Please select at least one humanitarian sector.';
    if (form.operatingDistricts.length === 0) errors.operatingDistricts = 'Please select at least one operating district.';
    if (form.assignedBudget < 0) errors.assignedBudget = 'Capacity budget cannot be negative.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await createNGO({
        name: form.name.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        sectors: form.sectors.join(', '),
        operatingDistricts: form.operatingDistricts.join(', '),
        assignedBudget: form.assignedBudget,
        status: 'Active',
      });
      setShowModal(false);
      setForm({
        name: '',
        contactEmail: '',
        contactPhone: '',
        sectors: [],
        operatingDistricts: [],
        assignedBudget: 3000000,
      });
      setFormErrors({});
      loadData();
      alert('New partner organization registered successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to register partner organization.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSector = (sec: string) => {
    setForm(prev => ({
      ...prev,
      sectors: prev.sectors.includes(sec)
        ? prev.sectors.filter(s => s !== sec)
        : [...prev.sectors, sec],
    }));
  };

  const toggleDistrict = (dist: string) => {
    setForm(prev => ({
      ...prev,
      operatingDistricts: prev.operatingDistricts.includes(dist)
        ? prev.operatingDistricts.filter(d => d !== dist)
        : [...prev.operatingDistricts, dist],
    }));
  };

  // Filter NGOs
  const filteredNGOs = ngos.filter(ngo => {
    const matchesSearch =
      ngo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ngo.sectors.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ngo.operatingDistricts.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSector =
      selectedSector === 'all' ||
      ngo.sectors.toLowerCase().includes(selectedSector.toLowerCase());

    const matchesDistrict =
      selectedDistrict === 'all' ||
      ngo.operatingDistricts.toLowerCase().includes(selectedDistrict.toLowerCase()) ||
      ngo.operatingDistricts.toLowerCase().includes('all districts') ||
      ngo.operatingDistricts.toLowerCase().includes('islandwide');

    return matchesSearch && matchesSector && matchesDistrict;
  });

  const totalBudget = ngos.reduce((acc, curr) => acc + (curr.assignedBudget || 0), 0);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      {/* ── HEADER & AUTH ROLE BADGE ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.85rem' }}>🏢</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#0f172a' }}>
              Partner Organizations (NGO Registry)
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Accredited non-governmental relief agencies. The <strong>Agentic AI Recovery Planner</strong> dynamically matches these partners to emergency reconstruction tasks.
          </p>
        </div>

        {/* Action Button & Role Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.45rem 0.85rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Logged in as:</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '6px',
              background: user?.role === 'Admin' ? '#faf5ff' : user?.role === 'DisasterOfficer' ? '#eff6ff' : user?.role === 'Responder' ? '#fffbeb' : '#f0fdf4',
              color: user?.role === 'Admin' ? '#7e22ce' : user?.role === 'DisasterOfficer' ? '#1e40af' : user?.role === 'Responder' ? '#b45309' : '#15803d',
              border: `1px solid ${user?.role === 'Admin' ? '#e9d5ff' : user?.role === 'DisasterOfficer' ? '#bfdbfe' : user?.role === 'Responder' ? '#fde68a' : '#bbf7d0'}`,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {user?.role === 'Admin' ? '⚙️ System Admin' : user?.role === 'DisasterOfficer' ? '🛡️ Disaster Officer' : user?.role === 'Responder' ? '🚨 Field Responder' : '👥 Citizen'}
            </span>
          </div>

          {isOfficer && (
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '0.75rem 1.25rem',
                background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>➕</span>
              <span>Register Partner NGO</span>
            </button>
          )}
        </div>
      </div>

      {/* Citizen Informational Banner */}
      {isCitizen && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: '#eff6ff',
          border: '1px solid #dbeafe',
          borderLeft: '4px solid #2563eb',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          fontSize: '0.9rem',
          color: '#1e40af',
        }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>ℹ️</span>
          <div>
            <strong>Accredited Disaster Relief Registry:</strong> These vetted humanitarian organizations are partnered with the Ministry of Disaster Management to provide relief, rebuilding, and specialized support during emergencies.
          </div>
        </div>
      )}

      {/* ── METRICS SUMMARY CARDS (Pattern matching Reference Image 1) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          padding: '1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Accredited Partners</span>
            <span style={{ fontSize: '1.25rem' }}>🏢</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{ngos.length} NGOs</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>Verified Relief Agencies</div>
        </div>

        <div style={{
          padding: '1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ color: '#166534', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Active in Operations</span>
            <span style={{ fontSize: '1.25rem' }}>✅</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>
            {ngos.filter(n => n.status === 'Active').length} Active
          </div>
          <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.25rem' }}>Available for AI matching</div>
        </div>

        <div style={{
          padding: '1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ color: '#1e40af', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Capacity Budgets</span>
            <span style={{ fontSize: '1.25rem' }}>💰</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1d4ed8' }}>
            Rs. {totalBudget.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>Allocated partner relief grants</div>
        </div>

        <div style={{
          padding: '1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e9d5ff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ color: '#7e22ce', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>District Coverage</span>
            <span style={{ fontSize: '1.25rem' }}>📍</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7e22ce' }}>25 / 25</div>
          <div style={{ fontSize: '0.8rem', color: '#7e22ce', marginTop: '0.25rem' }}>Islandwide deployment</div>
        </div>
      </div>

      {/* ── FILTERS & SEARCH BAR ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        marginBottom: '1.5rem',
        backgroundColor: '#ffffff',
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ flex: '1 1 260px', minWidth: '220px' }}>
          <input
            type="text"
            placeholder="🔍 Search organization name, sector, or district..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.6rem 0.85rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ flex: '0 0 auto' }}>
          <select
            value={selectedSector}
            onChange={e => setSelectedSector(e.target.value)}
            style={{
              padding: '0.6rem 0.85rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          >
            <option value="all">🌐 All Sectors</option>
            {SECTOR_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '0 0 auto' }}>
          <select
            value={selectedDistrict}
            onChange={e => setSelectedDistrict(e.target.value)}
            style={{
              padding: '0.6rem 0.85rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          >
            <option value="all">📍 All Districts</option>
            {SRI_LANKA_DISTRICTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── NGO CARDS GRID ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <p>Loading accredited NGO partner organizations...</p>
        </div>
      ) : filteredNGOs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          color: '#64748b',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏢</div>
          <h3 style={{ color: '#0f172a', margin: '0 0 0.25rem' }}>No Partner Organizations Found</h3>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Try adjusting your search query or sector filters.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.25rem',
        }}>
          {filteredNGOs.map(ngo => {
            const sectorsList = ngo.sectors.split(',').map(s => s.trim()).filter(Boolean);
            const districtsList = ngo.operatingDistricts.split(',').map(d => d.trim()).filter(Boolean);

            return (
              <div
                key={ngo.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                      {ngo.name}
                    </h3>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      backgroundColor: ngo.status === 'Active' ? '#dcfce7' : '#f1f5f9',
                      color: ngo.status === 'Active' ? '#15803d' : '#64748b',
                      border: `1px solid ${ngo.status === 'Active' ? '#bbf7d0' : '#e2e8f0'}`,
                      textTransform: 'uppercase',
                    }}>
                      {ngo.status === 'Active' ? 'Active Partner' : 'Inactive'}
                    </span>
                  </div>

                  {/* Contact Details */}
                  <div style={{ fontSize: '0.825rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '1rem' }}>
                    {ngo.contactEmail && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✉️</span> <span>{ngo.contactEmail}</span>
                      </div>
                    )}
                    {ngo.contactPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📞</span> <span>{ngo.contactPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Sectors Badges */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Specialized Sectors
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {sectorsList.map((sec, idx) => (
                        <span
                          key={idx}
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#1e40af',
                            border: '1px solid #bfdbfe',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Operating Districts */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Operating Districts
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.4 }}>
                      📍 {districtsList.join(', ')}
                    </div>
                  </div>
                </div>

                {/* Footer / Budget Grant */}
                <div style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Capacity Grant</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#b45309' }}>
                      LKR {ngo.assignedBudget?.toLocaleString() ?? 0}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.725rem',
                    color: '#0f766e',
                    backgroundColor: '#ccfbf1',
                    border: '1px solid #99f6e4',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}>
                    AI Matching Ready
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── REGISTER PARTNER MODAL ── */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏢</span> Register Humanitarian Partner (NGO)
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Organization Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. UNICEF Sri Lanka, Lions Club Colombo"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: '#f8fafc',
                      border: formErrors.name ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '0.875rem',
                    }}
                  />
                  {formErrors.name && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem' }}>{formErrors.name}</div>}
                </div>

                {/* Email & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                      placeholder="e.g. relief@unicef.lk"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#f8fafc',
                        border: formErrors.contactEmail ? '1px solid #ef4444' : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        fontSize: '0.875rem',
                      }}
                    />
                    {formErrors.contactEmail && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem' }}>{formErrors.contactEmail}</div>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                      Contact Phone *
                    </label>
                    <input
                      type="text"
                      value={form.contactPhone}
                      onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                      placeholder="e.g. +94 11 269 1095"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#f8fafc',
                        border: formErrors.contactPhone ? '1px solid #ef4444' : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        fontSize: '0.875rem',
                      }}
                    />
                    {formErrors.contactPhone && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem' }}>{formErrors.contactPhone}</div>}
                  </div>
                </div>

                {/* Sectors Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    Humanitarian Sectors *
                  </label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    padding: '0.65rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: formErrors.sectors ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  }}>
                    {SECTOR_OPTIONS.map(sec => {
                      const isSelected = form.sectors.includes(sec);
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => toggleSector(sec)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: `1px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                            backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                            color: isSelected ? '#1e40af' : '#64748b',
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '} {sec}
                        </button>
                      );
                    })}
                  </div>
                  {formErrors.sectors && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem' }}>{formErrors.sectors}</div>}
                </div>

                {/* Operating Districts */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    Operating Districts *
                  </label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    maxHeight: '110px',
                    overflowY: 'auto',
                    padding: '0.65rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: formErrors.operatingDistricts ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  }}>
                    {SRI_LANKA_DISTRICTS.map(dist => {
                      const isSelected = form.operatingDistricts.includes(dist);
                      return (
                        <button
                          key={dist}
                          type="button"
                          onClick={() => toggleDistrict(dist)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            border: `1px solid ${isSelected ? '#16a34a' : '#cbd5e1'}`,
                            backgroundColor: isSelected ? '#dcfce7' : '#ffffff',
                            color: isSelected ? '#15803d' : '#64748b',
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '} {dist}
                        </button>
                      );
                    })}
                  </div>
                  {formErrors.operatingDistricts && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem' }}>{formErrors.operatingDistricts}</div>}
                </div>

                {/* Assigned Capacity Grant Budget */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    Assigned Capacity Budget Grant (LKR) *
                  </label>
                  <input
                    type="number"
                    value={form.assignedBudget}
                    onChange={e => setForm({ ...form, assignedBudget: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 5000000"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: '#f8fafc',
                      border: formErrors.assignedBudget ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '0.875rem',
                    }}
                  />
                  {formErrors.assignedBudget && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem' }}>{formErrors.assignedBudget}</div>}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.6rem 1.15rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  {submitting ? 'Registering...' : 'Register Partner Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
