import React, { useState } from 'react';
import { useAuth } from './AuthContext';

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
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '1.5rem',
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        backgroundColor: '#1e293b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '2.5rem',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>👥</div>
          <h1 style={{ color: '#f8fafc', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Create Citizen Account</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Register to view live disaster alerts and access community relief
          </p>
        </div>

        {/* Info Note on Citizen Scope */}
        <div style={{
          backgroundColor: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 8,
          padding: '0.75rem 1rem',
          color: '#93c5fd',
          fontSize: '0.8rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
        }}>
          <span>ℹ️</span>
          <span>Public registration is for <strong>Citizens</strong>. Staff accounts are provisioned directly by the System Administrator.</span>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239,68,68,0.15)',
            border: '1px solid #ef4444',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            color: '#fca5a5',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}>
            {error}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Kasun Perera"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. kasun@example.com"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              Password (min 6 characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                District
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d} style={{ backgroundColor: '#1e293b' }}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+94 77 ..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.95rem',
              border: 'none',
              borderRadius: 8,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'background 0.2s',
            }}
          >
            {isLoading ? 'Registering...' : 'Complete Citizen Registration'}
          </button>
        </form>

        {/* Link back to Login */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Already have an account? </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Sign In here
          </button>
        </div>
      </div>
    </div>
  );
};
