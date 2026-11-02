'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExerciseMode } from '@/utils/biomechanics';
import { MovementPreview } from '@/components/game/MovementPreview';
import '@/styles/demo-plate.css';

type DemoPlateProps = {
  mode: ExerciseMode;
  selectedExerciseLabel?: string;
  /** Optional callout text for Phase A (curls chips only). */
  callout?: string;
};

/**
 * Plate I — "The curl". A deterministic ~8s CSS choreography demonstrating
 * the product loop: your rep (elbow drifts) → the fix (cue + coach arm shows
 * it) → next rep (clean, stamped). Illustration only — not live camera data.
 *
 * All motion is transform/opacity/stroke-dashoffset, paused offscreen and
 * when the tab is hidden (data-playing on the root). prefers-reduced-motion
 * renders the static final frame: clean rep + stamp + captions.
 */
export function DemoPlate({ mode, selectedExerciseLabel = 'Curls', callout }: DemoPlateProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(true);
  const [staticFrame, setStaticFrame] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStaticFrame(true);
      setPlaying(false);
      return;
    }

    const inView = () => {
      const r = el.getBoundingClientRect();
      return (
        r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth
      );
    };
    let visible = inView();
    const update = () => setPlaying(visible && !document.hidden);
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        update();
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <figure
      ref={rootRef}
      className={`demo-plate${staticFrame ? ' is-static' : ''}`}
      data-playing={playing ? 'true' : 'false'}
      role="img"
      aria-label="Illustrated sequence: a skeleton curls with the elbow drifting forward, a callout marks the fault, the coach arm demonstrates the fix, then the rep repeats clean and is stamped."
    >
      <div className="demo-plate__caption">
        <span className="demo-plate__caption-num">PLATE I</span>
        <span className="demo-plate__caption-sep">·</span>
        <span>THE CURL</span>
      </div>

      <div className="demo-plate__stage" aria-hidden="true">
        {mode === 'curls' ? (
          <svg className="demo-plate__svg" viewBox="-15 0 450 360" focusable="false">
            {/* Faint engraved hatch backdrop */}
            <defs>
              <pattern id="dp-hatch" width="7" height="7" patternUnits="userSpaceOnUse">
                <path d="M0 7 L7 0" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect
              className="demo-plate__hatch"
              x="8"
              y="8"
              width="404"
              height="344"
              fill="url(#dp-hatch)"
            />

            {/* Ruler ticks, left edge */}
            <g className="demo-plate__ruler">
              {[40, 80, 120, 160, 200, 240, 280, 320].map((y) => (
                <line key={y} x1="10" y1={y} x2={y % 80 === 40 ? 20 : 16} y2={y} />
              ))}
            </g>

            {/* Tick-mark angle readout sweeping at the elbow */}
            <g className="demo-plate__ticks" transform="translate(196 178)">
              {[0, 30, 60, 90, 120, 150].map((deg) => (
                <line
                  key={deg}
                  className="demo-plate__tick"
                  style={{ transform: `rotate(${deg - 90}deg)` }}
                  x1="0"
                  y1="-46"
                  x2="0"
                  y2="-38"
                />
              ))}
            </g>

            {/* Skeleton — static torso shared by all phases */}
            <g className="demo-plate__body">
              <circle className="demo-plate__bone" cx="210" cy="62" r="15" />
              <path className="demo-plate__bone" d="M210 78 V110 M186 108 H234 M210 110 L206 176" />
              <path className="demo-plate__bone" d="M186 108 L196 178" />
              {/* off arm behind */}
              <path
                className="demo-plate__bone demo-plate__bone--dim"
                d="M234 108 L252 158 L244 196"
              />
              {/* legs */}
              <path
                className="demo-plate__bone"
                d="M206 176 L188 252 L184 300 M206 176 L226 250 L230 300"
              />
            </g>

            {/* PHASE A — your rep: forearm curls while the elbow drifts forward */}
            <g className="demo-plate__phaseA">
              <g className="demo-plate__elbow-a" transform="translate(196 178)">
                <g className="demo-plate__forearm-a">
                  <line className="demo-plate__bone" x1="0" y1="0" x2="0" y2="62" />
                  <circle className="demo-plate__joint" cx="0" cy="66" r="5" />
                </g>
              </g>
              {/* actual path — diverges from the ideal */}
              <path
                className="demo-plate__path demo-plate__path-a"
                d="M212 240 C 252 218, 262 172, 226 132"
              />
              {/* callout leader + label */}
              <g className="demo-plate__callout">
                <path className="demo-plate__leader" d="M226 168 L286 140" />
                <circle className="demo-plate__leader-dot" cx="226" cy="168" r="2.4" />
                <text className="demo-plate__callout-text" x="292" y="136">
                  {callout ?? 'Elbow drifts forward'}
                </text>
              </g>
            </g>

            {/* Ideal path — brass dashed arc, always faintly present */}
            <path
              className="demo-plate__path demo-plate__path-ideal"
              d="M196 240 C 196 200, 196 160, 196 120 A 62 62 0 0 0 164 96"
            />

            {/* PHASE B — the cue + the coach arm shows the fix */}
            <g className="demo-plate__phaseB">
              <text className="demo-plate__cue" x="292" y="136">
                Pin your elbow.
              </text>
              <g className="demo-plate__coach-panel" transform="translate(268 168) scale(1.4)">
                <rect
                  className="demo-plate__panel"
                  x="-16"
                  y="-16"
                  width="104"
                  height="104"
                  rx="10"
                />
                <line className="demo-plate__panel-base" x1="0" y1="72" x2="72" y2="72" />
                <rect
                  className="demo-plate__coach-base"
                  x="30"
                  y="66"
                  width="14"
                  height="8"
                  rx="2"
                />
                <g className="demo-plate__link1" transform="translate(37 66)">
                  <line className="demo-plate__coach-bone" x1="0" y1="0" x2="0" y2="-30" />
                  <g className="demo-plate__link2" transform="translate(0 -30)">
                    <line className="demo-plate__coach-bone" x1="0" y1="0" x2="24" y2="0" />
                    <circle
                      className="demo-plate__coach-joint demo-plate__j3"
                      cx="24"
                      cy="0"
                      r="3"
                    />
                  </g>
                  <circle
                    className="demo-plate__coach-joint demo-plate__j2"
                    cx="0"
                    cy="0"
                    r="3.4"
                  />
                </g>
                <circle
                  className="demo-plate__coach-joint demo-plate__j1"
                  cx="37"
                  cy="66"
                  r="3.4"
                />
              </g>
            </g>

            {/* PHASE C — next rep, clean: pinned elbow, path on the arc, stamp */}
            <g className="demo-plate__phaseC">
              <g className="demo-plate__elbow-c" transform="translate(196 178)">
                <g className="demo-plate__forearm-c">
                  <line className="demo-plate__bone" x1="0" y1="0" x2="0" y2="62" />
                  <circle className="demo-plate__joint" cx="0" cy="66" r="5" />
                </g>
              </g>
              <path
                className="demo-plate__path demo-plate__path-c"
                d="M196 240 C 196 200, 196 160, 196 120 A 62 62 0 0 0 164 96"
              />
              <g className="demo-plate__stamp" transform="translate(322 258)">
                <rect
                  className="demo-plate__stamp-box"
                  x="-56"
                  y="-20"
                  width="112"
                  height="40"
                  rx="4"
                />
                <text className="demo-plate__stamp-text" x="0" y="6" textAnchor="middle">
                  CLEAN REP
                </text>
              </g>
            </g>
          </svg>
        ) : (
          <div className="demo-plate__preview">
            <MovementPreview key={mode} mode={mode} label={selectedExerciseLabel} />
          </div>
        )}
      </div>

      <figcaption className="demo-plate__footer">Illustration. Not live camera data.</figcaption>
    </figure>
  );
}

export default DemoPlate;
