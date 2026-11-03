'use client';

/**
 * textMotion — the character-by-character text grammar.
 *
 * One effect per text role (docs/RECEIVING_EXPERIENCE.md register: brass /
 * teal hairlines, engraved type, calm — no WebGL, no new deps):
 *
 *  - Envelope greeting  → handwritten per-char reveal (ReceivingFoyer)
 *  - Gift note          → typewriter                    (ReceivingFoyer)
 *  - Link headline      → letterpress settle            (ReceivingFoyer)
 *  - Fig 2 verdict      → stamp                         (SessionRecap)
 *
 * Everything here is plain JSX spans + CSS keyframes (or a light interval
 * for the typewriter). All four collapse to instant text under
 * prefers-reduced-motion — the CSS halves live in @media blocks, the JS
 * halves early-return the full string.
 */

import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { prefersReducedMotion } from '@/components/game/CoachFoyer';

/** Live prefers-reduced-motion — the one media check every effect shares. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export type CharPiecesOptions = {
  /** ms before the first character starts its keyframe. */
  baseDelay?: number;
  /** ms between consecutive characters. */
  step?: number;
  /** Continue a previous piece's stagger count (e.g. before an <em>). */
  startIndex?: number;
  /** Flat extra ms for every char — the brass beat lands late. */
  extraDelay?: number;
  charClassName: string;
  wordClassName: string;
  /**
   * Emit real space text nodes between word spans — correct inside normal
   * inline flow (h1, p). Flex containers collapse whitespace text nodes, so
   * leave this false there and space the word spans with CSS margin instead.
   */
  includeSpaces?: boolean;
};

export type CharPieces = {
  nodes: ReactNode[];
  /** Characters emitted — feed back as `startIndex` for the next piece. */
  count: number;
};

/**
 * Split `text` into per-character spans, word-wrapped so lines never break
 * mid-word. Aria stays honest one level up: give the parent an aria-label
 * and these spans are aria-hidden (spaces are bare text nodes and carry no
 * accessible name of their own).
 */
export function charPieces(
  text: string,
  {
    baseDelay = 0,
    step = 18,
    startIndex = 0,
    extraDelay = 0,
    charClassName,
    wordClassName,
    includeSpaces = false,
  }: CharPiecesOptions
): CharPieces {
  const nodes: ReactNode[] = [];
  let idx = 0;
  text
    .split(' ')
    .filter((word) => word.length > 0)
    .forEach((word, w) => {
      if (w > 0 && includeSpaces) nodes.push(' ');
      const chars = [...word].map((ch) => {
        const delay = baseDelay + (startIndex + idx) * step + extraDelay;
        idx += 1;
        return (
          // The letter rides in the key so a retitled word animates only
          // the characters that actually changed.
          <span
            key={`${idx}:${ch}`}
            className={charClassName}
            style={{ animationDelay: `${delay}ms` }}
          >
            {ch}
          </span>
        );
      });
      nodes.push(
        <span key={`${w}:${word}`} className={wordClassName} aria-hidden="true">
          {chars}
        </span>
      );
    });
  return { nodes, count: idx };
}

export type TypewriterOptions = {
  /** Gate typing until the reveal surface is on stage (e.g. envelope lifted). */
  enabled?: boolean;
  /** ms per character — the note's cadence. */
  msPerChar?: number;
  /** Hard cap on total typing duration; long notes type faster, never longer. */
  maxDuration?: number;
  /** ms before the first keystroke. */
  startDelay?: number;
};

/**
 * Type `text` character-by-character. Under reduced motion (or before
 * `enabled`) the full string returns instantly — same DOM, zero ticks.
 */
export function useTypewriter(
  text: string | null,
  { enabled = true, msPerChar = 16, maxDuration = 2400, startDelay = 0 }: TypewriterOptions = {}
): { text: string; done: boolean } {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const len = text?.length ?? 0;

  useEffect(() => {
    if (!text || !enabled || reduced) {
      setCount(len);
      return;
    }
    setCount(0);
    // Type slower notes at cadence; squeeze long notes under the cap by
    // laying several characters per tick — the rhythm, not the wait, flexes.
    const charsPerTick = Math.max(1, Math.ceil(len / (maxDuration / msPerChar)));
    let interval: ReturnType<typeof setInterval> | undefined;
    let i = 0;
    const kickoff = setTimeout(() => {
      interval = setInterval(() => {
        i += charsPerTick;
        const next = Math.min(len, i);
        setCount(next);
        if (next >= len && interval) clearInterval(interval);
      }, msPerChar);
    }, startDelay);
    return () => {
      clearTimeout(kickoff);
      if (interval) clearInterval(interval);
    };
  }, [text, enabled, reduced, len, msPerChar, maxDuration, startDelay]);

  const instant = !text || !enabled || reduced;
  return {
    text: text ? (instant ? text : text.slice(0, count)) : '',
    done: instant || count >= len,
  };
}

/**
 * Tiny IntersectionObserver — true once the element first crosses ~35% of
 * the viewport, latching (replay-once). No IO in the environment resolves
 * true immediately so content never stays hidden.
 */
export function useInViewOnce<T extends HTMLElement>(
  ref: RefObject<T | null>,
  deps: unknown[] = []
): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
    // The caller passes the mount-affecting deps (e.g. data arriving) —
    // the ref itself is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return seen;
}
