/**
 * Gate for development-only debug surfaces.
 *
 * /debug-wallet, /debug-mobile and /verification-test live inside the (shell)
 * route group, so they ship with the same providers and layout as the day-0
 * foyer and were reachable in production by URL. /debug-mobile additionally
 * renders a purple panel in a product whose palette has no purple.
 *
 * Set NEXT_PUBLIC_ENABLE_DEBUG_PAGES=1 to keep them reachable on a deployed
 * preview build.
 *
 * How the gate works, and why it is a layout rather than an in-page call:
 * these pages are `'use client'`, so a `notFound()` inside the component is a
 * client-side call — Next prerenders the shell to static HTML and serves it
 * with a 200, and the guard never runs. A server layout runs during
 * prerendering, so `notFound()` there replaces the body with the not-found
 * page. The `dynamic = 'force-dynamic'` export is what forces the layout to be
 * evaluated per request instead of baked at build time.
 *
 * KNOWN PLATFORM QUIRK: in this app (Next 16.2, `next start`) the not-found
 * body is served with HTTP 200, not 404 — verified by calling `notFound()`
 * unconditionally, which also returned 200. So the guarantee here is "no debug
 * markup is served in production", not "the status code is 404". Nothing is
 * indexed or linked (they are absent from sitemap.xml), so the practical
 * exposure is closed either way.
 */

export function isDebugPageEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEBUG_PAGES === '1'
  );
}
