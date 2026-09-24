import React, { useState, useRef } from 'react';

interface Props {
  text: string;
  delayMs?: number; // default 500ms — quick appearance, not an intrusive popup
}

/**
 * A small "ⓘ" icon that, on hover, shows a plain-language explanation after a
 * short delay. Not a native `title` tooltip (those look plain and have no
 * configurable delay) — this is a styled floating box positioned near the icon.
 */
export const InfoHint: React.FC<Props> = ({ text, delayMs = 500 }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setVisible(true), delayMs);
  };

  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', marginLeft: '0.4rem' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span
        style={{
          width: 15,
          height: 15,
          borderRadius: '50%',
          backgroundColor: '#e2e8f0',
          color: '#64748b',
          fontSize: '0.65rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'help',
          userSelect: 'none',
        }}
      >
        i
      </span>
      {visible && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '140%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0f172a',
            color: '#f1f5f9',
            fontSize: '0.75rem',
            fontWeight: 400,
            lineHeight: 1.4,
            padding: '0.5rem 0.7rem',
            borderRadius: 8,
            width: 220,
            zIndex: 20,
            boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
};