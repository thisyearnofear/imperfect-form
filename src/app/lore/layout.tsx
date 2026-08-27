import type { Metadata } from 'next';
import { Fraunces } from 'next/font/google';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://imperfectform.fun';

/**
 * Heritage display serif — scoped to the /lore exhibit only.
 *
 * The Cræft Prize reveres the William Morris / Kelmscott Press union of beauty
 * and utility. The exhibit identity (this page) leans into a crafted,
 * Victorian-engineering register: a characterful display serif for headings,
 * Manrope for readable body, and Press Start 2P reserved for the arcade
 * "INSERT COIN" punctuation (the seaside-strength-tester beat). This font
 * never touches the day-0 web door (studio chassis) — it is an exhibit
 * surface treatment, not a product-wide change. See docs/CRAFFT_PRIZE.md.
 */
const heritage = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  preload: false,
  variable: '--font-heritage',
});

export const metadata: Metadata = {
  title: 'Lore — provenance, trust, and the robot',
  description:
    'Britain invented the AI form-check in 1897. Eugen Sandow graded photographs by post; we finished the loop with a robot arm. The provenance behind Imperfect Form — why on-device pose, why a robot, why the lineage matters.',
  openGraph: {
    title: 'Lore — Britain invented the form-check in 1897',
    description:
      'Eugen Sandow graded photographs by post in 1897. We finished the loop — with a robot arm that demonstrates the correction. The provenance behind Imperfect Form.',
    url: `${SITE_URL}/lore`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lore — Britain invented the form-check in 1897',
    description: 'We finished it — with a robot. The provenance behind Imperfect Form.',
  },
};

export default function LoreLayout({ children }: { children: React.ReactNode }) {
  // display:contents so the wrapper never affects layout, but the --font-heritage
  // CSS variable inherits into the .crafft-exhibit subtree.
  return (
    <div className={heritage.variable} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}
