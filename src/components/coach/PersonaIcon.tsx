'use client';

import React from 'react';
import { Snail, Turtle, Music, type LucideIcon } from 'lucide-react';
import type { CoachPersonality } from '@/lib/coachPersonalities';

const PERSONA_ICONS: Record<CoachPersonality, LucideIcon> = {
  SNEL: Snail,
  STEDDIE: Turtle,
  RASTA: Music,
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
