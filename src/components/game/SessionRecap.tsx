'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Copy, RotateCcw, Share2 } from 'lucide-react';
import type { ExerciseMode } from '@/utils/biomechanics';
import type { SessionSummary } from '@/services/sessionLogger';
import FormLine from './FormLine';
import FormSignatureHistory from './FormSignatureHistory';
import { nextFocusFor, sessionStory } from '@/lib/coachingStory';
import { BRAND } from '@/lib/brandPositioning';
import { ghostService } from '@/services/GhostService';
import { trackChallengeEvent } from '@/lib/challengeAnalytics';
import { usePlatform } from '@/contexts/PlatformContext';
import MovementCard from './MovementCard';
import MovementAssessmentHistory from './MovementAssessmentHistory';
import type { MovementAssessment } from '@/types/movementAssessment';

type SessionRecapProps = {
  mode: ExerciseMode;
  reps: number;
  summary: SessionSummary | null;
  movementAssessment?: MovementAssessment | null;
  userAddress?: string;
  onTryAgain?: (focus: string) => void;
  onStartSelfGhost?: (workoutId: string) => void;
  isRace?: boolean;
};

type ReceiptAction = 'idle' | 'copied' | 'shared' | 'cancelled' | 'error';

const DEFAULT_RECEIPT_ORIGIN = 'https://imperfectform.fun';

function receiptOrigin() {
  if (typeof window !== 'undefined') return window.location.origin;
  return (
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_RECEIPT_ORIGIN
  );
}

function coachingTakeaway(summary: SessionSummary | null, mode: ExerciseMode) {
  if (!summary) return { strength: 'Your session is saved locally.', next: nextFocusFor(mode) };
  if (summary.warningCount === 0) {
    return {
      strength: 'No major form issues were detected in this set.',
      next: nextFocusFor(mode),
    };
  }
  if (summary.avgDepth >= 0.7) {
    return { strength: 'You kept a consistent range through the set.', next: nextFocusFor(mode) };
  }
  return {
    strength: 'You completed the set and gave the coach a useful baseline.',
    next: nextFocusFor(mode),
  };
}

function FormReceipt({
  mode,
  reps,
  summary,
  isRace = false,
}: Omit<SessionRecapProps, 'onTryAgain' | 'userAddress' | 'movementAssessment'>) {
  const [action, setAction] = useState<ReceiptAction>('idle');
  const [challengeAction, setChallengeAction] = useState<ReceiptAction>('idle');
  const { user } = usePlatform();
  const depth = summary ? Math.round(summary.avgDepth * 100) : null;
  const observationCount = summary?.warningCount ?? 0;
  const receiptText = useMemo(
    () =>
      [
        'FORM RECEIPT',
        BRAND.loopLabel,
        `${reps} ${mode} · ${depth === null ? 'local session' : `${depth}% average depth`}`,
        observationCount === 0
          ? 'No major form observations detected.'
          : `${observationCount} form observation${observationCount === 1 ? '' : 's'} logged for the next set.`,
        'Imperfect Form · private camera coaching',
      ].join('\n'),
    [depth, mode, observationCount, reps]
  );

  const handleShare = async () => {
    try {
      const url = receiptOrigin();
      if (navigator.share) {
        await navigator.share({ title: 'Form Receipt', text: receiptText, url });
        setAction('shared');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${receiptText}\n${url}`);
        setAction('copied');
        return;
      }
      setAction('error');
    } catch (error) {
      setAction(error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'error');
    }
  };

  const handleSendCorrection = async () => {
    if (!summary?.trace?.length) {
      setChallengeAction('error');
      return;
    }

    try {
      const challengeUrl = ghostService.generateShareUrl(summary.trace, mode, receiptOrigin());
      const challengeText = `The coach found one useful correction in my ${mode}. Try the same movement and find yours. No video shared.`;
      if (navigator.share) {
        await navigator.share({
          title: 'Send this correction',
          text: challengeText,
          url: challengeUrl,
        });
        trackChallengeEvent(isRace ? 'challenge_replied' : 'challenge_shared', user?.fid, {
          mode,
          reps,
          source: isRace ? 'incoming-challenge' : 'session-recap',
        });
        setChallengeAction('shared');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${challengeText}\n${challengeUrl}`);
        trackChallengeEvent(isRace ? 'challenge_replied' : 'challenge_shared', user?.fid, {
          mode,
          reps,
          source: isRace ? 'incoming-challenge' : 'session-recap',
        });
        setChallengeAction('copied');
        return;
      }
      setChallengeAction('error');
    } catch (error) {
      setChallengeAction(
        error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'error'
      );
    }
  };

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        setAction('error');
        return;
      }
      await navigator.clipboard.writeText(`${receiptText}\n${receiptOrigin()}`);
      setAction('copied');
    } catch {
      setAction('error');
    }
  };

  return (
    <section className="form-receipt" aria-labelledby="form-receipt-title">
      <div className="form-receipt__stamp">FORM RECEIPT</div>
      <div className="form-receipt__body">
        <div>
          {/* The loop label closes the narrative arc: the same ONE REP / ONE FIX
              promise made on the foyer, stamped on the record of the set. */}
          <p className="form-receipt__eyebrow">{BRAND.loopLabel}</p>
          <h3 id="form-receipt-title">Your correction starts here.</h3>
        </div>
        <p className="form-receipt__copy">
          {observationCount === 0
            ? 'A clean baseline. Keep this line for the next set.'
            : `${observationCount} form observation${observationCount === 1 ? '' : 's'} to work on next.`}
        </p>
        <div className="form-receipt__facts">
          <span>
            <strong>{reps}</strong> reps
          </span>
          {depth !== null && (
            <span>
              <strong>{depth}%</strong> depth
            </span>
          )}
          <span>
            <strong>{observationCount}</strong> observations
          </span>
        </div>
        {summary?.trace?.length ? (
          <div className="form-receipt__challenge">
            <div>
              <p className="form-receipt__challenge-eyebrow">The social loop</p>
              <strong>Send this correction</strong>
              <span>No video or image shared · approximate movement trace only</span>
            </div>
            <button
              type="button"
              className="form-receipt__button form-receipt__button--challenge"
              onClick={handleSendCorrection}
            >
              <Share2 size={15} aria-hidden="true" /> Send
            </button>
          </div>
        ) : null}
        <div className="form-receipt__actions">
          <button
            type="button"
            className="form-receipt__button form-receipt__button--primary"
            onClick={handleShare}
          >
            <Share2 size={15} aria-hidden="true" /> Share receipt
          </button>
          <button type="button" className="form-receipt__button" onClick={handleCopy}>
            <Copy size={15} aria-hidden="true" /> Copy
          </button>
        </div>
        <p className="form-receipt__status" aria-live="polite">
          {action === 'copied' && 'Copied — no camera image included.'}
          {action === 'shared' && 'Ready to show someone your form line.'}
          {action === 'cancelled' && 'Share cancelled. Your receipt is still here.'}
          {action === 'error' && 'Sharing is unavailable. Select the receipt text below.'}
          {challengeAction === 'copied' && 'Correction link copied — no camera image included.'}
          {challengeAction === 'shared' && 'Correction sent. They can answer with their own line.'}
          {challengeAction === 'cancelled' && 'Challenge cancelled. Your receipt is still here.'}
          {challengeAction === 'error' && 'Could not create the correction link.'}
        </p>
        <pre className="form-receipt__text" aria-label="Copyable form receipt text">
          {receiptText}
        </pre>
      </div>
    </section>
  );
}

export function SessionRecap({
  mode,
  reps,
  summary,
  movementAssessment,
  userAddress,
  onTryAgain,
  onStartSelfGhost,
  isRace = false,
}: SessionRecapProps) {
  const takeaway = coachingTakeaway(summary, mode);
  const story = sessionStory(summary, mode, reps);
  return (
    <section
      className="session-recap studio-card studio-card__body motion-enter"
      aria-labelledby="session-recap-title"
    >
      <div className="session-recap__headline">
        <div>
          <p>Coaching recap</p>
          <h2 id="session-recap-title">
            {reps} {mode}
          </h2>
        </div>
        <span>{summary ? `${Math.round(summary.duration)}s` : 'Saved'}</span>
      </div>
      <div className="session-recap__story motion-enter motion-delay-1">
        <div className="session-recap__story-mark" aria-hidden="true">
          <CheckCircle2 size={17} />
        </div>
        <div>
          <p className="session-recap__story-eyebrow">What the coach learned</p>
          <h3>{story.title}</h3>
          <strong>{story.body}</strong>
        </div>
      </div>
      <div className="session-recap__item studio-card__item session-recap__item--good motion-enter motion-delay-1">
        <CheckCircle2 size={17} />
        <div>
          <p>What went well</p>
          <strong>{takeaway.strength}</strong>
        </div>
      </div>
      <div className="session-recap__item studio-card__item motion-enter motion-delay-2">
        <ArrowRight size={17} />
        <div>
          <p>Next focus</p>
          <strong>{story.focus}</strong>
        </div>
      </div>
      {summary?.trace && summary.trace.length > 0 && (
        <FormLine trace={summary.trace} avgDepth={summary.avgDepth} />
      )}
      {mode === 'curls' && (
        <>
          <MovementCard assessment={movementAssessment} />
          <MovementAssessmentHistory
            userAddress={userAddress}
            currentAssessment={movementAssessment}
          />
        </>
      )}
      {/* The response action follows the correction immediately; history is
          earned context beneath it, not a prerequisite for sharing. */}
      <FormReceipt mode={mode} reps={reps} summary={summary} isRace={isRace} />
      <FormSignatureHistory
        mode={mode}
        reps={reps}
        summary={summary}
        userAddress={userAddress}
        onStartSelfGhost={onStartSelfGhost}
      />
      {onTryAgain && (
        <button
          type="button"
          className="studio-card__button min-h-11"
          onClick={() => onTryAgain(story.focus)}
          aria-label={`Try another ${mode} set with focus on ${story.focus}`}
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>Try this correction now</span>
        </button>
      )}
    </section>
  );
}

export default SessionRecap;
