'use client';

import React from 'react';
import { getFormGrade } from '@/lib/formGrade';
import type { GradeSeries } from '@/lib/progress/gradeHistory';
import '@/styles/session-recap.css';

type GradeArcProps = {
  series: GradeSeries;
  /** Exercise label for the header, e.g. "curls". */
  modeLabel: string;
};

/**
 * The long-term grade arc — one chip per graded session, oldest → newest.
 * The recap grades a single set; this shows the arc across sets, the
 * "graded against yourself over time" surface the heritage argument promises.
 * Renders nothing unless there are ≥2 graded sessions (a real arc).
 */
export function GradeArc({ series, modeLabel }: GradeArcProps) {
  const { points, first, latest, hasArc } = series;
  if (!hasArc || !first || !latest) return null;

  const improved = latest.score > first.score;
  const declined = latest.score < first.score;

  return (
    <div className="session-recap__grade-arc motion-enter motion-delay-1">
      <div className="session-recap__grade-arc-header">
        <p>Grade arc · {modeLabel}</p>
        <span>
          {first.grade} → {latest.grade}
        </span>
      </div>
      <div
        className="session-recap__grade-arc-chips"
        role="img"
        aria-label={`Form grade across ${points.length} graded sessions, from ${first.grade} to ${latest.grade}`}
      >
        {points.map((p) => {
          const { color } = getFormGrade(p.score);
          return (
            <span
              key={p.t}
              className="session-recap__grade-arc-chip"
              style={{ color, borderColor: color }}
              title={`${p.label}: ${p.score}/100 (${p.grade})`}
            >
              {p.grade}
            </span>
          );
        })}
      </div>
      <div className="session-recap__grade-arc-stats">
        <span>
          {improved
            ? `Up ${latest.score - first.score} pts since ${first.label}`
            : declined
              ? `Down ${first.score - latest.score} pts since ${first.label}`
              : `Holding steady since ${first.label}`}
        </span>
        <span>{points.length} graded sessions</span>
      </div>
    </div>
  );
}

export default GradeArc;
