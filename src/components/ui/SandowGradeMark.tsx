import React from 'react';
import { BRAND } from '@/lib/brandPositioning';

/**
 * SandowGradeMark — the single component for the "Graded vs. Sandow · 1897"
 * heritage stamp. Used in the foyer (link), the live HUD (stamp), and the
 * session recap (lineage). One component, one copy source, three treatments
 * that match the doctrine ladder:
 *
 *   - stamp:   quiet brass hairline (HUD, recap fallback)
 *   - lineage: italic serif thread with hairline rules (recap, summary)
 *   - link:    lineage as an anchor to /lore (foyer)
 *
 * See design.md and sandow-spine.css for the register doctrine.
 */
export type SandowGradeMarkVariant = 'stamp' | 'lineage' | 'link';

export interface SandowGradeMarkProps {
  variant?: SandowGradeMarkVariant;
  /** Extra className for context-specific tweaks (e.g. 'hud-sandow-stamp') */
  className?: string;
  /** Override the text; defaults to BRAND.sandowGrade */
  children?: React.ReactNode;
  /** Link href for the 'link' variant. Defaults to /lore. */
  href?: string;
  style?: React.CSSProperties;
}

export function SandowGradeMark({
  variant = 'stamp',
  className,
  children,
  href = '/lore',
  style,
}: SandowGradeMarkProps) {
  const text = children ?? BRAND.sandowGrade;

  if (variant === 'link') {
    return (
      <a
        href={href}
        className={`sandow-lineage__link${className ? ` ${className}` : ''}`}
        style={style}
      >
        {text}
      </a>
    );
  }

  if (variant === 'lineage') {
    return (
      <p className={`sandow-lineage${className ? ` ${className}` : ''}`} style={style}>
        {text}
      </p>
    );
  }

  return (
    <span className={`sandow-stamp${className ? ` ${className}` : ''}`} style={style}>
      {text}
    </span>
  );
}

export default SandowGradeMark;
