import { notFound } from 'next/navigation';
import { isDebugPageEnabled } from '@/lib/debugPages';

// Evaluated per request so a production build serves the not-found body instead
// of prerendered debug markup. See src/lib/debugPages.ts.
export const dynamic = 'force-dynamic';

export default function DebugPageLayout({ children }: { children: React.ReactNode }) {
  if (!isDebugPageEnabled()) notFound();
  return <>{children}</>;
}
