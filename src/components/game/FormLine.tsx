'use client';

import React, { useMemo } from 'react';
import type { SessionSnapshot } from '@/types/workout';

type FormLineProps = {
  trace: SessionSnapshot[];
  avgDepth: number;
};

/**
 * A quiet visual signature of the set. It deliberately shows movement quality
 * as a trace instead of turning the recap into a dashboard of raw metrics.
 */
export function FormLine({ trace, avgDepth }: FormLineProps) {
  const points = useMemo(() => {
    if (trace.length < 2) return '';

    const samples = trace.length > 48 ? trace.filter((_, index) => index % 2 === 0) : trace;
    const depths = samples.map((snapshot) => snapshot.metrics.depth);
    const min = Math.min(...depths);
    const max = Math.max(...depths);
    const range = Math.max(max - min, 0.08);

    return samples
      .map((snapshot, index) => {
        const x = (index / Math.max(samples.length - 1, 1)) * 100;
        const y = 36 - ((snapshot.metrics.depth - min) / range) * 24;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [trace]);

  if (!points) {
    return (
      <div className="form-line form-line--empty" aria-label="Movement trace not available">
        <span className="form-line__empty-mark" aria-hidden="true" />
        <span>Movement trace will appear after a longer set.</span>
      </div>
    );
  }

  return (
    <figure className="form-line" aria-labelledby="form-line-title">
      <div className="form-line__header">
        <div>
          <p className="form-line__eyebrow">Your movement signature</p>
          <figcaption id="form-line-title">The set, read as a line</figcaption>
        </div>
        <span className="form-line__readout">{Math.round(avgDepth * 100)}% depth</span>
      </div>
      <svg
        className="form-line__chart"
        viewBox="0 0 100 42"
        role="img"
        aria-label={`Movement depth trace with ${Math.round(avgDepth * 100)} percent average depth`}
        preserveAspectRatio="none"
      >
        <path className="form-line__baseline" d="M0 36 H100" />
        <polyline className="form-line__path" points={points} pathLength="1" />
      </svg>
      <div className="form-line__legend" aria-hidden="true">
        <span>start</span>
        <span className="form-line__legend-line" />
        <span>finish</span>
      </div>
    </figure>
  );
}

export default FormLine;
