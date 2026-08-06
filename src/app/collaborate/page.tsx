import Link from 'next/link';
import { ArrowRight, Box, Code2, Hammer, Hand, Radio, Wrench } from 'lucide-react';
import '@/styles/collaborate.css';

const disciplines = [
  {
    icon: Hammer,
    title: 'Cabinet and furniture',
    body: 'Help shape the Coach Bay as a physical object people want to approach, use, and keep looking at.',
  },
  {
    icon: Wrench,
    title: 'Fabrication and mechanisms',
    body: 'Make the arm, housing, cable runs, access panels, and moving parts feel deliberate and serviceable.',
  },
  {
    icon: Hand,
    title: 'Materials and finish',
    body: 'Bring a point of view on timber, metal, touch points, lighting, and the tactility of the station.',
  },
  {
    icon: Box,
    title: 'Exhibits and storytelling',
    body: 'Help translate the camera → coach → arm loop into a memorable public installation.',
  },
];

export default function CollaboratePage() {
  return (
    <main className="collaborate-page">
      <header className="collaborate-page__bar">
        <Link href="/" className="collaborate-page__brand">
          IMPERFECT FORM
        </Link>
        <span className="collaborate-page__eyebrow">Workshop / collaboration</span>
        <Link href="/lore" className="collaborate-page__back">
          Why the machine? <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </header>

      <section className="collaborate-page__hero">
        <p className="collaborate-page__kicker">HELP MAKE THE COACH</p>
        <h1>Make the physical coach feel as good as the digital one.</h1>
        <p className="collaborate-page__lede">
          Imperfect Form starts with a simple user need: see one useful correction and know what to
          try next. We are building the next part of that loop as a physical instrument — an SO-101
          arm that can show the fix.
        </p>
        <div className="collaborate-page__actions">
          <a
            className="collaborate-page__button"
            href="https://x.com/ifdotfun"
            target="_blank"
            rel="noreferrer"
          >
            Start a conversation <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a
            className="collaborate-page__text-link"
            href="https://github.com/thisyearnofear/imperfect-form"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={15} aria-hidden="true" /> See the build
          </a>
        </div>
      </section>

      <section
        className="collaborate-page__section collaborate-page__proof"
        aria-labelledby="proof-title"
      >
        <div>
          <p className="collaborate-page__section-kicker">THE CREDIBLE PART</p>
          <h2 id="proof-title">The user comes first. The arm makes the promise tangible.</h2>
          <p>
            The browser reads movement privately, the coach names one adjustment, and the physical
            coach can demonstrate the target line. Cyberwave is the bridge we use to move between a
            safe simulation and the connected station — not the thing the user has to understand
            before trying a rep.
          </p>
        </div>
        <ol className="collaborate-page__loop" aria-label="Physical coaching loop">
          <li>
            <span>01</span>
            <strong>Camera sees</strong>
            <small>On-device form signal</small>
          </li>
          <li>
            <span>02</span>
            <strong>Coach explains</strong>
            <small>One useful correction</small>
          </li>
          <li>
            <span>03</span>
            <strong>SO-101 shows</strong>
            <small>Simulation or live station</small>
          </li>
        </ol>
        <p className="collaborate-page__note">
          The station is an enhancement, never a gate: camera coaching still works when the arm is
          offline.
        </p>
      </section>

      <section className="collaborate-page__section" aria-labelledby="disciplines-title">
        <p className="collaborate-page__section-kicker">WHAT WE NEED</p>
        <h2 id="disciplines-title">People who care how a machine meets a human.</h2>
        <div className="collaborate-page__discipline-grid">
          {disciplines.map(({ icon: Icon, title, body }) => (
            <article key={title} className="collaborate-page__discipline">
              <Icon size={20} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="collaborate-page__section collaborate-page__invite"
        aria-labelledby="invite-title"
      >
        <Radio size={22} aria-hidden="true" />
        <div>
          <p className="collaborate-page__section-kicker">LOW-FRICTION INVITATION</p>
          <h2 id="invite-title">Have a useful instinct? Show us.</h2>
          <p>
            Tell us what you make, what part of the Coach Bay interests you, and where to see your
            work. A portfolio, workshop, sketch, or simply a strong point of view is enough to
            start.
          </p>
          <p className="collaborate-page__contact-hint">
            The fastest route is a message to <strong>@ifdotfun</strong> on X, or an issue / pull
            request in the public build.
          </p>
          <div className="collaborate-page__actions">
            <a
              className="collaborate-page__button"
              href="https://x.com/ifdotfun"
              target="_blank"
              rel="noreferrer"
            >
              Message @ifdotfun <ArrowRight size={16} aria-hidden="true" />
            </a>
            <Link href="/" className="collaborate-page__text-link">
              Try one rep first <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="collaborate-page__footer">
        <span>Imperfect Form · one rep, one fix, one physical coach</span>
        <Link href="/">Return to the machine</Link>
      </footer>
    </main>
  );
}
