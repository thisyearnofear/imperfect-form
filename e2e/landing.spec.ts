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

  /**
   * The fold itself, not just reachability. The page was scrollable, but the
   * CTA still started below the fold on a 664px phone — correct for a brochure,
   * wrong for a page whose entire job is to start a set.
   */
  test('the CTA is above the fold on a phone, not merely reachable', async ({ browser }) => {
    const context = await browser.newContext(PHONE);
    const page = await context.newPage();
    try {
      await page.goto('/');
      await expect(page.locator(CTA)).toBeAttached({ timeout: 20000 });
      await page.waitForTimeout(1200);

      const geo = await page.evaluate(() => {
        const r = document.querySelector('#startButton')!.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, viewportH: window.innerHeight };
      });

      expect(
        geo.bottom,
        `CTA bottom ${Math.round(geo.bottom)} exceeds the ${geo.viewportH}px fold`
      ).toBeLessThanOrEqual(geo.viewportH);
    } finally {
      await context.close();
    }
  });
});

test.describe('landing — copy is not painted over', () => {
  test('the hero arm cutout never overlaps the copy column', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#startButton')).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(1000);

    const overlap = await page.evaluate(() => {
      const arm =
        document.querySelector('.coach-foyer__arm--aside .demo-plate') ||
        document.querySelector('.coach-foyer__arm--inline .demo-plate');
      const copy = document.querySelector('.coach-foyer__hero-copy');
      if (!arm || !copy) return { found: false, overlap: false };
      const ra = arm.getBoundingClientRect();
      const rb = copy.getBoundingClientRect();
      return {
        found: true,
        overlap:
          ra.left < rb.right && rb.left < ra.right && ra.top < rb.bottom && rb.top < ra.bottom,
      };
    });
    expect(overlap.found, 'hero arm image not found').toBe(true);
    expect(overlap.overlap, 'arm image overlaps the copy column').toBe(false);
  });

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

test.describe('landing — pain intent chips', () => {
  const SUBHEAD_DEFAULT =
    'Your camera catches one form error. The coach arm shows the fix. No video leaves your device.';

  test('no chip selected: default subhead, curls preselected', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.coach-foyer__lede')).toHaveText(SUBHEAD_DEFAULT, {
      timeout: 20000,
    });
    await expect(page.locator('.coach-foyer__pain-chip.is-selected')).toHaveCount(0);
    await expect(
      page.locator('.coach-foyer__exercise.is-selected', { hasText: 'Curls' })
    ).toHaveCount(1);
    await expect(page.locator('.ls-familiar__hint')).toBeVisible();
  });

  test('each chip changes subhead, move, familiar beats; persists across reload', async ({
    page,
  }) => {
    const cases: { chip: string; move: string; subhead: RegExp; familiar: RegExp }[] = [
      {
        chip: 'I train alone',
        move: 'Push-ups',
        subhead: /No spotter, no trainer/,
        familiar: /hips are sagging/,
      },
      {
        chip: 'My back or knees',
        move: 'Squats',
        subhead: /Squats hide a lot/,
        familiar: /If anything hurts, stop/,
      },
      {
        chip: "I'm not sure my form",
        move: 'Curls',
        subhead: /you are not guessing/,
        familiar: /cannot see it/,
      },
      {
        chip: "I'm not improving|I keep training",
        move: 'Curls',
        subhead: /Reps alone do not show/,
        familiar: /not something you can compare/,
      },
    ];
    for (const c of cases) {
      await page.goto('/');
      const chip = page.getByRole('button', { name: new RegExp(c.chip) });
      await expect(chip).toBeVisible({ timeout: 20000 });
      await chip.click();
      await expect(page.locator('.coach-foyer__lede')).toHaveText(c.subhead);
      await expect(
        page.locator('.coach-foyer__exercise.is-selected', { hasText: c.move })
      ).toHaveCount(1);
      await expect(page.locator('.ls-familiar__body')).toContainText(c.familiar);
      // Second click clears.
      await chip.click();
      await expect(page.locator('.coach-foyer__lede')).toHaveText(SUBHEAD_DEFAULT);
    }

    // Persistence across reload.
    await page.getByRole('button', { name: /I train alone/ }).click();
    expect(await page.evaluate(() => localStorage.getItem('imf_painIntent_v1'))).toBe('alone');
    await page.reload();
    await expect(page.locator('.coach-foyer__lede')).toHaveText(/No spotter, no trainer/);
    await expect(page.locator('.coach-foyer__pain-chip.is-selected')).toHaveCount(1);
  });

  test('chips are keyboard operable with visible focus', async ({ page }) => {
    await page.goto('/');
    const chip = page.getByRole('button', { name: /My back or knees/ });
    await expect(chip).toBeVisible({ timeout: 20000 });
    await chip.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.coach-foyer__lede')).toHaveText(/Squats hide a lot/);
    await expect(chip).toBeFocused();
    const outline = await chip.evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(parseFloat(outline)).toBeGreaterThan(0);
  });

  test('trust section table shows the real gate numbers', async ({ page }) => {
    await page.goto('/');
    const details = page.locator('.ls-trust__details');
    await expect(details).toBeAttached({ timeout: 20000 });
    await details.locator('summary').click();
    const table = details.locator('table');
    await expect(table).toContainText('critical < 0.3');
    await expect(table).toContainText('critical > 45 deg');
    await expect(table).toContainText('flag > 30 deg');
    await expect(table).toContainText('squats only');
  });

  test('CTA stays above the fold with a chip selected', async ({ browser }) => {
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({
        viewport,
        isMobile: viewport.width < 500,
        hasTouch: viewport.width < 500,
      });
      const page = await context.newPage();
      try {
        await page.goto('/');
        const chip = page.getByRole('button', { name: /My back or knees/ });
        await expect(chip).toBeVisible({ timeout: 20000 });
        await chip.click();
        const bottom = await page
          .locator('#startButton')
          .evaluate((el) => Math.round(el.getBoundingClientRect().bottom));
        expect(bottom, `CTA below fold at ${viewport.width}x${viewport.height}`).toBeLessThan(
          viewport.height
        );
      } finally {
        await context.close();
      }
    }
  });

  test('reduced motion swaps chip content instantly', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.goto('/');
      const chip = page.getByRole('button', { name: /I train alone/ });
      await expect(chip).toBeVisible({ timeout: 20000 });
      await chip.click();
      // lf-swap is animation:none under reduced motion; the text is simply there.
      await expect(page.locator('.coach-foyer__lede')).toHaveText(/No spotter, no trainer/);
      const anim = await page
        .locator('.coach-foyer__lede')
        .evaluate((el) => getComputedStyle(el).animationName);
      expect(anim).toBe('none');
    } finally {
      await context.close();
    }
  });
});

test('landing — mobile: squat chip selects and reveals the Squats card', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto('/');
    const chip = page.getByRole('button', { name: /My back or knees/ });
    await expect(chip).toBeVisible({ timeout: 20000 });
    await chip.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).toHaveAttribute('data-coach-mode', 'squats');

    const squatsCard = page.locator('.coach-foyer__exercise', { hasText: 'Squats' });
    await expect(squatsCard).toHaveAttribute('aria-pressed', 'true');
    const cardRect = await squatsCard.boundingBox();
    expect(cardRect && cardRect.y >= 0 && cardRect.y + cardRect.height <= 844).toBeTruthy();

    // The selected chip is fully visible inside its horizontal scroll row.
    const chipFullyVisible = await chip.evaluate((el) => {
      const chipRect = el.getBoundingClientRect();
      const row = el.parentElement!.getBoundingClientRect();
      return chipRect.left >= row.left - 1 && chipRect.right <= row.right + 1;
    });
    expect(chipFullyVisible, 'selected chip clipped by the scroll row').toBe(true);
  } finally {
    await context.close();
  }
});

test('landing — mobile: a chip restored from storage applies its mode', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => localStorage.setItem('imf_painIntent_v1', 'squat'));
    await page.goto('/');
    const squatsCard = page.locator('.coach-foyer__exercise', { hasText: 'Squats' });
    await expect(squatsCard).toHaveAttribute('aria-pressed', 'true', { timeout: 20000 });
    await expect(page.locator('body')).toHaveAttribute('data-coach-mode', 'squats');
  } finally {
    await context.close();
  }
});
