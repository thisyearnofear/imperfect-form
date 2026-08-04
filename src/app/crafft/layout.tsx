import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://imperfectform.fun';

export const metadata: Metadata = {
  title: 'The Sandow Machine — Cræft Prize',
  description:
    'Britain invented the AI form-check in 1897. Eugen Sandow graded photographs by post; we finished the loop with a robot arm. A Victorian seaside strength-tester cabinet housing a real on-device pose model and an SO-101 arm.',
  openGraph: {
    title: 'The Sandow Machine — Cræft Prize',
    description:
      'Britain invented the AI form-check in 1897. We finished it — with a robot. A Victorian seaside cabinet housing on-device pose estimation and an SO-101 arm.',
    url: `${SITE_URL}/crafft`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Sandow Machine — Cræft Prize',
    description: 'Britain invented the AI form-check in 1897. We finished it — with a robot.',
  },
};

export default function CrafftLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
