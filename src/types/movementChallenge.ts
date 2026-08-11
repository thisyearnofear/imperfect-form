import type { MovementAssessment } from './movementAssessment';

export type MovementChallengeVersion = '1.0';

/**
 * Share-safe challenge payload. It intentionally contains no pose trace, image,
 * wallet address, exact timestamp, or user identity.
 */
export interface MovementChallengePayload {
  version: MovementChallengeVersion;
  challengeId: string;
  protocolId: string;
  protocolVersion: string;
  mode: MovementAssessment['mode'];
  headline: string;
  nextFocus: string;
  confidence: 'clear' | 'usable' | 'early';
  replyToChallengeId?: string;
}
