import { describe, expect, it } from 'vitest';
import {
  nextTtsPreference,
  parseTtsPreference,
  ttsPreferenceLabel,
  TTS_CASCADE,
} from '@/config/ttsProviders';

describe('ttsProviders', () => {
  it('parses preferences with auto default', () => {
    expect(parseTtsPreference(null)).toBe('auto');
    expect(parseTtsPreference('elevenlabs')).toBe('elevenlabs');
    expect(parseTtsPreference('nope')).toBe('auto');
  });

  it('cycles preference including auto', () => {
    expect(nextTtsPreference('auto')).toBe('elevenlabs');
    expect(nextTtsPreference('elevenlabs')).toBe('polly');
    expect(nextTtsPreference('polly')).toBe('browser');
    expect(nextTtsPreference('browser')).toBe('auto');
  });

  it('labels and cascade put browser last', () => {
    expect(ttsPreferenceLabel('auto')).toBe('auto');
    expect(ttsPreferenceLabel('polly')).toBe('amazon polly');
    expect(TTS_CASCADE[TTS_CASCADE.length - 1]).toBe('browser');
  });
});
