import { CURL_BASELINE_PROTOCOL } from '@/types/movementAssessment';
import type { MovementAssessment } from '@/types/movementAssessment';
import type { MovementChallengePayload } from '@/types/movementChallenge';

const CHALLENGE_PARAM = 'assessment';
const CHALLENGE_PATH = '/challenge';
const MAX_HEADLINE_LENGTH = 140;
const MAX_FOCUS_LENGTH = 120;

function createChallengeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `assessment-${Date.now().toString(36)}`;
}

function confidenceFor(assessment: MovementAssessment): MovementChallengePayload['confidence'] {
  if (assessment.confidence >= 0.8) return 'clear';
  if (assessment.confidence >= 0.65) return 'usable';
  return 'early';
}

function clampText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function createMovementChallengePayload(
  assessment: MovementAssessment,
  nextFocus: string,
  replyToChallengeId?: string
): MovementChallengePayload {
  if (
    assessment.status !== 'valid' ||
    !assessment.measurements ||
    assessment.mode !== CURL_BASELINE_PROTOCOL.mode ||
    assessment.protocolId !== CURL_BASELINE_PROTOCOL.id ||
    assessment.protocolVersion !== CURL_BASELINE_PROTOCOL.version
  ) {
    throw new Error('Only valid curl baseline assessments can create a challenge');
  }

  return {
    version: '1.0',
    challengeId: createChallengeId(),
    protocolId: assessment.protocolId,
    protocolVersion: assessment.protocolVersion,
    mode: assessment.mode,
    headline: `My ${assessment.mode} movement baseline is ready.`,
    nextFocus: clampText(nextFocus, MAX_FOCUS_LENGTH),
    confidence: confidenceFor(assessment),
    ...(replyToChallengeId ? { replyToChallengeId } : {}),
  };
}

export function encodeMovementChallenge(payload: MovementChallengePayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeMovementChallenge(
  raw: string | null | undefined
): MovementChallengePayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<MovementChallengePayload>;
    if (
      parsed.version !== '1.0' ||
      typeof parsed.challengeId !== 'string' ||
      typeof parsed.protocolId !== 'string' ||
      typeof parsed.protocolVersion !== 'string' ||
      typeof parsed.mode !== 'string' ||
      typeof parsed.headline !== 'string' ||
      typeof parsed.nextFocus !== 'string' ||
      typeof parsed.confidence !== 'string' ||
      !['clear', 'usable', 'early'].includes(parsed.confidence) ||
      parsed.mode !== CURL_BASELINE_PROTOCOL.mode ||
      parsed.protocolId !== CURL_BASELINE_PROTOCOL.id ||
      parsed.protocolVersion !== CURL_BASELINE_PROTOCOL.version
    ) {
      return null;
    }

    if (
      parsed.headline.length > MAX_HEADLINE_LENGTH ||
      parsed.nextFocus.length > MAX_FOCUS_LENGTH ||
      parsed.challengeId.length > 120 ||
      parsed.protocolId.length > 80 ||
      parsed.protocolVersion.length > 20
    ) {
      return null;
    }

    return {
      version: '1.0',
      challengeId: parsed.challengeId,
      protocolId: parsed.protocolId,
      protocolVersion: parsed.protocolVersion,
      mode: parsed.mode as MovementChallengePayload['mode'],
      headline: parsed.headline,
      nextFocus: parsed.nextFocus,
      confidence: parsed.confidence as MovementChallengePayload['confidence'],
      ...(typeof parsed.replyToChallengeId === 'string'
        ? { replyToChallengeId: parsed.replyToChallengeId.slice(0, 120) }
        : {}),
    };
  } catch {
    return null;
  }
}

export function createMovementChallengeUrl(
  payload: MovementChallengePayload,
  origin?: string
): string {
  const base =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://imperfectform.fun');
  const url = new URL(CHALLENGE_PATH, base);
  url.searchParams.set(CHALLENGE_PARAM, encodeMovementChallenge(payload));
  return url.toString();
}

export const MOVEMENT_CHALLENGE_PARAM = CHALLENGE_PARAM;
