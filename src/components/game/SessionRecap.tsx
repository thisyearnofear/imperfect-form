'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Copy, RotateCcw, Share2 } from 'lucide-react';
import type { ExerciseMode } from '@/utils/biomechanics';
import type { SessionSummary } from '@/services/sessionLogger';
import FormLine from './FormLine';
import FormSignatureHistory from './FormSignatureHistory';
import { nextFocusFor, sessionStory } from '@/lib/coachingStory';
import { BRAND } from '@/lib/brandPositioning';

type SessionRecapProps = {
  mode: ExerciseMode;
  reps: number;
  summary: SessionSummary | null;
  userAddress?: string;
  onTryAgain?: (focus: string) => void;
  onStartSelfGhost?: (workoutId: string) => void;
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
}: Omit<SessionRecapProps, 'onTryAgain' | 'userAddress'>) {
  const [action, setAction] = useState<ReceiptAction>('idle');
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
  userAddress,
  onTryAgain,
  onStartSelfGhost,
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
          <p>Next set focus</p>
          <strong>{story.focus}</strong>
        </div>
      </div>
      {summary?.trace && summary.trace.length > 0 && (
        <FormLine trace={summary.trace} avgDepth={summary.avgDepth} />
      )}
      <FormSignatureHistory
        mode={mode}
        reps={reps}
        summary={summary}
        userAddress={userAddress}
        onStartSelfGhost={onStartSelfGhost}
      />
      <FormReceipt mode={mode} reps={reps} summary={summary} />
      {onTryAgain && (
        <button
          type="button"
          className="studio-card__button min-h-11"
          onClick={() => onTryAgain(story.focus)}
          aria-label={`Try another ${mode} set focusing on ${story.focus}`}
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>Try this correction now</span>
        </button>
      )}
    </section>
  );
}

export default SessionRecap;
