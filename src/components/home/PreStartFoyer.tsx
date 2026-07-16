'use client';

import React from 'react';
import { BRAND, SESSION_INTENTS, getIntentDef, type SessionIntent } from '@/lib/brandPositioning';
import { useSessionIntent } from '@/hooks/useSessionIntent';
import '@/styles/prestart-foyer.css';

/**
 * Legacy intent-chooser foyer (Train / Coach / Breathe).
 * Day-0 mass-market door is CoachFoyer (studio) — see docs/NORTH_STAR.md.
 * Kept for SplitFlap fallback / reference; do not reintroduce as the front door.
 */
export const PreStartFoyer: React.FC = () => {
  const { intent, setIntent, register } = useSessionIntent();
  const foyer = getIntentDef(intent).foyer;

  return (
    <div
      id="instructions"
      className={`prestart-foyer prestart-foyer--${register}`}
      data-register={register}
      aria-label={`${BRAND.name} welcome`}
    >
      <p className="prestart-foyer__brand prestart-foyer__reveal" style={{ animationDelay: '0ms' }}>
        {foyer.brand}
      </p>
      <div
        className="prestart-foyer__rule prestart-foyer__reveal"
        style={{ animationDelay: '80ms' }}
      />

      <div
        className="prestart-foyer__intents prestart-foyer__reveal"
        style={{ animationDelay: '100ms' }}
        role="radiogroup"
        aria-label="Why are you here"
      >
        {SESSION_INTENTS.map((def) => (
          <IntentChip
            key={def.id}
            intent={def.id}
            label={def.label}
            ariaLabel={def.ariaLabel}
            selected={intent === def.id}
            onSelect={setIntent}
          />
        ))}
      </div>

      <p
        className="prestart-foyer__line prestart-foyer__reveal"
        style={{ animationDelay: '140ms' }}
      >
        {foyer.line1}
      </p>
      <p
        className="prestart-foyer__line prestart-foyer__line--accent prestart-foyer__reveal"
        style={{ animationDelay: '220ms' }}
      >
        {foyer.line2}
      </p>
      <p
        className="prestart-foyer__meta prestart-foyer__reveal"
        style={{ animationDelay: '320ms' }}
      >
        {foyer.trust}
      </p>
      <p
        className="prestart-foyer__meta prestart-foyer__meta--muted prestart-foyer__reveal"
        style={{ animationDelay: '400ms' }}
      >
        {foyer.hint}
      </p>
      <p className="prestart-foyer__cta prestart-foyer__reveal" style={{ animationDelay: '520ms' }}>
        {foyer.cta}
      </p>
    </div>
  );
};

function IntentChip({
  intent,
  label,
  ariaLabel,
  selected,
  onSelect,
}: {
  intent: SessionIntent;
  label: string;
  ariaLabel: string;
  selected: boolean;
  onSelect: (intent: SessionIntent) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel}
      className={`prestart-foyer__intent${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(intent)}
    >
      {label}
    </button>
  );
}

export default PreStartFoyer;
