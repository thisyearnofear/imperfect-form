import Link from 'next/link';
import { ArrowRight, Camera, Cpu, Hammer, LockKeyhole, Wrench, FlaskConical } from 'lucide-react';
import '@/styles/crafft-exhibit.css';

/**
 * /build — the build diary.
 *
 * The prize rewards build-as-craft and "future heritage"; this surface makes
 * the *making* legible — not a software demo, a workshop. The same four-level
 * craft process threaded through /lore, expanded with honest status and the
 * open kit / British fabrication lineage. Server-rendered (no boot gate) so
 * the documentation is visible to crawlers and "view source." See
 * docs/CRAFFT_PRIZE.md and CRAFFT_UX_AUDIT.md.
 *
 * Status is honest and matches docs/ROADMAP.md: sim-first, manual-stage gate,
 * upper-body only, learned policies (SmolVLA) only after scripted
 * demonstration is proven on hardware.
 */
export default function BuildPage() {
  return (
    <main className="crafft-exhibit" data-register="crafft">
      <header className="crafft-exhibit__bar">
        <span className="crafft-exhibit__mark">IMPERFECT FORM</span>
        <span className="crafft-exhibit__bar-sub">The Build · Workshop</span>
        <Link href="/lore" className="crafft-exhibit__bar-link">
          Why the machine? <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </header>

      <section className="crafft-exhibit__hero">
        <div className="crafft-exhibit__hero-inner">
          <p className="crafft-exhibit__kicker">The Build · a craft process</p>
          <h1 className="crafft-exhibit__headline">
            Not a software demo. <em>A workshop.</em>
          </h1>
          <p className="crafft-exhibit__lede">
            Sandow’s Institute of Physical Culture had apprentices, schools, and a Royal Warrant.
            The machine that finishes his loop is being built in the open — documented in the
            repository, assembled from an open-hardware kit, and tuned against real human movement.
            Where a piece is not built yet, this page says so.
          </p>
          <div className="crafft-exhibit__cta-row" style={{ marginTop: '1.5rem' }}>
            <a
              className="crafft-exhibit__cta"
              href="https://github.com/thisyearnofear/imperfect-form"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Hammer size={16} aria-hidden="true" /> See the build{' '}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <Link href="/" className="crafft-exhibit__cta crafft-exhibit__cta--ghost">
              Try the camera coach <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="crafft-exhibit__section crafft-exhibit__craft">
        <h2 className="crafft-exhibit__section-title">Four levels of making</h2>
        <p className="crafft-exhibit__section-intro">
          The craft is the process, not only the object. Each level extends a heritage practice with
          a contemporary tool.
        </p>
        <div className="crafft-exhibit__craft-list">
          <div className="crafft-exhibit__craft-item">
            <Wrench size={18} aria-hidden="true" />
            <div>
              <h4>Calibration against a real safety envelope</h4>
              <p>
                Arm motion is capped against a software interlock — workspace, sweep speed, and
                per-command step — before a joint is ever commanded. Trajectories that exceed it are
                stretched at execution rather than clamped at the wire, so the planned motion is the
                motion performed.
              </p>
            </div>
          </div>
          <div className="crafft-exhibit__craft-item">
            <Hammer size={18} aria-hidden="true" />
            <div>
              <h4>Open-hardware arm, assembled not mass-produced</h4>
              <p>
                The SO-101 is an open kit — sourced, assembled, and serviced in the workshop, not a
                sealed appliance. Repairability is a craft value.
              </p>
            </div>
          </div>
          <div className="crafft-exhibit__craft-item">
            <Camera size={18} aria-hidden="true" />
            <div>
              <h4>Cabinet fabrication — planned, not yet built</h4>
              <p>
                The intended housing is a Victorian seaside strength-tester: timber, brass plate,
                engraved gauge. This is a finalist-phase intention, not a shipped object — the grant
                that would fund it has not been awarded yet.
              </p>
            </div>
          </div>
          <div className="crafft-exhibit__craft-item">
            <Cpu size={18} aria-hidden="true" />
            <div>
              <h4>Movement data from real coaching sessions</h4>
              <p>
                Form is graded on-device from real joint angles, and each qualifying session becomes
                a comparable read for your next test. Turning those reads into robot training
                episodes is the next stage, not a shipped one.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="crafft-exhibit__section crafft-exhibit__machine">
        <h2 className="crafft-exhibit__section-title">Where the build stands</h2>
        <p className="crafft-exhibit__section-intro">
          Honesty is a craft value. This is the real status — not the pitch.
        </p>
        <div className="crafft-exhibit__machine-grid">
          <div className="crafft-exhibit__machine-card">
            <Camera size={22} aria-hidden="true" />
            <h3>Live · on-device pose</h3>
            <p>
              The camera-coaching loop ships today at imperfectform.fun — push-ups, squats, curls,
              pull-ups, jumps — with reps and per-rep form scoring, all on-device.
            </p>
          </div>
          <div className="crafft-exhibit__machine-card">
            <FlaskConical size={22} aria-hidden="true" />
            <h3>Simulation · the manual stage</h3>
            <p>
              Arm motion is developed and gated in simulation first, then on a manual stage, before
              any hardware autonomy. Live hardware is currently paused while the elbow servo is
              replaced; the simulation path is what runs today.
            </p>
          </div>
          <div className="crafft-exhibit__machine-card">
            <Hammer size={22} aria-hidden="true" />
            <h3>Hardware · upper-body only</h3>
            <p>
              A desk arm cannot credibly show squat depth. Flagship demonstrations stay upper-body —
              curls, push-ups, pull-ups — exactly as Sandow’s spring-grip corrected only grip.
              Honest scope over overclaim.
            </p>
          </div>
          <div className="crafft-exhibit__machine-card">
            <LockKeyhole size={22} aria-hidden="true" />
            <h3>Learned policies · after proof</h3>
            <p>
              SmolVLA fine-tuning starts only once scripted demonstration is proven on hardware and
              coached sessions can become LeRobot episodes. No generative slop in the loop.
            </p>
          </div>
        </div>
      </section>

      <section className="crafft-exhibit__section crafft-exhibit__coda">
        <p className="crafft-exhibit__coda-line">
          The same loop Sandow ran in 1897 — built in the open, in a workshop, on this island.
        </p>
        <p className="crafft-exhibit__coda-sub">Help make the coach</p>
        <div className="crafft-exhibit__cta-row">
          <Link href="/collaborate" className="crafft-exhibit__cta">
            <Hammer size={16} aria-hidden="true" /> Join the build{' '}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/lore" className="crafft-exhibit__cta crafft-exhibit__cta--ghost">
            The lineage <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
