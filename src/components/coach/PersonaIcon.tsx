'use client';

import React from 'react';
import { Snail, Turtle, Megaphone, type LucideIcon } from 'lucide-react';
import type { CoachPersonality } from '@/lib/coachPersonalities';

// RASTA is the pier barker — lucide has no octopus, so the mark is the
// barker's megaphone, not a silently-changed species.
const PERSONA_ICONS: Record<CoachPersonality, LucideIcon> = {
  SNEL: Snail,
  STEDDIE: Turtle,
  RASTA: Megaphone,
};

interface PersonaIconProps {
  personality: CoachPersonality;
  size?: number;
  className?: string;
}

/** Persona mark — lucide glyphs instead of platform-dependent emoji. */
export const PersonaIcon: React.FC<PersonaIconProps> = ({ personality, size = 16, className }) => {
  const Icon = PERSONA_ICONS[personality] ?? Turtle;
  return <Icon size={size} className={className} aria-hidden="true" />;
};

export default PersonaIcon;
