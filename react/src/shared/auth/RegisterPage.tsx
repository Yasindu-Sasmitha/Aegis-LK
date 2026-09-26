import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { AegisLogo } from '../components/AegisLogo';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa',
  'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
];

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { register, isLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [district, setDistrict] = useState('Colombo');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register({
        fullName,
        email,
        password,
        district,
        phoneNumber: phoneNumber.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="ae-auth-wrapper">
      {/* Top Header Strip */}
      <header className="ae-auth-topbar">
        <AegisLogo size={36} lightText={true} />
        <div className="ae-auth-topbar-tagline">
          Prepared Today &nbsp;•&nbsp; Safer Tomorrow
        </div>
      </header>

      {/* Main Split Body */}
      <div className="ae-auth-body">
        {/* Left Brand Panel */}
        <section className="ae-auth-left">
          <div className="ae-auth-left-content">
            <AegisLogo size={54} lightText={true} />

            <h1 className="ae-auth-headline">
              Join the<br />
              <span>Aegis-LK Community</span>
            </h1>

            <p className="ae-auth-description">
              Create your citizen account to receive verified hazard alerts, apply for relief assistance, and safeguard your loved ones during severe weather events.
            </p>

            {/* Feature Bullets */}
            <div className="ae-feature-bullets">
              <div className="ae-feature-bullet">
                <div className="ae-bullet-icon red">🔔</div>
                <div>
                  <div className="ae-bullet-title">Localized Early Warnings</div>
                  <div className="ae-bullet-desc">
                    Receive urgent rainfall and flood risk notifications mapped specifically to your home district.
                  </div>
                </div>
              </div>

              <div className="ae-feature-bullet">
                <div className="ae-bullet-icon blue">⛺</div>
                <div>
                  <div className="ae-bullet-title">Shelter & Emergency Relief</div>
                  <div className="ae-bullet-desc">
                    Locate active safe shelters, submit aid assistance requests, and track disaster relief support.
                  </div>
                </div>
              </div>

              <div className="ae-feature-bullet">
                <div className="ae-bullet-icon green">🤝</div>
                <div>
                  <div className="ae-bullet-title">Community Resilience</div>
                  <div className="ae-bullet-desc">
                    Connect with community volunteers and field response units when unexpected crises strike.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Left Watermark / Skyline Art */}
          <div className="ae-auth-left-bottom">
            <svg width="220" height="40" viewBox="0 0 220 40" fill="none" opacity="0.45">
              <path d="M10 38 L30 18 L50 38 M60 38 L75 10 L90 38 M95 38 L110 25 L125 38 M130 38 L145 15 L160 38 M170 38 L185 20 L200 38" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="0" y1="38" x2="220" y2="38" stroke="#64748b" strokeWidth="1.5" />
            </svg>
            <div className="ae-slogan-badge">
              <span>Sri Lanka Stronger Together</span>
              <span className="ae-slogan-flag" />
            </div>
          </div>
        </section>

        {/* Right Form Panel */}
        <section className="ae-auth-right">
          <div className="ae-auth-card" style={{ maxWidth: 510 }}>
            <div className="ae-auth-card-header" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <AegisLogo size={42} showText={false} />
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.2rem', color: '#0b2b52' }}>
                Aegis-LK
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                Sri Lanka Disaster Management System
              </div>

              <h2 className="ae-auth-card-title" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>
                Create Citizen Account
              </h2>
              <p className="ae-auth-card-sub">
                Register to view live disaster alerts and access community relief
              </p>
            </div>

            {/* Scope Note */}
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 10,
              padding: '0.65rem 0.85rem',
              color: '#1e40af',
              fontSize: '0.8rem',
              marginBottom: '1.25rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              lineHeight: 1.4
            }}>
              <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
              <span>
                Public registration is for <strong>Citizens</strong>. Staff and responder accounts are provisioned directly by the System Administrator.
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                padding: '0.75rem 1rem',
                color: '#b91c1c',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="ae-form-group">
                <label className="ae-form-label">Full Name</label>
                <div className="ae-input-wrapper">
                  <span className="ae-input-icon">👤</span>
                  <input
                    type="text"
                    required
                    className="ae-auth-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kasun Perera"
                  />
                </div>
              </div>

              <div className="ae-form-group">
                <label className="ae-form-label">Email Address</label>
                <div className="ae-input-wrapper">
                  <span className="ae-input-icon">✉️</span>
                  <input
                    type="email"
                    required
                    className="ae-auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. kasun@example.com"
                  />
                </div>
              </div>

              <div className="ae-form-group">
                <label className="ae-form-label">Password (min 6 characters)</label>
                <div className="ae-input-wrapper">
                  <span className="ae-input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="ae-auth-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.85rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      color: '#94a3b8',
                      padding: 0
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="ae-form-label">District</label>
                  <div className="ae-input-wrapper">
                    <span className="ae-input-icon">📍</span>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="ae-auth-input"
                      style={{ appearance: 'none', cursor: 'pointer' }}
                    >
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="ae-form-label">Phone (Optional)</label>
                  <div className="ae-input-wrapper">
                    <span className="ae-input-icon">📞</span>
                    <input
                      type="tel"
                      className="ae-auth-input"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+94 77 ..."
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="ae-auth-btn-primary"
                style={{ background: '#059669' }}
              >
                <span>{isLoading ? 'Creating Account...' : 'Complete Citizen Registration'}</span>
                <span>→</span>
              </button>
            </form>

            {/* Link back to Login */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284c7',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Sign In here
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Strip */}
      <footer className="ae-auth-footer">
        <div>
          <strong>Aegis-LK</strong> &nbsp;|&nbsp; Sri Lanka Disaster Management System
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span>🛡️</span>
          <span>Preparedness &nbsp;•&nbsp; Response &nbsp;•&nbsp; Recovery &nbsp;•&nbsp; Resilience</span>
        </div>
      </footer>
    </div>
  );
};

export default RegisterPage;
