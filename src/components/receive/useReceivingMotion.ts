'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { prefersReducedMotion } from '@/components/game/CoachFoyer';

/**
 * Receiving-foyer motion — one reduced-motion check shared by every moving
 * part, a rAF arm cycle driving the plate's `progress`, and the scroll
 * choreography (seam dissolves + the Beat-3 scroll-scrubbed rep).
 *
 * GSAP + ScrollTrigger load dynamically inside the scroll effect — never in
 * the main bundle for organic visitors, and the whole effect no-ops under
 * prefers-reduced-motion (seams become cuts, the figure rests raised).
 */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// —— Arm cycle ————————————————————————————————————————————

type CycleMode = 'loop' | 'rep' | 'scrub';

const LOOP = { raise: 1700, hold: 450, lower: 1400, rest: 450 };
const REP = { raise: 2100, hold: 600, lower: 1700, rest: 0 };

const smooth = (x: number) => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
};

/** Progress within one raise cycle: raise → hold → lower → rest. */
function phaseProgress(t: number, seg: typeof LOOP): { p: number; raising: boolean } {
  if (t < seg.raise) return { p: smooth(t / seg.raise), raising: true };
  if (t < seg.raise + seg.hold) return { p: 1, raising: false };
  if (t < seg.raise + seg.hold + seg.lower) {
    return { p: 1 - smooth((t - seg.raise - seg.hold) / seg.lower), raising: false };
  }
  return { p: 0, raising: false };
}

export type ArmCycle = {
  /** 0..1 arm raise for the hero plate. */
  progress: number;
  /** Pips latch as the arm passes each fifth of the raise; reset at rest. */
  litPips: number;
  /** Tap: play one slow rep through, then resume the loop. */
  playRep: () => void;
  /** Hold: pointer position scrubs the arm angle directly. */
  beginScrub: () => void;
  scrubTo: (p: number) => void;
  endScrub: () => void;
};

export function useArmCycle({ active, reduced }: { active: boolean; reduced: boolean }): ArmCycle {
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const [litPips, setLitPips] = useState(reduced ? 5 : 0);
  const st = useRef<{ mode: CycleMode; t: number; lit: number }>({ mode: 'loop', t: 0, lit: 0 });

  useEffect(() => {
    if (reduced) {
      setProgress(1);
      setLitPips(5);
      return;
    }
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const s = st.current;
      if (s.mode === 'loop' || s.mode === 'rep') {
        const seg = s.mode === 'rep' ? REP : LOOP;
        const total = seg.raise + seg.hold + seg.lower + seg.rest;
        s.t += dt;
        if (s.t >= total) {
          s.t = s.mode === 'rep' ? 0 : s.t % total;
          s.mode = 'loop';
          s.lit = 0;
          setLitPips(0);
        }
        const { p, raising } = phaseProgress(s.t, seg);
        setProgress(p);
        if (raising) {
          const lit = Math.min(5, Math.floor(p * 5.001));
          if (lit > s.lit) {
            s.lit = lit;
            setLitPips(lit);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reduced]);

  const playRep = useCallback(() => {
    st.current = { mode: 'rep', t: 0, lit: 0 };
    setLitPips(0);
  }, []);

  const beginScrub = useCallback(() => {
    st.current.mode = 'scrub';
  }, []);

  const scrubTo = useCallback((p: number) => {
    const v = p < 0 ? 0 : p > 1 ? 1 : p;
    st.current.t = 0;
    setProgress(v);
    const lit = Math.min(5, Math.floor(v * 5.001));
    st.current.lit = lit;
    setLitPips(lit);
  }, []);

  const endScrub = useCallback(() => {
    st.current = { mode: 'loop', t: 0, lit: 0 };
    setLitPips(0);
  }, []);

  return { progress, litPips, playRep, beginScrub, scrubTo, endScrub };
}

// —— Pixel dissolve (canvas 2D seam vocabulary) ————————————

/**
 * Mosaic dissolve: a grid of cells over `canvas`, each assigned a random
 * threshold. Cells clear in threshold order, leaving a brief brass fringe at
 * the dissolve front — the seam reading as pixels, not a fade.
 */
export function pixelDissolve(
  canvas: HTMLCanvasElement,
  {
    duration = 420,
    color = '#061013',
    skipFill = false,
  }: { duration?: number; color?: string; skipFill?: boolean } = {}
): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve();
      return;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) {
      resolve();
      return;
    }
    if (skipFill) {
      // Caller already sized + filled — resizing here would wipe the fill.
      if (!canvas.width || !canvas.height) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
    } else {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const cell = Math.max(12, Math.round(w / 26));
    const cols = Math.ceil(canvas.width / (cell * dpr));
    const rows = Math.ceil(canvas.height / (cell * dpr));
    const keys = new Float32Array(cols * rows);
    for (let i = 0; i < keys.length; i++) keys[i] = Math.random();

    // Cover the canvas first so frame 0 reads as the surface, not a hole —
    // unless the caller pre-filled (the envelope flips its own background
    // transparent in the same commit and can't afford a flash).
    if (!skipFill) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const k = keys[r * cols + c];
          if (k >= t) {
            ctx.fillRect(c * cell * dpr, r * cell * dpr, cell * dpr, cell * dpr);
          } else if (t - k < 0.12) {
            // brief brass fringe on the dissolve front
            ctx.fillStyle = 'rgba(252,177,49,0.5)';
            ctx.fillRect(c * cell * dpr, r * cell * dpr, cell * dpr, cell * dpr);
            ctx.fillStyle = color;
          }
        }
      }
      if (t < 1) requestAnimationFrame(step);
      else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

// —— Scroll choreography (GSAP lazy-loaded on this path) ——————————

export type ReceivingScrollOptions = {
  /** Root of the receiving foyer (seam canvases discovered inside). */
  rootRef: RefObject<HTMLElement | null>;
  /** Beat-3 section — scroll progress IS the rep. */
  scrubRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  reduced: boolean;
  onScrubProgress: (p: number) => void;
};

export function useReceivingScroll({
  rootRef,
  scrubRef,
  enabled,
  reduced,
  onScrubProgress,
}: ReceivingScrollOptions): void {
  const onScrubRef = useRef(onScrubProgress);
  onScrubRef.current = onScrubProgress;

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || reduced || !root) return;

    let cancelled = false;
    let ctxRevert: (() => void) | undefined;

    (async () => {
      try {
        const { gsap } = await import('gsap');
        const { ScrollTrigger } = await import('gsap/ScrollTrigger');
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);

        const ctx = gsap.context(() => {
          // Beat 3 — the scroll IS the rep: scrub drives the same `progress`
          // prop the tap and the loop share.
          if (scrubRef.current) {
            ScrollTrigger.create({
              trigger: scrubRef.current,
              start: 'top 82%',
              end: 'bottom 55%',
              scrub: 0.6,
              onUpdate: (self) => onScrubRef.current(self.progress),
            });
          }

          // Seams — canvas pixel dissolve as each seam crosses 60% of the
          // viewport; the hairline underneath is the residue.
          root.querySelectorAll<HTMLElement>('.rf-seam').forEach((seam) => {
            const canvas = seam.querySelector<HTMLCanvasElement>('canvas');
            ScrollTrigger.create({
              trigger: seam,
              start: 'top 60%',
              once: true,
              onEnter: () => {
                if (canvas) void pixelDissolve(canvas);
                seam.classList.add('is-open');
              },
            });
          });

          // Beats rise once as they enter.
          root.querySelectorAll<HTMLElement>('.rf-beat').forEach((beat) => {
            gsap.fromTo(
              beat,
              { autoAlpha: 0, y: 26 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.7,
                ease: 'power3.out',
                scrollTrigger: { trigger: beat, start: 'top 78%', once: true },
              }
            );
          });
        }, root);
        ctxRevert = () => ctx.revert();
      } catch {
        // GSAP unavailable → content stays put (no initial hiding was applied
        // by CSS for beats; scrub falls back to a mid-pose). Mark seams open
        // so the hairline residue still reads.
        if (!cancelled) {
          onScrubRef.current(0.65);
          root.querySelectorAll('.rf-seam').forEach((s) => s.classList.add('is-open'));
        }
      }
    })();

    return () => {
      cancelled = true;
      ctxRevert?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reduced]);
}
