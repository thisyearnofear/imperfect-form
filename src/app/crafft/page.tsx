'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Camera, Cpu, Hammer, LockKeyhole, Mail, Wrench } from 'lucide-react';
import { CrafftCabinet } from '@/components/crafft';
import '@/styles/crafft-exhibit.css';

/**
 * The Cræft Prize exhibit — /crafft
 *
 * A scroll narrative that makes the Sandow lineage undeniable on first view.
 * This is the page a judge visits. It is NOT the day-0 web door (studio
 * foyer stays the mass-market front door at /). It is the submission's
 * visual language: Victorian seaside strength-tester cabinet aesthetic over
 * the real working instrument.
 *
 * Structure:
 *  1. Hero — the one-line pitch + the cabinet
 *  2. The lineage — Sandow 1897 → Royal Mail → spring-grip → us (the loop)
 *  3. The machine — the live app, embedded
 *  4. The craft — how it's made (arm, open hardware, on-device pose)
 *  5. The criteria — scored against the prize's six criteria
 *  6. Coda — the team + the ask
 */
export default function CrafftExhibitPage() {
  return (
    <main className="crafft-exhibit" data-register="crafft">
      {/* Top bar — minimal, brass-on-black */}
      <header className="crafft-exhibit__bar">
        <span className="crafft-exhibit__mark">THE SANDOW MACHINE</span>
        <span className="crafft-exhibit__bar-sub">Cræft Prize · Nation of Artisans 2026</span>
        <Link href="/" className="crafft-exhibit__bar-link">
          Try the machine <ArrowRight size={13} />
        </Link>
      </header>

      {/* 1. Hero */}
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
            robot arm that demonstrates the fix. A Victorian seaside strength-tester cabinet,
            housing a real on-device pose model and an SO-101 arm.
          </p>
          <div className="crafft-exhibit__hero-cabinet">
            <CrafftCabinet mode="curls" armLinked />
          </div>
        </div>
      </section>

      {/* 2. The lineage */}
      <section className="crafft-exhibit__section crafft-exhibit__lineage">
        <h2 className="crafft-exhibit__section-title">The lineage</h2>
        <p className="crafft-exhibit__section-intro">
          This is not a metaphor. It is documented history — the same feedback loop, 130 years
          apart.
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
              <h3>The Sandow Machine</h3>
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

      {/* 3. The machine */}
      <section className="crafft-exhibit__section crafft-exhibit__machine">
        <h2 className="crafft-exhibit__section-title">The machine</h2>
        <p className="crafft-exhibit__section-intro">
          Not a render. Not a concept video. The working instrument, live.
        </p>
        <div className="crafft-exhibit__machine-grid">
          <div className="crafft-exhibit__machine-card">
            <Camera size={22} />
            <h3>On-device pose</h3>
            <p>
              MoveNet runs in the browser. No video leaves the device — the privacy story is itself
              a craft value. Your body is not slop.
            </p>
          </div>
          <div className="crafft-exhibit__machine-card">
            <Cpu size={22} />
            <h3>SO-101 arm</h3>
            <p>
              Open-hardware. When form is off, the arm physically sweeps from your joint angle to
              the target — motor learning a screen can&apos;t give. Upper-body only, honestly
              scoped.
            </p>
          </div>
          <div className="crafft-exhibit__machine-card">
            <LockKeyhole size={22} />
            <h3>Artisanal intelligence</h3>
            <p>
              The arm learns from real coaching sessions, not from a generative model producing
              infinite variations. AI as craft extension, not slop.
            </p>
          </div>
        </div>
        <Link href="/" className="crafft-exhibit__cta">
          <Camera size={16} /> Try the live machine <ArrowRight size={16} />
        </Link>
      </section>

      {/* 4. The craft */}
      <section className="crafft-exhibit__section crafft-exhibit__craft">
        <h2 className="crafft-exhibit__section-title">The craft</h2>
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
              <p>The model runs in the browser. The arm runs on the edge. No slop pipeline.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. The criteria */}
      <section className="crafft-exhibit__section crafft-exhibit__criteria">
        <h2 className="crafft-exhibit__section-title">Against the criteria</h2>
        <ol className="crafft-exhibit__criteria-list">
          <li>
            <span className="crafft-exhibit__criterion">Ingenuity</span>
            <p>Closing a 130-year-old loop — photo → grade → correct — with a robot arm.</p>
          </li>
          <li>
            <span className="crafft-exhibit__criterion">Cræft depth</span>
            <p>Sandow lineage + arcade cabinet fabrication + open-hardware arm assembly.</p>
          </li>
          <li>
            <span className="crafft-exhibit__criterion">Beauty</span>
            <p>Victorian seaside cabinet aesthetic; brass-on-black; disciplined, not garish.</p>
          </li>
          <li>
            <span className="crafft-exhibit__criterion">Usefulness</span>
            <p>The app already works at imperfectform.fun; the cabinet is the exhibit.</p>
          </li>
          <li>
            <span className="crafft-exhibit__criterion">Integrity</span>
            <p>On-device pose (no slop); open hardware; honest upper-body scope.</p>
          </li>
          <li>
            <span className="crafft-exhibit__criterion">Future heritage</span>
            <p>Britain&apos;s next material culture of movement — AI form-coaching as craft.</p>
          </li>
        </ol>
      </section>

      {/* 6. Coda */}
      <section className="crafft-exhibit__section crafft-exhibit__coda">
        <p className="crafft-exhibit__coda-line">
          The spring-grip dumbbell corrected grip. The Sandow Machine demonstrates the whole arm.
        </p>
        <p className="crafft-exhibit__coda-sub">
          Submitted for the British Cræft Prize, 2026. Nation of Artisans.
        </p>
        <Link href="/" className="crafft-exhibit__cta crafft-exhibit__cta--ghost">
          Return to the machine <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}
