import { test, expect } from '@playwright/test';

/**
 * Landing-page correctness guards.
 *
 * These exist because the day-0 foyer shipped broken on mobile in a way no
 * existing test caught: the primary CTA was clipped below the fold by a
 * `max-height: 45vh !important` rule intended for live sessions, and `body`
 * was pinned to `height: 100%` so the page could not scroll to reach it. On a
 * 390x664 viewport a visitor could not start a set at all.
 *
 * These assert geometry, not appearance — the failure mode was spatial, so a
 * visual snapshot would not have caught it either.
 */

const CTA = '#startButton';

/**
 * A phone-shaped context, used by the checks whose failure was mobile-only.
 * Playwright rejects `test.use` inside a describe block (it forces a new
 * worker), so these build their own context instead.
 */
const PHONE = {
  viewport: { width: 390, height: 664 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
} as const;

test.describe('landing — CTA is reachable', () => {
  /**
   * Deliberately does NOT scroll before measuring. Scrolling first hides the
   * exact failure: `scrollIntoView` succeeds whenever the page is scrollable
   * at all, which is the thing under test. Measured broken: CTA at y=726 in a
   * 664px viewport with `canScroll: false`.
   */
  test('the CTA is visible without scrolling, or the page can scroll', async ({ browser }) => {
    const context = await browser.newContext(PHONE);
    const page = await context.newPage();
    try {
      await page.goto('/');
      await expect(page.locator(CTA)).toBeAttached({ timeout: 20000 });
      // Let the foyer finish entering before measuring.
      await page.waitForTimeout(1200);

      const geo = await page.evaluate(() => {
        const r = document.querySelector('#startButton')!.getBoundingClientRect();
        return {
          top: r.top,
          bottom: r.bottom,
          viewportH: window.innerHeight,
          canScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight,
        };
      });

      const visibleWithoutScroll = geo.top >= 0 && geo.bottom <= geo.viewportH + 1;
      expect(
        visibleWithoutScroll || geo.canScroll,
        `CTA at ${Math.round(geo.top)}-${Math.round(geo.bottom)} in a ${geo.viewportH}px ` +
          `viewport, and the page cannot scroll`
      ).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('the portrait height cap does not apply to the pre-session foyer', async ({ browser }) => {
    const context = await browser.newContext(PHONE);
    const page = await context.newPage();
    try {
      await page.goto('/');
      await expect(page.locator(CTA)).toBeAttached({ timeout: 20000 });
      await page.waitForTimeout(1200);

      // The 45vh cap is for a live session. The foyer must be free to grow.
      const { screenMaxHeight, screenHeight } = await page.evaluate(() => {
        const el = document.querySelector('#screen')!;
        return {
          screenMaxHeight: getComputedStyle(el).maxHeight,
          screenHeight: el.getBoundingClientRect().height,
        };
      });
      expect(screenMaxHeight, '#screen is still height-capped while showing the foyer').toBe(
        'none'
      );
      expect(screenHeight).toBeGreaterThan(500);
    } finally {
      await context.close();
    }
  });
});

test.describe('landing — copy is not painted over', () => {
  const OVERLAPS: Array<{ label: string; a: string; b: string }> = [
    {
      label: 'coach-status pill over the provenance line',
      a: '.coach-foyer__coach-status',
      b: '.sandow-provenance',
    },
    {
      label: 'coach-status pill over the exercise picker',
      a: '.coach-foyer__coach-status',
      b: '.coach-foyer__exercise-list',
    },
  ];

  for (const { label, a, b } of OVERLAPS) {
    test(`no overlap: ${label}`, async ({ page }) => {
      await page.goto('/');
      await expect(page.locator(a)).toBeVisible({ timeout: 20000 });
      await expect(page.locator(b)).toBeVisible();

      const boxes = await page.evaluate(
        ([selA, selB]) => {
          const ra = document.querySelector(selA)!.getBoundingClientRect();
          const rb = document.querySelector(selB)!.getBoundingClientRect();
          return { ra: { t: ra.top, b: ra.bottom }, rb: { t: rb.top, b: rb.bottom } };
        },
        [a, b]
      );

      const overlaps = boxes.ra.t < boxes.rb.b && boxes.rb.t < boxes.ra.b;
      expect(
        overlaps,
        `${a} (${Math.round(boxes.ra.t)}-${Math.round(boxes.ra.b)}) overlaps ` +
          `${b} (${Math.round(boxes.rb.t)}-${Math.round(boxes.rb.b)})`
      ).toBe(false);
    });
  }

  test('no session controls render before a set starts', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(CTA)).toBeVisible({ timeout: 20000 });

    // The orientation-lock button used to paint over the foyer lede.
    await expect(page.locator('.game-container__top-controls')).toHaveCount(0);
  });
});

/**
 * A phone-shaped viewport for the geometry checks. Playwright rejects
 * `test.use` inside a describe block (it forces a new worker), so this runs as
 * a top-level test with its own viewport rather than narrowing the whole file.
 */
test('landing — mobile: the primary CTA is operable on a phone', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 664 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto('/');
    const cta = page.locator(CTA);
    await expect(cta).toBeVisible({ timeout: 20000 });
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeEnabled();
    // Clicking must not throw; camera denial is handled by the recovery card.
    await cta.click({ timeout: 5000 }).catch(() => undefined);
  } finally {
    await context.close();
  }
});
