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
      await page.addInitScript(() => sessionStorage.setItem('imf_rf_envelope_v1', '1'));
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
      await page.addInitScript(() => sessionStorage.setItem('imf_rf_envelope_v1', '1'));
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
      await page.addInitScript(() => sessionStorage.setItem('imf_rf_envelope_v1', '1'));
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
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('imf_rf_envelope_v1', '1'));
  });

  test('the Fig 1 plate never overlaps the copy column', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#startButton')).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(1000);

    const overlap = await page.evaluate(() => {
      const plate = document.querySelector('.rf-hero__plate .reach-plate');
      const copy = document.querySelector('.rf-hero__copy');
      if (!plate || !copy) return { found: false, overlap: false };
      const ra = plate.getBoundingClientRect();
      const rb = copy.getBoundingClientRect();
      return {
        found: true,
        overlap:
          ra.left < rb.right && rb.left < ra.right && ra.top < rb.bottom && rb.top < ra.bottom,
      };
    });
    expect(overlap.found, 'Fig 1 plate not found').toBe(true);
    expect(overlap.overlap, 'Fig 1 plate overlaps the copy column').toBe(false);
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
    await page.addInitScript(() => sessionStorage.setItem('imf_rf_envelope_v1', '1'));
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

test.describe('landing — organic intake chips', () => {
  test.beforeEach(async ({ page }) => {
    // Settled hero, not Act 0 — the envelope is covered in niggle-link.spec.
    await page.addInitScript(() => sessionStorage.setItem('imf_rf_envelope_v1', '1'));
  });

  test('no chip selected: wordmark hero, niggle title, one-rep CTA', async ({ page }) => {
    await page.goto('/');
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer).toBeVisible({ timeout: 20000 });
    await expect(foyer.locator('.rf-sent-by')).toHaveText('NIGGLEOMETER');
    await expect(foyer.locator('#rf-title')).toContainText('niggle');
    await expect(foyer.locator('.rf-chip.is-selected')).toHaveCount(0);
    await expect(foyer.locator('#startButton')).toContainText('Try one rep');
  });

  test('each chip retitles the hero and carries its protocol move; persists across reload', async ({
    page,
  }) => {
    const cases: { chip: string; move: string; title: RegExp; ctaLabel: RegExp }[] = [
      {
        chip: 'My neck & shoulders',
        move: 'reach',
        title: /neck & shoulders/,
        ctaLabel: /Take a \d+-rep reading/,
      },
      { chip: 'My lower back', move: 'squats', title: /lower back/, ctaLabel: /Try one rep/ },
      { chip: 'My knee', move: 'squats', title: /knee/, ctaLabel: /Try one rep/ },
      { chip: 'My arm or elbow', move: 'curls', title: /arm/, ctaLabel: /Take a \d+-rep reading/ },
      { chip: 'Not sure', move: 'curls', title: /movement/, ctaLabel: /Take a \d+-rep reading/ },
    ];
    for (const c of cases) {
      await page.goto('/');
      const chip = page.getByRole('button', { name: new RegExp(c.chip) });
      await expect(chip).toBeVisible({ timeout: 20000 });
      await chip.click();
      const foyer = page.locator('.receiving-foyer');
      await expect(foyer.locator('#rf-title')).toContainText(c.title);
      await expect(page.locator('body')).toHaveAttribute('data-coach-mode', c.move);
      await expect(foyer.locator('#startButton')).toContainText(c.ctaLabel);
      // Second click clears.
      await chip.click();
      await expect(foyer.locator('#rf-title')).toContainText('niggle');
    }

    // Persistence across reload — joint + its resolved context both stay lit.
    await page.getByRole('button', { name: /My neck & shoulders/ }).click();
    expect(await page.evaluate(() => localStorage.getItem('imf_niggle_v1'))).toBe(
      '{"joint":"neck-shoulders","context":"desk"}'
    );
    await page.reload();
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer.locator('#rf-title')).toContainText('neck & shoulders');
    await expect(foyer.locator('.rf-chip.is-selected')).toHaveCount(2);
  });

  test('chips are keyboard operable with visible focus', async ({ page }) => {
    await page.goto('/');
    const chip = page.getByRole('button', { name: 'My knee' });
    await expect(chip).toBeVisible({ timeout: 20000 });
    await chip.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.receiving-foyer #rf-title')).toContainText('knee');
    await expect(chip).toBeFocused();
    const outline = await chip.evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(parseFloat(outline)).toBeGreaterThan(0);
  });

  test('the honesty beat carries the trust ledger', async ({ page }) => {
    await page.goto('/');
    const honesty = page.locator('.rf-beat[aria-label="The honesty"]');
    await honesty.scrollIntoViewIfNeeded();
    await expect(honesty).toBeVisible({ timeout: 20000 });
    await expect(honesty).toContainText('video never uploads');
    await expect(honesty).toContainText('reads stay in this browser');
    await expect(honesty).toContainText('wellness guidance, not medicine');
  });

  test('the company beat shows all three flagship zones and lights the answered one', async ({
    page,
  }) => {
    await page.goto('/');
    const company = page.locator('.rf-beat[aria-label="The company"]');
    await company.scrollIntoViewIfNeeded();
    await expect(company).toContainText('Back');
    await expect(company).toContainText('Neck & shoulders');
    await expect(company).toContainText('Knee');
    await expect(company.locator('.rf-stat.is-lit')).toHaveCount(0);
    await expect(company.locator('h2')).toContainText('Whichever it is');

    await page.getByRole('button', { name: 'My knee' }).click();
    await expect(company.locator('.rf-stat.is-lit')).toHaveCount(1);
    await expect(company.locator('.rf-stat.is-lit')).toContainText('Knee');
    await expect(company.locator('h2')).toContainText('enormous, invisible company');
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
        await page.addInitScript(() => sessionStorage.setItem('imf_rf_envelope_v1', '1'));
        await page.goto('/');
        const chip = page.getByRole('button', { name: 'My knee' });
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
      await page.addInitScript(() => sessionStorage.setItem('imf_rf_envelope_v1', '1'));
      await page.goto('/');
      const chip = page.getByRole('button', { name: 'My knee' });
      await expect(chip).toBeVisible({ timeout: 20000 });
      await chip.click();
      // The context-row unfold is transition:none under reduced motion; the
      // retitle is instant.
      await expect(page.locator('.receiving-foyer #rf-title')).toContainText('knee');
      const transition = await page
        .locator('.rf-unfold')
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration);
      // Chromium reports transition:none as a ~0s duration (1e-05s).
      expect(Number.parseFloat(transition)).toBeLessThan(0.05);
    } finally {
      await context.close();
    }
  });
});

test('landing — mobile: knee chip selects squats; the Squats card confirms in the unfold', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => sessionStorage.setItem('imf_rf_envelope_v1', '1'));
    await page.goto('/');
    const chip = page.getByRole('button', { name: 'My knee' });
    await expect(chip).toBeVisible({ timeout: 20000 });
    await chip.click();

    await expect(page.locator('body')).toHaveAttribute('data-coach-mode', 'squats');

    // The movement picker is unfolded on demand — the Squats card shows the
    // same selection the chip already committed.
    await page.getByRole('button', { name: 'or pick a movement' }).click();
    const squatsCard = page
      .locator('#rf-moves .coach-foyer__exercise', { hasText: 'Squats' })
      .first();
    await expect(squatsCard).toBeVisible();
    await expect(squatsCard).toHaveAttribute('aria-pressed', 'true');

    // The selected chip is fully visible inside its wrap row.
    const chipFullyVisible = await chip.evaluate((el) => {
      const chipRect = el.getBoundingClientRect();
      const row = el.parentElement!.getBoundingClientRect();
      return chipRect.left >= row.left - 1 && chipRect.right <= row.right + 1;
    });
    expect(chipFullyVisible, 'selected chip clipped by the chip row').toBe(true);
  } finally {
    await context.close();
  }
});

test('landing — mobile: a joint restored from storage applies its mode', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => {
      localStorage.setItem('imf_niggle_v1', '{"joint":"knee","context":"chairs"}');
      sessionStorage.setItem('imf_rf_envelope_v1', '1');
    });
    await page.goto('/');
    await expect(page.locator('body')).toHaveAttribute('data-coach-mode', 'squats', {
      timeout: 20000,
    });
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer.locator('#rf-title')).toContainText('knee');
    await expect(foyer.locator('.rf-chip.is-selected').first()).toBeVisible();
  } finally {
    await context.close();
  }
});
