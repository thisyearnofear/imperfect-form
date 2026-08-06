'use client';

import React, { useEffect, useRef } from 'react';
import '@/styles/studio-atmosphere.css';

/**
 * Day-0 / studio shell backdrop — coaching bay with real SO-101 presence.
 * Photos: TheRobotStudio/SO-ARM100 (Apache-2.0), alpha cut-outs in public/atmosphere/.
 * CSS 3D cursor-gaze + multi-chain blooms. Demo pulses via body[data-coach-pulse].
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

        {/* Planned live networks — soft blooms, not a theme takeover */}
        <div className="studio-atmosphere__spectrum">
          <span className="studio-atmosphere__bloom studio-atmosphere__bloom--celo" />
          <span className="studio-atmosphere__bloom studio-atmosphere__bloom--base" />
          <span className="studio-atmosphere__bloom studio-atmosphere__bloom--avalanche" />
          <span className="studio-atmosphere__bloom studio-atmosphere__bloom--monad" />
        </div>

        <div className="studio-atmosphere__bay" />
        <div className="studio-atmosphere__rails" />
        <div className="studio-atmosphere__calibration" />
        <div className="studio-atmosphere__floor" />
        <div className="studio-atmosphere__plinth" />
        <div className="studio-atmosphere__grain" />

        <div className="studio-atmosphere__stage-frame">
          <div className="studio-atmosphere__stage">
            <div className="studio-atmosphere__arm-glow" />
            <span className="studio-atmosphere__stage-label">PHYSICAL COACH</span>
            <span className="studio-atmosphere__state-readout" aria-hidden="true" />
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

        {/* The human half of the loop is a motion study, not an avatar: a
            quiet gesture trace + sparse joints suggest camera interpretation
            without turning the backdrop into fitness clip-art. Decorative. */}
        <div className="studio-atmosphere__figure" aria-hidden="true">
          <svg className="studio-atmosphere__motion-study" viewBox="0 0 240 180" fill="none">
            <path
              className="studio-atmosphere__motion-trace studio-atmosphere__motion-trace--ghost"
              transform="translate(-8 4)"
              d="M38 146 C58 122 62 98 56 76 C51 57 58 38 75 28 C92 18 110 27 113 43 C116 58 104 70 89 78 C75 86 74 104 86 118 C98 132 116 143 140 151"
            />
            <path
              className="studio-atmosphere__motion-trace"
              d="M48 146 C68 121 72 96 66 74 C61 55 68 36 85 26 C102 16 120 25 123 41 C126 56 114 68 99 76 C85 84 84 102 96 116 C108 130 126 141 150 149"
            />
            <path
              className="studio-atmosphere__motion-axis"
              d="M86 26 C80 55 80 86 96 116 C108 132 128 143 150 149"
            />
            <path className="studio-atmosphere__motion-segment" d="M85 26 L66 74 L96 116" />
            <circle className="studio-atmosphere__motion-joint" cx="85" cy="26" r="3" />
            <circle
              className="studio-atmosphere__motion-joint studio-atmosphere__motion-joint--focus"
              cx="66"
              cy="74"
              r="3.5"
            />
            <circle className="studio-atmosphere__motion-joint" cx="96" cy="116" r="3" />
            <circle className="studio-atmosphere__motion-joint" cx="150" cy="149" r="3" />
            <circle className="studio-atmosphere__motion-reticle" cx="66" cy="74" r="11" />
          </svg>
        </div>

        <svg
          className="studio-atmosphere__link"
          viewBox="0 0 160 40"
          fill="none"
          aria-hidden="true"
        >
          <path d="M8 20 H116" />
          <path d="M108 12 l18 8 l-18 8" />
        </svg>

        {quiet ? null : (
          <>
            <div className="studio-atmosphere__bay-status" aria-hidden="true">
              <span>Coach bay</span>
              <span>SO-101</span>
              <span className="is-live">When connected</span>
            </div>

            <p className="studio-atmosphere__caption" aria-hidden="true">
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
