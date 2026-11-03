'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import '@/styles/session-recap.css';
import { ArrowUpRight, CalendarPlus, CheckCircle2, Copy, RotateCcw, Share2 } from 'lucide-react';
import type { ExerciseMode } from '@/utils/biomechanics';
import type { SessionSummary } from '@/services/sessionLogger';
import FormLine from './FormLine';
import FormSignatureHistory from './FormSignatureHistory';
import { nextFocusFor, sessionStory } from '@/lib/coachingStory';
import { countedLabel } from '@/lib/exerciseGuidance';
import { inconclusiveRead } from '@/lib/inconclusiveReads';
import { BRAND } from '@/lib/brandPositioning';
import { SandowGradeMark } from '@/components/ui/SandowGradeMark';
import { averageFormScore, getFormGrade } from '@/lib/formGrade';
import { buildGradeSeries } from '@/lib/progress/gradeHistory';
import GradeArc from './GradeArc';
import { ghostService } from '@/services/GhostService';
import {
  movementShareMetadata,
  trackChallengeEvent,
  trackMovementChallengeEvent,
} from '@/lib/challengeAnalytics';
import {
  createMovementChallengePayload,
  createMovementChallengeUrl,
} from '@/lib/movementChallenge';
import { usePlatform } from '@/contexts/PlatformContext';
import MovementCard from './MovementCard';
import MovementAssessmentHistory from './MovementAssessmentHistory';
import { usePainIntent } from '@/hooks/usePainIntent';
import { useNiggle } from '@/hooks/useNiggle';
import { addNiggleEntry } from '@/lib/niggleEntries';
import type { NiggleJointId } from '@/lib/niggleIntents';
import { assessmentProtocolFor } from '@/lib/movementAssessment';
import { buildReadingIcs, nextReadingDate } from '@/lib/nextReading';
import { readingSentence } from '@/lib/readingSentence';
import { STRETCHES } from '@/lib/recovery/recoveryContent';
import StretchSequence from '@/components/recovery/StretchSequence';
import type { MovementAssessment } from '@/types/movementAssessment';
import type { LocalWorkout } from '@/types/workout';
import type { MovementChallengePayload } from '@/types/movementChallenge';

type SessionRecapProps = {
  mode: ExerciseMode;
  reps: number;
  summary: SessionSummary | null;
  movementAssessment?: MovementAssessment | null;
  /** Reuse the modal-owned workout snapshot for replay/history calculations. */
  workouts?: LocalWorkout[];
  /** Incoming assessment challenge metadata, if this session is a reply. */
  movementChallenge?: MovementChallengePayload | null;
  userAddress?: string;
  formScores?: number[];
  onTryAgain?: (focus: string) => void;
  onStartSelfGhost?: (workoutId: string) => void;
  isRace?: boolean;
};

type ReceiptAction = 'idle' | 'copied' | 'shared' | 'cancelled' | 'error';

const DEFAULT_RECEIPT_ORIGIN = 'https://imperfectform.fun';

/** Mode → the joint a post-session "how does it feel" entry belongs to when
 *  no niggle chip is selected. */
const JOINT_FOR_MODE: Partial<Record<ExerciseMode, NiggleJointId>> = {
  reach: 'neck-shoulders',
  curls: 'arm',
  squats: 'knee',
};

/** Weekly re-read titles, per protocol mode. */
const READING_EVENT_TITLE: Partial<Record<ExerciseMode, string>> = {
  reach: 'Niggleometer: weekly neck & shoulders reading',
  curls: 'Niggleometer: weekly curl reading',
};

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
  movementAssessment,
  movementChallenge,
}: Omit<SessionRecapProps, 'onTryAgain' | 'userAddress'>) {
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

  const handleSendGhostCorrection = async () => {
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

  const handleSendCorrection = async () => {
    if (!movementAssessment || movementAssessment.status !== 'valid') {
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
      return;
    }

    try {
      const challengePayload = createMovementChallengePayload(
        movementAssessment,
        nextFocusFor(mode),
        movementChallenge?.challengeId
      );
      const challengeUrl = createMovementChallengeUrl(challengePayload, receiptOrigin());
      const challengeText = `I found one useful movement signal in my ${mode}. Take the same test and find yours. No video shared.`;
      // A reply continues the incoming thread — same challengeId, so PostHog
      // can stitch open → start → complete → reply for one shared card. A
      // fresh share opens a new thread with the new card's own challengeId.
      const sharedEvent = movementChallenge ? 'assessment_replied' : 'assessment_card_shared';
      const sharedMetadata = movementShareMetadata({
        mode,
        protocolId: movementAssessment.protocolId,
        challengeId: movementChallenge
          ? movementChallenge.challengeId
          : challengePayload.challengeId,
        // A fresh share may itself continue a thread; a reply never re-links it.
        replyToChallengeId: movementChallenge ? undefined : challengePayload.replyToChallengeId,
      });
      if (navigator.share) {
        await navigator.share({
          title: 'Take the same test',
          text: challengeText,
          url: challengeUrl,
        });
        trackMovementChallengeEvent(sharedEvent, user?.fid, sharedMetadata);
        setChallengeAction('shared');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${challengeText}\n${challengeUrl}`);
        trackMovementChallengeEvent(sharedEvent, user?.fid, sharedMetadata);
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
        {movementAssessment?.status === 'valid' || summary?.trace?.length ? (
          <div className="form-receipt__challenge">
            <div>
              <p className="form-receipt__challenge-eyebrow">The social loop</p>
              <strong>
                {movementAssessment?.status === 'valid'
                  ? 'Take the same test'
                  : 'Send this correction'}
              </strong>
              <span>
                {movementAssessment?.status === 'valid'
                  ? 'Aggregate movement signal only · no video or image shared'
                  : 'No video or image shared · compressed movement trace only'}
              </span>
            </div>
            <div className="form-receipt__challenge-actions">
              <button
                type="button"
                className="form-receipt__button form-receipt__button--challenge"
                onClick={handleSendCorrection}
              >
                <Share2 size={15} aria-hidden="true" /> Share
              </button>
              {movementAssessment?.status === 'valid' && summary?.trace?.length ? (
                <button
                  type="button"
                  className="form-receipt__button form-receipt__button--secondary-challenge"
                  onClick={handleSendGhostCorrection}
                >
                  Send form line
                </button>
              ) : null}
            </div>
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
          {challengeAction === 'copied' &&
            'Assessment challenge copied — no camera image included.'}
          {challengeAction === 'shared' && 'Challenge shared. They can take the same test.'}
          {challengeAction === 'cancelled' && 'Challenge cancelled. Your receipt is still here.'}
          {challengeAction === 'error' && 'Could not create the assessment challenge.'}
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
  workouts,
  movementChallenge,
  userAddress,
  formScores = [],
  onTryAgain,
  onStartSelfGhost,
  isRace = false,
}: SessionRecapProps) {
  const { painIntent } = usePainIntent();
  const { joint: niggleJoint, context: niggleContext } = useNiggle();
  const [easing, setEasing] = useState(false);
  const [awaitingSeverity, setAwaitingSeverity] = useState(false);
  const [easeLogged, setEaseLogged] = useState(false);
  const takeaway = coachingTakeaway(summary, mode);
  const story = sessionStory(summary, mode, reps);
  const avgScore = averageFormScore(formScores);
  const sandowGrade = avgScore !== null ? getFormGrade(avgScore) : null;
  const hasCorrection = Boolean(summary?.anomalies[0]?.metrics.warnings[0]);
  // Inconclusive is an honest answer (PHASE_B_PLAN §B3): when the meter
  // could not read, the recap leads with that truth + the one fixable cause —
  // brass register, never an error state.
  const inconclusive =
    movementAssessment?.status === 'inconclusive'
      ? inconclusiveRead(movementAssessment.inconclusiveReason)
      : null;
  const protocol = assessmentProtocolFor(mode);
  // The "Ease it" door: the reach reading always offers it (the joint it
  // serves asked for relief, not just a number); other modes offer it when
  // this session was their niggle's read and a routine exists.
  const canEase =
    (mode === 'reach' || painIntent?.mode === mode) && Boolean(STRETCHES[mode]?.length);
  const easeJoint = niggleJoint?.id ?? JOINT_FOR_MODE[mode];

  // A valid reading earns the weekly cadence line + calendar door.
  const validReading =
    protocol && movementAssessment?.status === 'valid' ? movementAssessment : null;
  const nextReading = validReading ? nextReadingDate(validReading.capturedAt) : null;

  const downloadReadingIcs = () => {
    if (!nextReading) return;
    const origin = receiptOrigin();
    const url = niggleJoint
      ? `${origin}/?niggle=${niggleJoint.id}:${niggleContext?.id ?? niggleJoint.contexts[0].id}`
      : origin;
    const ics = buildReadingIcs({
      start: nextReading,
      title: READING_EVENT_TITLE[mode] ?? `Niggleometer: weekly ${mode} reading`,
      url,
      description: 'Same setup as last time: phone propped, 5 slow reps. Stop if anything hurts.',
    });
    const blob = new Blob([ics], { type: 'text/calendar' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'niggleometer-reading.ics';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  return (
    <section
      className="session-recap studio-card studio-card__body motion-enter"
      aria-labelledby="session-recap-title"
    >
      <div
        className={`session-recap__one-fix motion-enter${validReading ? ' session-recap__one-fix--read' : ''}`}
      >
        {/* A valid protocol read closes the instrument journey: Fig 1 was the
            reach drawn in the foyer, Fig 2 is this — your reading. The
            inconclusive read stays an honest answer, not a figure. */}
        <p
          className={`session-recap__one-fix-eyebrow${validReading ? ' session-recap__one-fix-eyebrow--fig' : ''}`}
        >
          {inconclusive
            ? 'Honest answer'
            : validReading
              ? '· Fig 2 · Your reading ·'
              : BRAND.loopLabel}
        </p>
        <h2 id="session-recap-title">
          {inconclusive
            ? 'The meter couldn’t get a clean read'
            : hasCorrection
              ? 'The one fix'
              : 'Keep this line'}
        </h2>
        {validReading?.measurements && (
          <p className="session-recap__reading-line">
            {readingSentence(validReading.measurements)}
          </p>
        )}
        {painIntent?.mode === mode && (
          <p className="session-recap__personal">
            {painIntent.recapLine}
            {painIntent.id === 'stuck' &&
              ' Your movement history is under Session detail and history below.'}
          </p>
        )}
        <strong>{inconclusive ? inconclusive.fix : story.focus}</strong>
        <div className="session-recap__one-fix-meta">
          <span>
            {reps} {countedLabel(mode, reps)}
            {summary ? ` · ${Math.round(summary.duration)}s` : ''}
          </span>
          {sandowGrade ? (
            <span className="sandow-grade" style={{ color: sandowGrade.color }}>
              Grade {sandowGrade.grade}
            </span>
          ) : (
            <SandowGradeMark />
          )}
        </div>
        {sandowGrade ? <SandowGradeMark variant="lineage" style={{ margin: 0 }} /> : null}

        {nextReading && (
          <p className="session-recap__next-reading">
            <span>
              Next reading:{' '}
              {nextReading.toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </span>
            <button type="button" className="session-recap__calendar" onClick={downloadReadingIcs}>
              <CalendarPlus size={13} aria-hidden="true" />
              Add to calendar
            </button>
          </p>
        )}

        {/* The arm that closes the loop — a quiet door into the build, kept in
            the studio chassis (calm, no arcade flash). Threads the prize
            journey (loop → build → collaborate) into the product loop itself. */}
        {hasCorrection && (
          <p className="session-recap__arm-door">
            <ArrowUpRight size={13} aria-hidden="true" />
            <Link href="/build">The SO-101 arm shows this correction — see the build</Link>
          </p>
        )}
      </div>

      <p className="session-recap__flywheel" role="status">
        <span className="session-recap__flywheel-mark" aria-hidden="true" />
        <span>
          <strong>{BRAND.flywheelLine}</strong>
          {BRAND.flywheelTrust}
        </span>
      </p>

      {mode === 'curls' && formScores.length > 0 && (
        <div className="session-recap__form-scores motion-enter motion-delay-1">
          <div className="session-recap__form-scores-header">
            <p>Form Scores</p>
            <span>Average: {avgScore}/100</span>
          </div>
          <div className="session-recap__form-scores-chart">
            {formScores.map((score, i) => {
              const { grade, color } = getFormGrade(score);
              return (
                <div
                  key={i}
                  className="session-recap__form-scores-bar"
                  style={{ height: `${Math.max(8, (score / 100) * 32)}px`, backgroundColor: color }}
                  title={`Rep ${i + 1}: ${score}/100 (${grade})`}
                />
              );
            })}
          </div>
          <div className="session-recap__form-scores-stats">
            <span>Best: {Math.max(...formScores)}/100</span>
            <span>Reps: {formScores.length}</span>
          </div>
        </div>
      )}

      <div className="session-recap__story motion-enter motion-delay-1">
        <div className="session-recap__story-mark" aria-hidden="true">
          <CheckCircle2 size={17} />
        </div>
        <div>
          <p className="session-recap__story-eyebrow">What the coach learned</p>
          <h3>{inconclusive ? 'Why it stayed quiet' : story.title}</h3>
          <strong>{inconclusive ? inconclusive.cause : story.body}</strong>
        </div>
      </div>
      <div className="session-recap__item studio-card__item session-recap__item--good motion-enter motion-delay-1">
        <CheckCircle2 size={17} />
        <div>
          <p>{inconclusive ? 'What it means for your line' : 'What went well'}</p>
          <strong>
            {inconclusive
              ? 'An unclear read never moves your baseline — repeat the same setup and the next one counts.'
              : takeaway.strength}
          </strong>
        </div>
      </div>
      {summary?.trace && summary.trace.length > 0 && (
        <FormLine trace={summary.trace} avgDepth={summary.avgDepth} />
      )}

      {onTryAgain && (
        <button
          type="button"
          className="studio-card__button min-h-11"
          onClick={() => onTryAgain(inconclusive ? inconclusive.fix : story.focus)}
          aria-label={
            inconclusive
              ? `Take the ${mode} reading again: ${inconclusive.fix}`
              : `Try another ${mode} set with focus on ${story.focus}`
          }
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>{inconclusive ? 'Take the reading again' : 'Try this correction now'}</span>
        </button>
      )}

      {canEase && !easing && !awaitingSeverity && !easeLogged && (
        <button
          type="button"
          className="studio-card__button studio-card__button--quiet min-h-11"
          onClick={() => setEasing(true)}
        >
          <span>Ease it · under 2 min</span>
        </button>
      )}
      {easing && !awaitingSeverity && !easeLogged && (
        <StretchSequence
          mode={mode}
          tone="dark"
          onComplete={() => {
            setEasing(false);
            setAwaitingSeverity(true);
          }}
        />
      )}
      {awaitingSeverity && !easeLogged && (
        <div className="session-recap__ease-check">
          <p>How does it feel now?</p>
          <div
            className="session-recap__ease-chips"
            role="group"
            aria-label="How does it feel now?"
          >
            {[1, 2, 3, 4, 5].map((severity) => (
              <button
                key={severity}
                type="button"
                className="session-recap__ease-chip"
                onClick={() => {
                  if (easeJoint) {
                    addNiggleEntry({
                      joint: easeJoint,
                      context: niggleContext?.label,
                      severity,
                      note: 'After easing routine',
                    });
                  }
                  setAwaitingSeverity(false);
                  setEaseLogged(true);
                }}
              >
                {severity}
              </button>
            ))}
          </div>
          <div className="session-recap__ease-scale">
            <span>barely there</span>
            <span>a lot</span>
          </div>
        </div>
      )}
      {easeLogged && (
        <p className="session-recap__ease-logged" role="status">
          Logged — that&rsquo;s how it felt, not what the meter saw.
        </p>
      )}

      {/* Everything below is instrumentation, not story. It stays reachable but
          behind one disclosure: the recap used to render roughly a dozen panels
          at once, which buried the one sentence the session actually produced.
          ROADMAP asked for exactly this ("first render shows only Copy receipt
          and Share form line"). */}
      <details className="session-recap__more">
        <summary>Session detail and history</summary>

        {/* Grade arc stays curls-only — the grade series is a curl-form
            instrument. The movement card + history follow the mode's
            protocol, so a reach reading surfaces the same way. */}
        {mode === 'curls' && (
          <GradeArc series={buildGradeSeries(workouts ?? [], mode)} modeLabel={mode} />
        )}
        {protocol && (
          <>
            <MovementCard assessment={movementAssessment} />
            <MovementAssessmentHistory
              userAddress={userAddress}
              currentAssessment={movementAssessment}
              protocolId={protocol.id}
            />
          </>
        )}
        <FormReceipt
          mode={mode}
          reps={reps}
          summary={summary}
          movementAssessment={movementAssessment}
          movementChallenge={movementChallenge}
          isRace={isRace}
        />
        <FormSignatureHistory
          mode={mode}
          reps={reps}
          summary={summary}
          workouts={workouts}
          userAddress={userAddress}
          onStartSelfGhost={onStartSelfGhost}
          compact={mode === 'curls'}
        />
      </details>
    </section>
  );
}

export default SessionRecap;
