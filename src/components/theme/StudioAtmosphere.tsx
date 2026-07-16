'use client';

import React, { useEffect, useRef } from 'react';
import { CoachTwinPeek } from '@/components/theme/CoachTwinPeek';
import '@/styles/studio-atmosphere.css';

/**
 * Day-0 / studio shell backdrop — coaching bay with real SO-101 presence.
 * Photos: TheRobotStudio/SO-ARM100 (Apache-2.0), alpha cut-outs in public/atmosphere/.
 * CSS 3D cursor-gaze + multi-chain blooms. Demo pulses via body[data-coach-pulse].
 */
export function StudioAtmosphere() {
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
        <div className="studio-atmosphere__floor" />
        <div className="studio-atmosphere__grain" />

        <div className="studio-atmosphere__stage-frame">
          <div className="studio-atmosphere__stage">
            <div className="studio-atmosphere__arm-glow" />
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
              <path
                d="M 30 140 C 50 70, 110 35, 170 40"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeDasharray="5 7"
                strokeLinecap="round"
              />
              <circle cx="170" cy="40" r="4.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="studio-atmosphere__network-row">
          <span className="is-celo">Celo</span>
          <span className="is-base">Base</span>
          <span className="is-avalanche">Avalanche</span>
          <span className="is-monad">Monad</span>
        </div>

        <p className="studio-atmosphere__caption">
          SO-101 Coach · path → physical AI that can show the fix
        </p>
      </div>

      <CoachTwinPeek />
    </div>
  );
}

export default StudioAtmosphere;
