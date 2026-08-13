'use client';

import React, { useEffect, useRef } from 'react';
import { BRAND } from '@/lib/brandPositioning';
import { buildRangeArc, DIAL_TICKS, elbowDegToForearmRotation } from '@/lib/armSchematic';
import '@/styles/studio-atmosphere.css';

/** Target curl range — same band the live instrument uses (50–70°). */
const TARGET_DEG = 60;
const DRIFT_DEG = 120;
const EXTENDED_DEG = 160;

const targetRotation = elbowDegToForearmRotation(TARGET_DEG);
const driftRotation = elbowDegToForearmRotation(DRIFT_DEG);
const targetArc = buildRangeArc(EXTENDED_DEG, TARGET_DEG);
const driftArc = buildRangeArc(EXTENDED_DEG, DRIFT_DEG);

/**
 * Day-0 / studio shell backdrop — coaching bay with real SO-101 presence.
 * Photos: TheRobotStudio/SO-ARM100 (Apache-2.0), alpha cut-outs in public/atmosphere/.
 * CSS 3D cursor-gaze. Demo pulses via body[data-coach-pulse].
 *
 * The collage tells the loop in one glance: camera reads a curl → coach
 * understands → SO-101 shows the fix. Chain-color blooms stay in the earned
 * shell (ChainAmbient), not on the first viewport.
 *
 * The live twin instrument (CoachTwinPeek) is an earned-shell element and is
 * NOT rendered here on day-0 — it would float over the CoachFoyer headline.
 * The earned shell renders CoachTwinPeek directly in page.tsx.
 */
export function StudioAtmosphere({ quiet = false }: { quiet?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      el.style.setProperty('--gaze-x', '0');
      el.style.setProperty('--gaze-y', '0');
      return;
    }

    // Desktop / fine pointer: fuller 3D gaze. Coarse / touch: lighter parallax only.
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const gazeScale = finePointer ? 1 : 0.45;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      el.style.setProperty('--gaze-x', currentX.toFixed(3));
      el.style.setProperty('--gaze-y', currentY.toFixed(3));
      raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const nx = ((event.clientX / window.innerWidth) * 2 - 1) * gazeScale;
      const ny = ((event.clientY / window.innerHeight) * 2 - 1) * gazeScale;
      targetX = Math.max(-1, Math.min(1, nx));
      targetY = Math.max(-1, Math.min(1, ny));
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className="studio-atmosphere">
      <div className="studio-atmosphere__decor" aria-hidden="true">
        <div className="studio-atmosphere__wash" />

        <div className="studio-atmosphere__bay" />
        <div className="studio-atmosphere__rails" />
        <div className="studio-atmosphere__calibration">
          {/* Sparse MoveNet landmarks — what the camera measures, not a person icon. */}
          <svg className="studio-atmosphere__landmarks" viewBox="0 0 100 72" fill="none">
            <path d="M50 10 V22 M38 24 H62 M38 24 L28 38 L22 52 M62 24 L72 36 L80 48 M42 56 H58" />
            <circle cx="50" cy="10" r="2.2" />
            <circle cx="38" cy="24" r="1.7" />
            <circle cx="62" cy="24" r="1.7" />
            <circle cx="28" cy="38" r="1.7" />
            <circle cx="72" cy="36" r="1.7" />
            <circle className="is-focus" cx="22" cy="52" r="2" />
            <circle cx="80" cy="48" r="1.7" />
            <circle cx="42" cy="56" r="1.5" />
            <circle cx="58" cy="56" r="1.5" />
          </svg>
        </div>
        <div className="studio-atmosphere__floor" />
        <div className="studio-atmosphere__plinth" />
        <div className="studio-atmosphere__grain" />

        <div className="studio-atmosphere__stage-frame">
          <div className="studio-atmosphere__stage">
            <div className="studio-atmosphere__arm-glow" />
            <span className="studio-atmosphere__stage-label">PHYSICAL COACH</span>
            <span className="studio-atmosphere__state-readout" />
            <img
              className="studio-atmosphere__arm-photo"
              src="/atmosphere/so101-follower-cutout.webp"
              alt=""
              width={1280}
              height={960}
              decoding="async"
              fetchPriority="low"
            />
            <img
              className="studio-atmosphere__arm-photo studio-atmosphere__arm-photo--ghost"
              src="/atmosphere/so101-leader-cutout.webp"
              alt=""
              width={1280}
              height={960}
              decoding="async"
              fetchPriority="low"
            />

            <svg
              className="studio-atmosphere__arc"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <marker
                  id="studio-atmosphere-arrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="4"
                  refY="3"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
                </marker>
              </defs>
              <path
                d="M 30 140 C 50 70, 110 35, 170 40"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeDasharray="5 7"
                strokeLinecap="round"
                markerEnd="url(#studio-atmosphere-arrow)"
              />
              <circle cx="170" cy="40" r="4.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Camera half of the loop — same forearm-from-hub dial as the live
            curl instrument. Ghost = target. Solid = the drift the camera catches. */}
        <div className="studio-atmosphere__figure">
          <svg className="studio-atmosphere__curl-plate" viewBox="0 0 60 72" fill="none">
            {DIAL_TICKS.map((tick) => (
              <line
                key={tick.deg}
                x1={tick.x1.toFixed(2)}
                y1={tick.y1.toFixed(2)}
                x2={tick.x2.toFixed(2)}
                y2={tick.y2.toFixed(2)}
                stroke="currentColor"
                strokeWidth={tick.major ? 1.2 : 0.7}
                opacity={tick.major ? 0.45 : 0.22}
                strokeLinecap="round"
              />
            ))}
            {driftArc ? (
              <path
                className="studio-atmosphere__curl-drift-arc"
                d={driftArc}
                stroke="currentColor"
                strokeWidth="1.4"
                strokeDasharray="2 5"
                strokeLinecap="round"
                opacity="0.35"
              />
            ) : null}
            {targetArc ? (
              <path
                className="studio-atmosphere__curl-target-arc"
                d={targetArc}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.55"
              />
            ) : null}
            <path
              d="M18 48 V44"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity="0.8"
            />
            <g
              className="studio-atmosphere__curl-ghost"
              style={{ transform: `rotate(${targetRotation}deg)` }}
            >
              <path
                d="M18 44 H40"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeDasharray="2 4"
                opacity="0.45"
              />
              <circle
                cx="40"
                cy="44"
                r="2.6"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                opacity="0.55"
              />
            </g>
            <g
              className="studio-atmosphere__curl-forearm"
              style={{ transform: `rotate(${driftRotation}deg)` }}
            >
              <path d="M18 44 H40" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="40" cy="44" r="2.8" fill="currentColor" opacity="0.9" />
            </g>
            <circle cx="18" cy="44" r="3.1" fill="currentColor" />
            <circle cx="18" cy="52" r="3.8" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
          </svg>
          <span className="studio-atmosphere__figure-label">Camera reads</span>
        </div>

        <div className="studio-atmosphere__loop">
          <span>Camera</span>
          <i />
          <span>Coach</span>
          <i />
          <span>SO-101</span>
        </div>

        {quiet ? null : (
          <>
            <div className="studio-atmosphere__bay-status">
              <span>Coach bay</span>
              <span>SO-101</span>
              <span className="is-live">When connected</span>
            </div>

            <p className="studio-atmosphere__heritage">{BRAND.sandowSpan}</p>

            <p className="studio-atmosphere__caption">
              <span className="studio-atmosphere__caption-default">
                Camera sees you · coach shows the fix
              </span>
              <span className="studio-atmosphere__caption-state caption-state--selected">
                Coaching path ready
              </span>
              <span className="studio-atmosphere__caption-state caption-state--starting">
                Arming the coach
              </span>
              <span className="studio-atmosphere__caption-state caption-state--camera">
                Camera online
              </span>
              <span className="studio-atmosphere__caption-state caption-state--ai">
                Loading pose model
              </span>
              <span className="studio-atmosphere__caption-state caption-state--positioning">
                Find your frame
              </span>
              <span className="studio-atmosphere__caption-state caption-state--tracking">
                Tracking live
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default StudioAtmosphere;
