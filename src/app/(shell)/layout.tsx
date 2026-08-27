import ClientOnlyProviders from '@/components/providers/ClientOnlyProviders';

/**
 * App-shell layout — the wallet/boot provider stack lives here, scoped to the
 * interactive app routes (home, analytics, challenge, verification, debug),
 * NOT to the provenance/exhibit routes. Those (`/lore`, `/collaborate`) render
 * straight from the root layout so their content is server-rendered (crawlers
 * and "view source" see the real provenance, not the boot splash), while every
 * route that actually needs the wallet/platform/onboarding contexts still gets
 * the full provider tree and the fail-safe boot sequence. Route groups don't
 * affect URLs, so `/` still resolves to this group's `page.tsx`.
 */
export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientOnlyProviders>{children}</ClientOnlyProviders>;
}
