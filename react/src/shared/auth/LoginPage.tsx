import React, { useState } from 'react';
import { useAuth } from './AuthContext';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

const DEMO_ACCOUNTS = [
  { role: 'Disaster Officer', email: 'officer@aegis.lk', icon: '🛡️', color: '#2563eb', desc: 'Can trigger AI & review alerts' },
  { role: 'Citizen', email: 'citizen@aegis.lk', icon: '👥', color: '#10b981', desc: 'View forecasts & report damage' },
  { role: 'Field Responder', email: 'responder@aegis.lk', icon: '🚨', color: '#f59e0b', desc: 'Rescue ops & shelter relief' },
  { role: 'System Admin', email: 'admin@aegis.lk', icon: '⚙️', color: '#8b5cf6', desc: 'Full administrative controls' },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const { login, quickLogin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setError(null);
    try {
      await quickLogin(demoEmail);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
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
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🛡️</div>
          <h1 style={{ color: '#f8fafc', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Aegis-LK</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Intelligent Disaster Prediction, Response & Recovery Platform
          </p>
        </div>

        {/* Demo Fast Login Buttons */}
        <div style={{
          backgroundColor: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: '1rem',
          marginBottom: '1.75rem',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}>
            <span style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Quick Demo Login (One-Click)
            </span>
            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Default: Aegis@123</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin(acc.email)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${acc.color}40`,
                  borderRadius: 8,
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease',
                }}
              >
                <span>{acc.icon}</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: acc.color }}>{acc.role}</div>
                  <div style={{ color: '#64748b', fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {acc.email}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          color: '#64748b',
          fontSize: '0.75rem',
        }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <span>OR SIGN IN WITH EMAIL</span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
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

        {/* Standard Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. officer@aegis.lk"
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

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#2563eb',
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
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Link to Register */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Don't have an account? </span>
          <button
            type="button"
            onClick={onSwitchToRegister}
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
            Register as Citizen
          </button>
        </div>
      </div>
    </div>
  );
};
