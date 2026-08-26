/**
 * Client-side coach speech — fail-silent, provider-agnostic.
 *
 * Used by live coaching (AgentInsightTray) and demonstration sync
 * (coach-station narration events). Preference: prefTtsProvider.
 */

import type { CoachPersonality } from '@/lib/coachPersonalities';
import {
  parseTtsPreference,
  TTS_PREF_KEY,
  type TtsProviderId,
  type TtsProviderPreference,
} from '@/config/ttsProviders';
import { getNetworkCapabilities } from '@/lib/networkQuality';

let currentAudio: HTMLAudioElement | null = null;
const CLIENT_TTS_TIMEOUT_MS = 2500;

export function getStoredTtsPreference(): TtsProviderPreference {
  if (typeof window === 'undefined') return 'auto';
  return parseTtsPreference(window.localStorage.getItem(TTS_PREF_KEY));
}

export function setStoredTtsPreference(pref: TtsProviderPreference): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TTS_PREF_KEY, pref);
}

function speakBrowser(text: string, personality?: CoachPersonality): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = personality === 'RASTA' ? 1.1 : personality === 'SNEL' ? 0.85 : 0.95;
  utterance.pitch = personality === 'SNEL' ? 0.9 : 1;
  window.speechSynthesis.speak(utterance);
}

async function playAudioUrl(url: string): Promise<void> {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  const audio = new Audio(url);
  currentAudio = audio;
  await audio.play();
}

/**
 * Speak a coach line. Never throws.
 * Cloud providers via /api/tts; on failure or browser preference → Web Speech.
 */
export async function speakCoachLine(
  text: string,
  opts?: {
    voiceEnabled?: boolean;
    personality?: CoachPersonality;
    preferredProvider?: TtsProviderPreference;
  }
): Promise<{ provider: TtsProviderId | 'none' }> {
  const trimmed = text?.trim();
  if (!trimmed) return { provider: 'none' };
  if (opts?.voiceEnabled === false) return { provider: 'none' };

  const preference = opts?.preferredProvider ?? getStoredTtsPreference();

  // Constrained networks (save-data / 2g): skip the cloud round-trip and use
  // the local voice immediately. Coaching must never wait on a slow link.
  const { allowCloudTts } = getNetworkCapabilities();

  if (preference === 'browser' || !allowCloudTts) {
    speakBrowser(trimmed, opts?.personality);
    return { provider: 'browser' };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CLIENT_TTS_TIMEOUT_MS);
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        text: trimmed,
        personality: opts?.personality,
        preferredProvider: preference,
      }),
    });

    if (!res.ok) {
      speakBrowser(trimmed, opts?.personality);
      return { provider: 'browser' };
    }

    const used = (res.headers.get('X-TTS-Provider') || 'browser') as TtsProviderId;
    const contentType = res.headers.get('Content-Type') || '';

    if (used === 'browser' || contentType.includes('application/json')) {
      speakBrowser(trimmed, opts?.personality);
      return { provider: 'browser' };
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    try {
      await playAudioUrl(url);
      return { provider: used };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    // Cloud narration is an enhancement, never a reason to make a correction
    // wait. If a provider is slow or unreachable, speak locally within a
    // bounded window so the camera/station loop remains responsive.
    speakBrowser(trimmed, opts?.personality);
    return { provider: 'browser' };
  } finally {
    window.clearTimeout(timeout);
  }
}

/** True while TTS audio or browser speech is actively playing. */
export function isCoachSpeaking(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.speechSynthesis?.speaking) return true;
  if (currentAudio && !currentAudio.paused && !currentAudio.ended) return true;
  return false;
}

/** Cancel any in-flight browser or audio speech. */
export function stopCoachSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
