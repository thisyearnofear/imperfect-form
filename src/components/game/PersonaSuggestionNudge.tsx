'use client';

import React from 'react';
import { X } from 'lucide-react';
import { getCoachInfo, type CoachPersonality } from '@/lib/coachPersonalities';

interface PersonaSuggestionNudgeProps {
  /** The persona the tempo model suggests fits the user's rep cadence. */
  suggestion: CoachPersonality;
  /** The persona currently selected. */
  current: CoachPersonality;
  onAccept: (persona: CoachPersonality) => void;
  onDismiss: () => void;
}

/**
 * One-time, dismissible tempo-fit nudge. Appears in the foyer after enough
 * sessions show a consistent rep cadence that mismatches the current coach.
 * Never a gate, never repeated once dismissed (see usePersonaSuggestion).
 */
export function PersonaSuggestionNudge({
  suggestion,
  current,
  onAccept,
  onDismiss,
}: PersonaSuggestionNudgeProps) {
  const suggested = getCoachInfo(suggestion);
  const currentInfo = getCoachInfo(current);
  if (suggestion === current) return null;

  return (
    <div
      className="persona-nudge motion-enter"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
        transform: 'translateX(-50%)',
        zIndex: 60,
        maxWidth: 'min(92vw, 380px)',
        background: 'rgba(6, 16, 19, 0.96)',
        border: '1px solid rgba(139, 227, 212, 0.28)',
        borderRadius: '14px',
        padding: '12px 14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        color: '#effcf9',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span aria-hidden="true" style={{ fontSize: '20px', lineHeight: 1 }}>
          {suggested.emoji}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--studio-muted, #7fb5ab)',
            }}
          >
            Tempo fit
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', lineHeight: 1.4 }}>
            Your reps run{' '}
            {suggested.theme === 'competitive'
              ? 'quick'
              : suggested.theme === 'zen'
                ? 'smooth'
                : 'deliberate'}{' '}
            — <strong>{suggested.name}</strong> might suit you better than {currentInfo.name}.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => onAccept(suggestion)}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(86, 217, 195, 0.5)',
                background: 'rgba(86, 217, 195, 0.14)',
                color: '#7aebd8',
                cursor: 'pointer',
              }}
            >
              Switch to {suggested.name}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(139, 227, 212, 0.2)',
                background: 'transparent',
                color: 'var(--studio-muted, #7fb5ab)',
                cursor: 'pointer',
              }}
            >
              Keep {currentInfo.name}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss suggestion"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--studio-muted, #7fb5ab)',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default PersonaSuggestionNudge;
