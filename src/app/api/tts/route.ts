/**
 * Server TTS — ElevenLabs + Amazon Polly with cascade.
 * Keys never leave the server. Missing keys → 503 so client uses browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PollyClient, SynthesizeSpeechCommand, type VoiceId } from '@aws-sdk/client-polly';
import type { CoachPersonality } from '@/lib/coachPersonalities';
import {
  parseTtsPreference,
  TTS_CASCADE,
  type TtsProviderId,
  type TtsProviderPreference,
} from '@/config/ttsProviders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CHARS = 400;

function hasElevenLabs(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

function hasPolly(): boolean {
  return !!(
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
    process.env.AWS_BEARER_TOKEN_BEDROCK
  );
}

function elevenLabsVoiceId(personality?: CoachPersonality): string {
  if (personality === 'SNEL' && process.env.ELEVENLABS_VOICE_SNEL) {
    return process.env.ELEVENLABS_VOICE_SNEL;
  }
  if (personality === 'STEDDIE' && process.env.ELEVENLABS_VOICE_STEDDIE) {
    return process.env.ELEVENLABS_VOICE_STEDDIE;
  }
  if (personality === 'RASTA' && process.env.ELEVENLABS_VOICE_RASTA) {
    return process.env.ELEVENLABS_VOICE_RASTA;
  }
  return process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'; // George — clear coach default
}

function pollyVoiceId(personality?: CoachPersonality): VoiceId {
  if (personality === 'SNEL') return (process.env.POLLY_VOICE_SNEL as VoiceId) || 'Joanna';
  if (personality === 'RASTA') return (process.env.POLLY_VOICE_RASTA as VoiceId) || 'Matthew';
  return (process.env.POLLY_VOICE_STEDDIE as VoiceId) || 'Stephen';
}

function cascadeFor(preference: TtsProviderPreference): TtsProviderId[] {
  if (preference === 'browser') return ['browser'];
  if (preference === 'elevenlabs') return ['elevenlabs', 'browser'];
  if (preference === 'polly') return ['polly', 'browser'];
  // auto — only attempt providers that are configured
  return TTS_CASCADE.filter((id) => {
    if (id === 'elevenlabs') return hasElevenLabs();
    if (id === 'polly') return hasPolly();
    return true;
  });
}

async function synthesizeElevenLabs(text: string, personality?: CoachPersonality): Promise<Buffer> {
  const voiceId = elevenLabsVoiceId(personality);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
      'xi-api-key': process.env.ELEVENLABS_API_KEY as string,
    },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5',
      voice_settings: {
        stability: personality === 'RASTA' ? 0.35 : 0.5,
        similarity_boost: 0.75,
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function synthesizePolly(text: string, personality?: CoachPersonality): Promise<Buffer> {
  const region = process.env.AWS_REGION || 'us-east-1';
  const client = new PollyClient({ region });
  const out = await client.send(
    new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: pollyVoiceId(personality),
      Engine: 'neural',
      TextType: 'text',
    })
  );
  if (!out.AudioStream) throw new Error('Polly returned empty audio');
  const bytes = await out.AudioStream.transformToByteArray();
  return Buffer.from(bytes);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      text?: string;
      personality?: CoachPersonality;
      preferredProvider?: string;
    };
    const text = (body.text || '').trim().slice(0, MAX_CHARS);
    if (!text) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    const preference = parseTtsPreference(body.preferredProvider);
    const cascade = cascadeFor(preference);

    for (const provider of cascade) {
      if (provider === 'browser') {
        // Client plays Web Speech — signal with empty JSON
        return NextResponse.json(
          { provider: 'browser', fallback: true },
          { headers: { 'X-TTS-Provider': 'browser' } }
        );
      }
      try {
        const audio =
          provider === 'elevenlabs'
            ? await synthesizeElevenLabs(text, body.personality)
            : await synthesizePolly(text, body.personality);
        return new NextResponse(new Uint8Array(audio), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-store',
            'X-TTS-Provider': provider,
          },
        });
      } catch (err) {
        console.warn(`[tts] ${provider} failed:`, err instanceof Error ? err.message : err);
        // try next
      }
    }

    return NextResponse.json(
      { provider: 'browser', fallback: true },
      { headers: { 'X-TTS-Provider': 'browser' } }
    );
  } catch (err) {
    console.error('[tts] route error', err);
    return NextResponse.json({ error: 'tts failed' }, { status: 500 });
  }
}

/** Health / discovery — which cloud providers are configured (no secrets). */
export async function GET() {
  return NextResponse.json({
    available: {
      elevenlabs: hasElevenLabs(),
      polly: hasPolly(),
      browser: true,
    },
    cascade: cascadeFor('auto'),
  });
}
