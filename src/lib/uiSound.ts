/**
 * Register-aware UI cues via Cuelume (synthesized, no MP3 baggage).
 * Arcade Train: press/success. Studio bay: soft chime/press (Weisdevice-lite).
 * Never Calm breathe phases; never over coach TTS.
 */

import { play, setEnabled, type SoundName } from 'cuelume';
import type { AestheticRegister } from '@/lib/brandPositioning';
import { isCoachSpeaking } from '@/lib/tts/speakCoachLine';

export const UI_SOUND_PREF_KEY = 'prefUiSound';

export type UiCue = 'press' | 'success';
export type StudioCue = 'chime' | 'press' | 'soft';

/** Default on (Train). Calm never plays because of the register gate. */
export function getUiSoundPreferred(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(UI_SOUND_PREF_KEY);
  if (raw === null) return true;
  return raw === 'true';
}

export function setUiSoundPreferred(on: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(UI_SOUND_PREF_KEY, on ? 'true' : 'false');
}

/**
 * Play a short interaction cue. No-ops unless register is arcade and prefs allow.
 */
export function playUiCue(cue: UiCue, opts?: { register?: AestheticRegister | string }): void {
  if (typeof window === 'undefined') return;
  const register = opts?.register ?? 'arcade';
  if (register !== 'arcade') return;
  if (!getUiSoundPreferred()) return;
  if (isCoachSpeaking()) return;

  try {
    setEnabled(true);
    play(cue);
  } catch {
    // Fail silent — AudioContext may be blocked until a gesture
  }
}

const STUDIO_SOUND: Record<StudioCue, SoundName> = {
  chime: 'chime',
  press: 'press',
  soft: 'droplet',
};

/**
 * Soft studio-bay cues (enter ceremony, foyer CTA). Pref + TTS gates apply.
 */
export function playStudioCue(cue: StudioCue = 'soft'): void {
  if (typeof window === 'undefined') return;
  if (!getUiSoundPreferred()) return;
  if (isCoachSpeaking()) return;

  try {
    setEnabled(true);
    play(STUDIO_SOUND[cue]);
  } catch {
    // Fail silent — AudioContext may be blocked until a gesture
  }
}
