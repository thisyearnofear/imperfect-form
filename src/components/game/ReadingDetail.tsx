'use client';

import React from 'react';
import type { SessionSummary } from '@/services/sessionLogger';
import type { MovementAssessment, MovementAssessmentProtocol } from '@/types/movementAssessment';
import { qualityGates, reachRaisePeaks, reachSwayRead } from '@/lib/reachReading';

type ReadingDetailProps = {
  assessment: MovementAssessment;
  protocol: MovementAssessmentProtocol;
  summary: SessionSummary | null;
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * The numbers behind the read — the detail the recap's "Session detail and
 * history" accordion used to leave empty for reach. Every section renders
 * only when it has real data to show: per-raise elevation peaks, trunk sway,
 * left/right balance, and the protocol's own quality gates (all already in
 * the assessment record or the session trace). The comparison is the
 * protocol's capture targets and her own numbers — never a population.
 */
export function ReadingDetail({ assessment, protocol, summary }: ReadingDetailProps) {
  const isReach = assessment.mode === 'reach';
  const peaks = isReach ? reachRaisePeaks(summary) : [];
  const sway = isReach ? reachSwayRead(summary) : null;
  const measurements = assessment.measurements;
  const bilateralPct = Math.round(assessment.quality.bilateralFrameRatio * 100);
  const gates = qualityGates(assessment, protocol);

  const balanceText =
    measurements?.symmetry != null
      ? `Sides moved ${pct(measurements.symmetry)} matched`
      : bilateralPct > 0
        ? `Not compared — both arms were in frame ${bilateralPct}% of the time`
        : 'Not compared — keep both arms in frame next time';

  return (
    <section className="read-detail" aria-labelledby="read-detail-title">
      <p className="read-detail__eyebrow">The read, in detail</p>
      <h3 id="read-detail-title">What the meter measured</h3>

      {peaks.length > 0 && (
        <div className="read-detail__section">
          <p className="read-detail__label">Peak elevation per raise</p>
          <ul className="read-detail__peaks">
            {peaks.map((peak) => (
              <li
                key={peak.index}
                className={`read-detail__peak${peak.metLine ? ' is-counted' : ''}`}
              >
                <span>~{peak.elevationDeg}°</span>
                <em>{peak.metLine ? 'met the line' : 'below the line'}</em>
              </li>
            ))}
          </ul>
          <p className="read-detail__note">
            Rep counts past 135°
            {peaks.length > assessment.quality.repCount
              ? ' — the first raise was the free warm-up'
              : ''}
            .
          </p>
        </div>
      )}

      {sway && (
        <div className="read-detail__section">
          <p className="read-detail__label">Trunk sway</p>
          <p className="read-detail__value">
            {sway.judged
              ? sway.flaggedCount > 0
                ? `Lean-back flagged — max ${sway.maxLeanDeg}° past upright`
                : `No lean-back flagged — max ${sway.maxLeanDeg}° past upright`
              : 'Not judged — hips were out of frame'}
          </p>
        </div>
      )}

      <div className="read-detail__section">
        <p className="read-detail__label">Left / right balance</p>
        <p className="read-detail__value">{balanceText}</p>
      </div>

      <div className="read-detail__section">
        <p className="read-detail__label">Read quality — protocol gates</p>
        <ul className="read-detail__gates">
          {gates.map((gate) => (
            <li
              key={gate.label}
              className={`read-detail__gate${gate.pass ? ' is-pass' : ' is-short'}`}
            >
              <span>{gate.label}</span>
              <strong>
                {gate.observedText}{' '}
                <em>
                  {gate.pass ? '·' : 'under'} {gate.minimumText}
                </em>
              </strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default ReadingDetail;
