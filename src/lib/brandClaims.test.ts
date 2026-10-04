import { describe, expect, it } from 'vitest';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND } from './brandPositioning';
import { readRepoFile } from './docSyncHelpers';

/**
 * Claims and internal links must match what the code actually does.
 *
 * Two real defects motivated this file:
 *
 *  1. BRAND.flywheelLine told every user who finished a set that the session
 *     "is now a coaching episode for the arm". Nothing exported it and no
 *     policy learned from it.
 *  2. /build 404'd from three places because the route was deleted locally
 *     while lore, the session recap and the sitemap still linked to it.
 *
 * Both were invisible to tests because nothing compared shipped copy against
 * shipped capability. This is the doc-sync discipline applied to claims.
 */

const SRC = join(process.cwd(), 'src');
const APP = join(SRC, 'app');

/**
 * Every /-prefixed route the app actually serves.
 *
 * Route groups like (shell) are skipped as URL segments but their contents are
 * still walked, so `/` is found via src/app/(shell)/page.tsx.
 */
function actualRoutes(): Set<string> {
  const routes = new Set<string>();
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        // Route groups and parallel segments do not appear in the URL, but
        // their children are still part of the route tree.
        if (entry.startsWith('@')) continue;
        const isGroup = entry.startsWith('(') && entry.endsWith(')');
        walk(full, isGroup ? prefix : `${prefix}/${entry}`);
      } else if (/^page\.tsx$/.test(entry)) {
        routes.add(prefix === '' ? '/' : prefix);
      }
    }
  };
  walk(APP, '');
  return routes;
}

/** Strip a query string or hash; `/build?x=1` still needs `/build` to exist. */
function toRoutePath(href: string): string {
  const withoutQuery = href.split(/[?#]/)[0];
  return withoutQuery.replace(/\/$/, '') || '/';
}

/** Internal hrefs referenced by the user-facing exhibit and recap surfaces. */
const LINK_SURFACES = [
  'src/app/lore/page.tsx',
  'src/app/build/page.tsx',
  'src/components/game/SessionRecap.tsx',
  'src/app/sitemap.ts',
];

describe('internal links resolve', () => {
  const routes = actualRoutes();

  it('finds the app routes at all', () => {
    // A broken walker would make every assertion below vacuously pass.
    expect(routes.has('/')).toBe(true);
    expect(routes.has('/lore')).toBe(true);
    expect(routes.has('/build')).toBe(true);
    expect(routes.size).toBeGreaterThan(5);
  });

  for (const surface of LINK_SURFACES) {
    it(`${surface} links only to real routes`, () => {
      const source = readRepoFile(surface);
      // href="/x" and url: `${SITE}/x` forms.
      const hrefs = [
        ...source.matchAll(/href=["'](\/[^"'#?]*)["']/g),
        ...source.matchAll(/\$\{SITE\}(\/[^`'"\s]*)/g),
      ].map((match) => toRoutePath(match[1]));

      for (const href of hrefs) {
        expect(
          routes.has(href),
          `${surface} links to ${href}, which is not a route. Known: ${[...routes].sort().join(', ')}`
        ).toBe(true);
      }
    });
  }

  it('has a page behind every route the sitemap advertises', () => {
    const sitemap = readRepoFile('src/app/sitemap.ts');
    const advertised = [...sitemap.matchAll(/\$\{SITE\}(\/[^`'"\s]*)/g)].map((m) =>
      toRoutePath(m[1])
    );
    expect(advertised.length).toBeGreaterThan(0);
    for (const path of advertised) {
      expect(routes.has(path), `sitemap advertises ${path}, which has no page`).toBe(true);
    }
  });
});

describe('brand claims match capability', () => {
  it('does not claim a browser session trains the robot', () => {
    for (const [key, value] of Object.entries(BRAND)) {
      if (typeof value !== 'string') continue;
      expect(value, `BRAND.${key} overstates the training loop`).not.toMatch(
        /coaching episode for the arm|teaches the coach|now a coaching episode/i
      );
    }
  });

  it('keeps the on-device promise in the recap beat', () => {
    expect(BRAND.flywheelLine).toMatch(/on your device/i);
    expect(BRAND.flywheelTrust).toMatch(/nothing was uploaded/i);
  });
});

describe('exhibit claims match capability', () => {
  const lore = readRepoFile('src/app/lore/page.tsx');
  const build = readRepoFile('src/app/build/page.tsx');

  it('does not claim joint angles are mapped to Sandow tables', () => {
    // No such mapping exists anywhere in the codebase.
    for (const [name, source] of [
      ['lore', lore],
      ['build', build],
    ] as const) {
      expect(source, `${name} claims a Sandow-table mapping that does not exist`).not.toMatch(
        /mapped to Sandow|proportional ideals/i
      );
    }
  });

  it('does not claim the cabinet is already fabricated', () => {
    // The prize doc marks the cabinet TBD pending a finalist grant.
    for (const [name, source] of [
      ['lore', lore],
      ['build', build],
    ] as const) {
      expect(source, `${name} claims fabrication that has not happened`).not.toMatch(
        /fabricated in a British workshop/i
      );
    }
  });

  it('does not claim the training loop is already closed', () => {
    for (const [name, source] of [
      ['lore', lore],
      ['build', build],
    ] as const) {
      expect(source, `${name} claims the training loop is closed`).not.toMatch(
        /the loop is closed/i
      );
    }
  });

  it('does not market teleoperation as the hero capability', () => {
    // docs/NORTH_STAR.md explicitly rejects teleop as the story.
    for (const [name, source] of [
      ['lore', lore],
      ['build', build],
    ] as const) {
      expect(source, `${name} leads with teleoperation`).not.toMatch(/real-time teleoperation/i);
    }
  });

  it('does not assert a linked arm from a server-rendered page', () => {
    // lore/page.tsx is a server component and cannot read station state, so a
    // hardcoded armLinked would claim a live arm it cannot verify.
    expect(existsSync(join(APP, 'lore', 'page.tsx'))).toBe(true);
    expect(lore).not.toMatch(/armLinked/);
  });
});
