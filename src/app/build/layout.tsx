import type { Metadata } from 'next';
import { Fraunces } from 'next/font/google';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://imperfectform.fun';

/**
 * Heritage display serif for the /build surface — same crafted Victorian
 * register as /lore. See lore/layout.tsx. Never touches the day-0 web door.
 */
const heritage = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  preload: false,
  variable: '--font-heritage',
});

export const metadata: Metadata = {
  title: 'The Build — how the Sandow Machine is made',
  description:
    'The build as a craft process: calibrating against Sandow’s 1897 tables, an open-hardware SO-101 arm assembled not mass-produced, a cabinet fabricated in a British workshop, and a pose model tuned on real human movement. Honest status: sim-first, upper-body only.',
  openGraph: {
    title: 'The Build — Imperfect Form as a craft process',
    description:
      'How the Sandow Machine is made: calibration, open-hardware assembly, British cabinet fabrication, and real-movement pose tuning — the build diary behind the form-check.',
    url: `${SITE_URL}/build`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Build — Imperfect Form as a craft process',
    description: 'The build diary behind the form-check. Open hardware, British fabrication, real movement.',
  },
};

export default function BuildLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={heritage.variable} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}
