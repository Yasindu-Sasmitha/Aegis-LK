import React from 'react';

interface AegisLogoProps {
  size?: number;
  showText?: boolean;
  lightText?: boolean;
  tagline?: string;
}

export const AegisLogo: React.FC<AegisLogoProps> = ({
  size = 42,
  showText = true,
  lightText = true,
  tagline = 'Sri Lanka Disaster Management System',
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
      {/* SVG Shield with Sri Lanka Silhouette & National Accent Colors */}
      <svg
        width={size}
        height={size * 1.15}
        viewBox="0 0 100 115"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.25))', flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b2b52" />
            <stop offset="60%" stopColor="#081e3a" />
            <stop offset="100%" stopColor="#040e1e" />
          </linearGradient>
          <linearGradient id="accentRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="islandFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>

        {/* Outer Shield Outline */}
        <path
          d="M50 4L88 20V58C88 84 50 108 50 108C50 108 12 84 12 58V20L50 4Z"
          fill="url(#shieldGrad)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2.5"
        />

        {/* Dynamic National Color Ribbon Accent around Shield Bottom */}
        <path
          d="M20 72C32 94 50 105 50 105C50 105 68 94 80 72"
          stroke="url(#accentRibbon)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Sri Lanka Stylized Island Silhouette */}
        <path
          d="M51 26C54 27 56 31 56 34C56 37 54 39 55 42C56 46 60 48 61 52C62 57 60 62 58 66C56 71 52 76 48 76C44 76 41 72 41 68C41 64 43 61 43 57C43 52 41 49 42 44C43 40 46 36 47 31C48 28 49 26 51 26Z"
          fill="url(#islandFill)"
          opacity="0.95"
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
        />
        
        {/* Subtle Pulse Radar Arc */}
        <circle cx="50" cy="52" r="30" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: `${size * 0.48}px`,
              fontWeight: 800,
              color: lightText ? '#ffffff' : '#0f172a',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Aegis-LK
          </span>
          <span
            style={{
              fontSize: `${Math.max(size * 0.25, 11)}px`,
              fontWeight: 500,
              color: lightText ? '#94a3b8' : '#64748b',
              letterSpacing: '-0.01em',
              marginTop: 2,
            }}
          >
            {tagline}
          </span>
        </div>
      )}
    </div>
  );
};
export default AegisLogo;
