'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Camera, Cpu, Hammer, LockKeyhole, Mail, Wrench } from 'lucide-react';
import { SandowCabinet } from '@/components/crafft';
import { useImmersive } from '@/hooks/useImmersive';
import '@/styles/crafft-exhibit.css';

/**
 * Lore — /lore
 *
 * Provenance, trust, and why the robot exists. Two modes:
 *  - Default (immersive off): a minimal visual scroll — one motif, one date,
 *    the arm. The lineage shown, not argued. ~50 words.
 *  - Immersive (opt-in): the full provenance document — timeline, trust
 *    model, craft. For users who want the whole story.
 *
 * Default is quiet and motif-led; immersive is the verbose version. The
 * toggle lives in the CoachFoyer "How it works" panel.
 */
export default function LorePage() {
  const { immersive, setImmersive } = useImmersive();

  return (
    <main className="crafft-exhibit" data-register="crafft">
      <header className="crafft-exhibit__bar">
        <span className="crafft-exhibit__mark">IMPERFECT FORM</span>
        <span className="crafft-exhibit__bar-sub">Lore · Provenance</span>
        <Link href="/" className="crafft-exhibit__bar-link">
          Try the machine <ArrowRight size={13} />
        </Link>
      </header>

      {immersive ? <ImmersiveLore /> : <MinimalLore />}

      {/* The toggle — quiet, at the foot. Let the user choose their depth. */}
      <section className="crafft-exhibit__section crafft-exhibit__coda">
        <label
          className="crafft-exhibit__toggle"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.72rem',
            color: 'var(--ce-brass, #e6a72c)',
            opacity: 0.8,
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={immersive}
            onChange={(e) => setImmersive(e.target.checked)}
            style={{ accentColor: 'var(--ce-gold, #fcb131)' }}
            aria-label="Immersive heritage mode"
          />
          {immersive ? 'Immersive on — show less' : 'Show the full story'}
        </label>
      </section>
    </main>
  );
}

/** Minimal — the default. Motif-led, ~50 words. */
function MinimalLore() {
  return (
    <>
      <section className="crafft-exhibit__hero">
        <div className="crafft-exhibit__hero-inner">
          <p className="crafft-exhibit__kicker">1897 — 2026</p>
          <h1 className="crafft-exhibit__headline">
            The form-check, <em>finished</em>.
          </h1>
          <p className="crafft-exhibit__lede">
            Sandow graded photographs by post. We grade with a camera, and a robot shows the fix.
          </p>
          <div className="crafft-exhibit__hero-cabinet">
            <SandowCabinet mode="curls" armLinked />
          </div>
        </div>
      </section>

      <section className="crafft-exhibit__section crafft-exhibit__coda">
        <p className="crafft-exhibit__coda-line">
          The spring-grip dumbbell corrected grip. The arm demonstrates the whole movement.
        </p>
        <Link href="/" className="crafft-exhibit__cta crafft-exhibit__cta--ghost">
          Try the machine <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}

/** Immersive — the full provenance document. Opt-in. */
function ImmersiveLore() {
  return (
    <>
      <section className="crafft-exhibit__hero">
        <div className="crafft-exhibit__hero-inner">
          <p className="crafft-exhibit__kicker">Britain, 1897 — 2026</p>
          <h1 className="crafft-exhibit__headline">
            Britain invented the <em>form-check</em> in 1897.
            <br />
            We finished it — with a robot.
          </h1>
          <p className="crafft-exhibit__lede">
            Eugen Sandow graded photographs by post and sold a spring-grip dumbbell under Royal
            Warrant. Same loop — photo in, graded against an ideal, correction out — closed with a
            robot arm that demonstrates the fix. This is the provenance behind Imperfect Form: why
            on-device pose, why a robot, and why the lineage matters.
          </p>
          <div className="crafft-exhibit__hero-cabinet">
            <SandowCabinet mode="curls" armLinked />
          </div>
        </div>
      </section>

      <section className="crafft-exhibit__section crafft-exhibit__lineage">
        <h2 className="crafft-exhibit__section-title">The lineage</h2>
        <p className="crafft-exhibit__section-intro">
          This is not a metaphor. It is documented history — the same feedback loop, 130 years
          apart. The provenance is why we trust the loop, not just the technology.
        </p>
        <ol className="crafft-exhibit__timeline">
          <li className="crafft-exhibit__era">
            <span className="crafft-exhibit__year">1897</span>
            <div className="crafft-exhibit__era-body">
              <h3>Sandow&apos;s Institute of Physical Culture</h3>
              <p>
                Men across Britain photographed themselves shirtless and{' '}
                <strong>mailed the photos to Sandow&apos;s London office</strong>. He graded their
                proportions against his &ldquo;ideal&rdquo; measurement tables and prescribed
                corrective exercises. The first global fitness brand, built on photo-based
                form-grading.
              </p>
            </div>
            <span className="crafft-exhibit__era-icon">
              <Mail size={20} />
            </span>
          </li>
          <li className="crafft-exhibit__era">
            <span className="crafft-exhibit__year">1899</span>
            <div className="crafft-exhibit__era-body">
              <h3>The spring-grip dumbbell</h3>
              <p>
                Stamped <em>&ldquo;Supplied to King Edward VII by Royal Letters Patent.&rdquo;</em>{' '}
                A mechanical form-corrector — the &ldquo;physical AI&rdquo; of its day. Sandow sold
                the device alongside the graded photographs: see the problem, sell the fix.
              </p>
            </div>
            <span className="crafft-exhibit__era-icon">
              <Wrench size={20} />
            </span>
          </li>
          <li className="crafft-exhibit__era">
            <span className="crafft-exhibit__year">2026</span>
            <div className="crafft-exhibit__era-body">
              <h3>Imperfect Form</h3>
              <p>
                The camera is the Royal Mail. The pose model is Sandow&apos;s grading tables. The
                SO-101 arm is the spring-grip dumbbell — but it <em>demonstrates</em> the correction
                instead of just resisting it. The loop, closed with a robot.
              </p>
            </div>
            <span className="crafft-exhibit__era-icon">
              <Cpu size={20} />
            </span>
          </li>
        </ol>
      </section>

      <section className="crafft-exhibit__section crafft-exhibit__machine">
        <h2 className="crafft-exhibit__section-title">Why we built it this way</h2>
        <p className="crafft-exhibit__section-intro">
          The lineage isn&apos;t decoration — it dictates the trust model. Three decisions that come
          directly from the Sandow loop.
        </p>
        <div className="crafft-exhibit__machine-grid">
          <div className="crafft-exhibit__machine-card">
            <Camera size={22} />
            <h3>On-device pose</h3>
            <p>
              Sandow&apos;s clients trusted him with their photographs because he was the authority.
              Today the authority is the model — and it runs in your browser. No video leaves the
              device.
            </p>
          </div>
          <div className="crafft-exhibit__machine-card">
            <Cpu size={22} />
            <h3>A robot that demonstrates</h3>
            <p>
              The spring-grip dumbbell resisted you. The SO-101 arm shows you the fix — motor
              learning a screen can&apos;t give. Upper-body only, honestly scoped.
            </p>
          </div>
          <div className="crafft-exhibit__machine-card">
            <LockKeyhole size={22} />
            <h3>Artisanal intelligence</h3>
            <p>
              The arm learns from real coaching sessions, not from a generative model producing
              infinite variations. The same loop Sandow ran, just faster and with a robot.
            </p>
          </div>
        </div>
        <Link href="/" className="crafft-exhibit__cta">
          <Camera size={16} /> Try the live machine <ArrowRight size={16} />
        </Link>
      </section>

      <section className="crafft-exhibit__section crafft-exhibit__craft">
        <h2 className="crafft-exhibit__section-title">How it&apos;s made</h2>
        <p className="crafft-exhibit__section-intro">
          The process is the craft, not just the object.
        </p>
        <div className="crafft-exhibit__craft-list">
          <div className="crafft-exhibit__craft-item">
            <Hammer size={18} />
            <div>
              <h4>Calibration against Sandow&apos;s tables</h4>
              <p>
                The arm&apos;s joint angles are mapped to Sandow&apos;s 1897 proportional ideals.
              </p>
            </div>
          </div>
          <div className="crafft-exhibit__craft-item">
            <Wrench size={18} />
            <div>
              <h4>Open-hardware arm, assembled not mass-produced</h4>
              <p>SO-101 is an open kit. The cabinet is fabricated in a British workshop.</p>
            </div>
          </div>
          <div className="crafft-exhibit__craft-item">
            <Cpu size={18} />
            <div>
              <h4>Pose model tuned on real human movement</h4>
              <p>
                Not synthetic data — real coaching sessions, real joint angles, real corrections.
              </p>
            </div>
          </div>
          <div className="crafft-exhibit__craft-item">
            <LockKeyhole size={18} />
            <div>
              <h4>On-device, no cloud</h4>
              <p>The model runs in the browser. The arm runs on the edge.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="crafft-exhibit__section crafft-exhibit__coda">
        <p className="crafft-exhibit__coda-line">
          The spring-grip dumbbell corrected grip. The Sandow Machine demonstrates the whole arm.
        </p>
        <p className="crafft-exhibit__coda-sub">
          The same loop Sandow ran in 1897 — closed with a robot.
        </p>
        <Link href="/" className="crafft-exhibit__cta crafft-exhibit__cta--ghost">
          Return to the machine <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}
