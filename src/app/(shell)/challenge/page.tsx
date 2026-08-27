'use client';

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Camera, LockKeyhole, Move, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { BRAND } from '@/lib/brandPositioning';
import {
  decodeMovementChallenge,
  encodeMovementChallenge,
  MOVEMENT_CHALLENGE_PARAM,
} from '@/lib/movementChallenge';
import { trackMovementChallengeEvent } from '@/lib/challengeAnalytics';
import { usePlatform } from '@/contexts/PlatformContext';

function ChallengeContent() {
  const searchParams = useSearchParams();
  const { user } = usePlatform();
  const challenge = useMemo(
    () => decodeMovementChallenge(searchParams.get(MOVEMENT_CHALLENGE_PARAM)),
    [searchParams]
  );

  // Fire the opened event exactly once per view. Without the guard, a late-
  // loading fid re-runs the effect and double-counts the funnel step.
  const openedRef = useRef(false);
  useEffect(() => {
    if (!challenge || openedRef.current) return;
    openedRef.current = true;
    trackMovementChallengeEvent('assessment_challenge_opened', user?.fid, {
      protocolId: challenge.protocolId,
      mode: challenge.mode,
      confidence: challenge.confidence,
      challengeId: challenge.challengeId,
      source: 'incoming-challenge',
    });
  }, [challenge, user?.fid]);

  if (!challenge) {
    return (
      <main className="min-h-screen bg-[#061013] px-5 py-10 text-[#effcf9]">
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#83e8d5]">
            {BRAND.name}
          </p>
          <h1 className="text-2xl font-bold">This movement challenge is no longer available.</h1>
          <p className="text-sm leading-6 text-[#a9c7c2]">
            The link may be incomplete or from an older protocol. You can still make a private
            baseline from the camera.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#fcb131] px-4 py-3 text-sm font-bold text-[#071517]"
          >
            Try camera coaching <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </main>
    );
  }

  const startUrl = `/?${MOVEMENT_CHALLENGE_PARAM}=${encodeMovementChallenge(challenge)}`;

  return (
    <main className="min-h-screen bg-[#061013] px-5 py-8 text-[#effcf9] sm:py-12">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-5">
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#83e8d5]">
            {BRAND.name} · Take the same test
          </p>
          <h1 className="text-3xl font-bold leading-tight">Someone sent you a movement line.</h1>
          <p className="text-base leading-7 text-[#cfe7e1]">{challenge.headline}</p>
        </header>

        <section className="grid gap-4 rounded-md border border-[#75dfcd]/25 bg-[#07181a]/80 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#75dfcd] text-[#071917]">
              <Move size={17} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#83e8d5]">
                The protocol
              </p>
              <h2 className="mt-1 text-base font-bold capitalize">{challenge.mode} baseline</h2>
              <p className="mt-1 text-sm leading-6 text-[#a9c7c2]">
                Five controlled reps. Your camera reads the movement on your device and gives you
                your own result.
              </p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#d19a32]">
              Your next focus
            </p>
            <p className="mt-1 text-sm leading-6 text-[#dff7f1]">{challenge.nextFocus}</p>
          </div>
        </section>

        <div className="grid gap-2 text-sm text-[#a9c7c2]">
          <p className="inline-flex items-center gap-2">
            <LockKeyhole size={15} className="text-[#83e8d5]" aria-hidden="true" /> No wallet or
            account required.
          </p>
          <p className="inline-flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#83e8d5]" aria-hidden="true" /> No raw camera
            image or video is shared.
          </p>
          <p className="inline-flex items-center gap-2">
            <Camera size={15} className="text-[#83e8d5]" aria-hidden="true" /> Pose processing stays
            in your browser.
          </p>
        </div>

        <Link
          href={startUrl}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#fcb131] px-5 py-3 text-sm font-bold text-[#071517] transition hover:bg-[#ffd16a] focus:outline-none focus:ring-2 focus:ring-[#75dfcd] focus:ring-offset-2 focus:ring-offset-[#061013]"
        >
          <Camera size={17} aria-hidden="true" /> Take the same test{' '}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>

        <p className="text-center text-xs leading-5 text-[#718d88]">
          A challenge shares an aggregate movement prompt only. You will receive your own private
          card after the test.
        </p>
      </div>
    </main>
  );
}

export default function MovementChallengePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#061013]" aria-busy="true" />}>
      <ChallengeContent />
    </Suspense>
  );
}
