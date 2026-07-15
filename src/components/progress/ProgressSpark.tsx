'use client';

import React, { useId, useMemo } from 'react';
import type { AestheticRegister } from '@/lib/brandPositioning';
import type { ProgressSeriesPoint } from '@/lib/progress/recentProgress';
import './progress-spark.css';

export type ProgressSparkRegister = Exclude<AestheticRegister, 'lab'> | 'lab';

interface ProgressSparkProps {
  points: ProgressSeriesPoint[];
  register?: ProgressSparkRegister;
  /** Animate path once on mount (ease-out). Default true. */
  animate?: boolean;
  title?: string;
  className?: string;
  /** Inclusive empty / single-point copy */
  emptyHint?: string;
}

/**
 * Lightweight SVG progress spark — register-aware.
 * Charts belong on celebrate + earned dashboard, never the day-0 foyer.
 */
export const ProgressSpark: React.FC<ProgressSparkProps> = ({
  points,
  register = 'arcade',
  animate = true,
  title = 'Recent progress',
  className = '',
  emptyHint = 'Come back tomorrow — progress draws itself.',
}) => {
  const gradId = useId().replace(/:/g, '');

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const w = 280;
    const h = 72;
    const padX = 8;
    const padY = 10;
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, 1);
    const coords = points.map((p, i) => {
      const x = points.length === 1 ? w / 2 : padX + (i / (points.length - 1)) * (w - padX * 2);
      const y = h - padY - ((p.value - min) / span) * (h - padY * 2);
      return { x, y, ...p };
    });
    const line = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(' ');
    const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${h - padY} L${coords[0].x.toFixed(1)},${h - padY} Z`;
    return { w, h, coords, line, area };
  }, [points]);

  if (!geometry || points.length < 2) {
    return (
      <div
        className={`progress-spark progress-spark--${register} progress-spark--empty ${className}`}
      >
        <p className="progress-spark__title">{title}</p>
        <p className="progress-spark__hint">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div
      className={`progress-spark progress-spark--${register} ${className}`}
      data-register={register}
    >
      <div className="progress-spark__header">
        <p className="progress-spark__title">{title}</p>
        <p className="progress-spark__meta tabular-nums">
          {points[0].label} → {points[points.length - 1].label}
        </p>
      </div>
      <svg
        className={`progress-spark__svg${animate ? ' progress-spark__svg--animate' : ''}`}
        viewBox={`0 0 ${geometry.w} ${geometry.h}`}
        role="img"
        aria-label={`${title}: ${points.length} sessions`}
      >
        <defs>
          <linearGradient id={`fill-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop className="progress-spark__stop-top" offset="0%" />
            <stop className="progress-spark__stop-bot" offset="100%" />
          </linearGradient>
        </defs>
        <path className="progress-spark__area" d={geometry.area} fill={`url(#fill-${gradId})`} />
        <path className="progress-spark__line" d={geometry.line} fill="none" />
        {geometry.coords.map((c) => (
          <circle key={c.t} className="progress-spark__dot" cx={c.x} cy={c.y} r={2.5} />
        ))}
      </svg>
      <div className="progress-spark__footer tabular-nums">
        <span>{Math.round(points[points.length - 1].value)} XP last</span>
        <span>{points.reduce((s, p) => s + p.reps, 0)} reps</span>
      </div>
    </div>
  );
};

export default ProgressSpark;
