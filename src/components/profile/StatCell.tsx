'use client';

import React from 'react';

interface StatCellProps {
  /** Small uppercase section label above the value. */
  label: string;
  /** The bold stat value. */
  value: React.ReactNode;
  /** Small muted suffix beside the value (e.g. 'reps', 'days'). */
  unit?: string;
  /** Tailwind text-color class for the value. Defaults to brass (graded). */
  valueClassName?: string;
}

/**
 * Studio stats-row cell — quiet uppercase label over a bold value with an
 * optional muted unit. Used for personal bests / streaks on the profile tab.
 * Brass is the default (graded against the ideal); pass paper-soft for quiet
 * earned rows.
 */
export const StatCell: React.FC<StatCellProps> = ({
  label,
  value,
  unit,
  valueClassName = 'text-[var(--sandow-brass)]',
}) => (
  <div className="space-y-1">
    <div className="studio-card__section-title">{label}</div>
    <div className="flex items-baseline gap-1.5">
      <span className={`text-xl font-bold ${valueClassName}`}>{value}</span>
      {unit && <span className="text-[11px] text-[var(--studio-muted)] font-mono">{unit}</span>}
    </div>
  </div>
);

export default StatCell;
