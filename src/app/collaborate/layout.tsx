import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://imperfectform.fun';

export const metadata: Metadata = {
  title: 'Help make the coach · Imperfect Form',
  description:
    'A collaboration invitation for craftspeople, fabricators, exhibit designers, and makers who want to help shape the physical SO-101 Coach Bay.',
  openGraph: {
    title: 'Help make the physical coach · Imperfect Form',
    description:
      'The user loop comes first. We are looking for collaborators to help make the SO-101 Coach Bay feel as good as the digital coach.',
    url: `${SITE_URL}/collaborate`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help make the physical coach · Imperfect Form',
    description: 'A collaboration invitation for the SO-101 Coach Bay.',
  },
};

export default function CollaborateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
