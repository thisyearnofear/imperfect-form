'use client';

import React from 'react';
import { COACH_PERSONALITIES, CoachPersonality } from '@/lib/coachPersonalities';
import { useCoachPersonality } from '@/hooks/useCoachPersonality';
import { PersonaIcon } from './PersonaIcon';

/**
 * Coach persona picker (arcade register): three animal coaches, gold-glow
 * selection. Drives the tone of live AI feedback and post-workout reports.
 */
const CoachPersonalitySelector: React.FC = () => {
  const [personality, setPersonality] = useCoachPersonality();

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-widest text-gray-400 font-bold">Your Coach</div>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Coach personality">
        {(Object.keys(COACH_PERSONALITIES) as CoachPersonality[]).map((key) => {
          const coach = COACH_PERSONALITIES[key];
          const selected = personality === key;
          return (
            <button
              key={key}
              role="radio"
              aria-checked={selected}
              onClick={() => setPersonality(key)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                selected
                  ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_10px_rgba(252,177,49,0.5)]'
                  : 'border-white/10 bg-white/5 hover:border-white/25'
              }`}
            >
              <span className="text-xl" aria-hidden>
                <PersonaIcon personality={key} size={26} />
              </span>
              <span
                className={`text-xs font-black tracking-wider ${
                  selected ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                {coach.name}
              </span>
              <span className="text-[11px] text-gray-500 capitalize">{coach.theme}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        {COACH_PERSONALITIES[personality].description} — shapes how your AI coach talks to you.
      </p>
    </div>
  );
};

export default CoachPersonalitySelector;
