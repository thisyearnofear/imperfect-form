/**
 * TTS providers for coach narration (demo sync + live coaching).
 *
 * Not locked to Nova / Bedrock — same pattern as aiProviders:
 * preference + automatic fallback. Browser speechSynthesis always works.
 *
 * Cascade (auto): ElevenLabs → Polly (AWS) → browser
 * User can pin: elevenlabs | polly | browser | auto
 */

export type TtsProviderId = 'elevenlabs' | 'polly' | 'browser';

/** Stored preference — auto walks the cascade. */
export type TtsProviderPreference = TtsProviderId | 'auto';

export const TTS_PREF_KEY = 'prefTtsProvider';
export const DEFAULT_TTS_PREFERENCE: TtsProviderPreference = 'auto';

export interface TtsProviderMeta {
  id: TtsProviderId;
  label: string;
  description: string;
  /** Env vars that enable this server-side provider */
  envHint: string;
}

export const TTS_PROVIDERS: Record<TtsProviderId, TtsProviderMeta> = {
  elevenlabs: {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    description: 'Cloud TTS — natural, persona-mapped voices',
    envHint: 'ELEVENLABS_API_KEY',
  },
  polly: {
    id: 'polly',
    label: 'Amazon Polly',
    description: 'AWS neural TTS — Bedrock/AWS creds, Nova-stack optional not required',
    envHint: 'AWS_ACCESS_KEY_ID (or AWS_BEARER_TOKEN_BEDROCK)',
  },
  browser: {
    id: 'browser',
    label: 'Browser',
    description: 'On-device Web Speech API — zero cost, always available',
    envHint: '',
  },
};

/** Cycle order for settings UI and auto cascade (browser last). */
export const TTS_CASCADE: readonly TtsProviderId[] = ['elevenlabs', 'polly', 'browser'] as const;

export function parseTtsPreference(raw: string | null | undefined): TtsProviderPreference {
  if (raw === 'elevenlabs' || raw === 'polly' || raw === 'browser' || raw === 'auto') {
    return raw;
  }
  return DEFAULT_TTS_PREFERENCE;
}

export function ttsPreferenceLabel(pref: TtsProviderPreference): string {
  if (pref === 'auto') return 'auto';
  return TTS_PROVIDERS[pref].label.toLowerCase();
}

/** Cycle auto → elevenlabs → polly → browser → auto */
export function nextTtsPreference(current: TtsProviderPreference): TtsProviderPreference {
  const order: TtsProviderPreference[] = ['auto', 'elevenlabs', 'polly', 'browser'];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}
