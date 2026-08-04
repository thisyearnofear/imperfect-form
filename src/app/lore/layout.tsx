import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://imperfectform.fun';

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
  return <>{children}</>;
}
