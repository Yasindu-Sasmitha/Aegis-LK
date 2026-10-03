import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { AegisLogo } from '../components/AegisLogo';
import {
  AlertTriangleIcon,
  ShieldIcon,
  UsersIcon,
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
} from '../components/Icons';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
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
              Together for a<br />
              <span>Safer Sri Lanka</span>
            </h1>

            <p className="ae-auth-description">
              Aegis-LK connects people, authorities and emergency responders to respond faster, save lives, and build a more resilient Sri Lanka.
            </p>

            {/* Value Proposition Feature Bullets */}
            <div className="ae-feature-bullets">
              <div className="ae-feature-bullet">
                <div className="ae-bullet-icon red">
                  <AlertTriangleIcon size={20} color="#dc2626" />
                </div>
                <div>
                  <div className="ae-bullet-title">Early Warnings</div>
                  <div className="ae-bullet-desc">
                    Real-time AI alerts for torrential rainfall, flood risks, and emergency hazards.
                  </div>
                </div>
              </div>

              <div className="ae-feature-bullet">
                <div className="ae-bullet-icon blue">
                  <UsersIcon size={20} color="#0284c7" />
                </div>
                <div>
                  <div className="ae-bullet-title">Coordinated Response</div>
                  <div className="ae-bullet-desc">
                    Connects disaster management officers, volunteer networks, and responders.
                  </div>
                </div>
              </div>

              <div className="ae-feature-bullet">
                <div className="ae-bullet-icon green">
                  <ShieldIcon size={20} color="#16a34a" />
                </div>
                <div>
                  <div className="ae-bullet-title">Safer Communities</div>
                  <div className="ae-bullet-desc">
                    <strong style={{ color: '#38bdf8' }}>Better information.</strong> Faster action. Stronger resilience across all 25 districts.
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
          <div className="ae-auth-card">
            <div className="ae-auth-card-header">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <AegisLogo size={46} showText={false} />
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.25rem', color: '#0b2b52' }}>
                Aegis-LK
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                Sri Lanka Disaster Management System
              </div>

              <h2 className="ae-auth-card-title">Welcome Back</h2>
              <p className="ae-auth-card-sub">Sign in to access the Aegis-LK platform</p>
            </div>

            {/* Error Message Box */}
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
                <AlertTriangleIcon size={16} color="#b91c1c" />
                <span>{error}</span>
              </div>
            )}

            {/* Standard Sign In Form */}
            <form onSubmit={handleSubmit}>
              <div className="ae-form-group">
                <label className="ae-form-label">Username or Email</label>
                <div className="ae-input-wrapper">
                  <span className="ae-input-icon">
                    <UserIcon size={18} color="#64748b" />
                  </span>
                  <input
                    type="email"
                    required
                    className="ae-auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your username or email"
                  />
                </div>
              </div>

              <div className="ae-form-group">
                <label className="ae-form-label">Password</label>
                <div className="ae-input-wrapper">
                  <span className="ae-input-icon">
                    <LockIcon size={18} color="#64748b" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="ae-auth-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOffIcon size={18} color="#64748b" />
                    ) : (
                      <EyeIcon size={18} color="#64748b" />
                    )}
                  </button>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: '#0b3260', width: 16, height: 16 }}
                  />
                  Remember me
                </label>

                <button
                  type="button"
                  onClick={() => alert('For password reset assistance, please contact the DMC Administrator at admin@aegis.lk.')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.825rem'
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="ae-auth-btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRightIcon size={16} />
              </button>
            </form>

            {/* Link to Register */}
            <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: '#64748b' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284c7',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Register
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
          <ShieldIcon size={14} color="#60a5fa" />
          <span>Preparedness &nbsp;•&nbsp; Response &nbsp;•&nbsp; Recovery &nbsp;•&nbsp; Resilience</span>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
