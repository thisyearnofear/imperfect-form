import { test, expect } from '@playwright/test';

/**
 * Ring 0 guard - the product's most important invariant (docs/NORTH_STAR.md):
 * the core loop must be fully usable with NO wallet, NO sign-in, NOTHING.
 * If any of these fail, someone has re-gated the front door.
 *
 * Day-0 doorway is CoachFoyer (studio). One screen, one button, one
 * permission: the foyer IS the landing experience (no boot gate, no
 * pre-screens); the browser's camera prompt is the consent UX; the primer
 * survives only as denial-recovery.
 */

test.describe('Ring 0 - wallet-free core loop', () => {
  // Dev-mode cold compiles on mobile UA bundles can be slow.
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Fresh guest, past the informational surfaces
      localStorage.clear();
      localStorage.setItem('imf_seenOnboarding_v1', '1'); // skip onboarding modal
      localStorage.setItem('imf_skipWalletIntro', '1'); // skip intro dialog
    });
  });

  test('no interactive boot gate stands in front of the foyer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Make one rep better/i })).toBeVisible({
      timeout: 20000,
    });
    // The old ceremony ("Enter the bay" / "Enter quietly") must never come back.
    await expect(page.getByRole('button', { name: /Enter the bay/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Enter quietly/i })).toHaveCount(0);
  });

  test('day-0 foyer is studio coaching doorway, not XP chrome', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.coach-foyer__brand')).toHaveText('Imperfect Form');
    await expect(page.getByRole('heading', { name: /Make one rep better/i })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText(/Your camera catches one form error/i)).toBeVisible();
    // The status pill, provenance and promise lines were removed from the hero.
    await expect(page.locator('.coach-foyer__coach-status')).toHaveCount(0);
    await expect(page.locator('.sandow-provenance')).toHaveCount(0);
    // The full camera → coach → SO-101 relationship is progressive detail,
    // not part of the first-visit visual stack.
    await expect(page.getByRole('img', { name: /Camera waiting for you/i })).toHaveCount(0);
    await expect(page.locator('#screen')).toHaveAttribute('data-register', 'studio');
    await expect(page.locator('#game-container')).toHaveAttribute('data-register', 'studio');
    await expect(page.locator('body')).toHaveAttribute('data-shell', 'studio');
    await expect(page.locator('body')).toHaveAttribute('data-coach-mode', 'curls');
    await expect(page.locator('body')).toHaveAttribute('data-coach-state', 'selected');
    await expect(page.locator('.studio-atmosphere__caption')).toContainText(
      /Path ready|Camera sees you/i
    );
    await expect(page.locator('.studio-atmosphere__bay')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__stage-frame')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__rails')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__calibration')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__floor')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__plinth')).toHaveCount(1);
    // Featured arm + left catalog (Elbow / Line / Depth) + floor loop.
    await expect(page.locator('.studio-atmosphere__strip')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__curl-plate')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__satellite--pushups')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__satellite--squats')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__floor-strip')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__loop')).toContainText(/Camera/i);
    await expect(page.locator('.studio-atmosphere__loop')).toContainText(/SO-101/i);
    await expect(page.locator('.studio-atmosphere__heritage')).toContainText(/1897/);
    await expect(page.locator('.studio-atmosphere__spectrum')).toHaveCount(0);
    await expect(page.locator('.studio-atmosphere__skeleton')).toHaveCount(0);
    await expect(page.locator('.game-wrapper')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    // Game-loop tabs stay earned — not the foyer
    await expect(page.getByRole('button', { name: /Switch to Stats/i })).toHaveCount(0);
    // Developer diagnostics must never become part of the doorway, even in a
    // dev server where the test suite runs.
    await expect(page.getByRole('button', { name: /Toggle Auth Debug/i })).toHaveCount(0);
    await expect(page.getByText(/^🔧 Debug$/)).toHaveCount(0);
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled();
    await expect(start).toHaveText(/Try one rep/i);
    await expect(start).toHaveAccessibleName(/Try one rep of Curls with camera coaching/i);
    // Day-0 is coaching, not a wallet/tutorial wall.
    await expect(page.getByText(/Connect to sync/i)).toHaveCount(0);
    await expect(page.getByText(/on-chain at 5/i)).toHaveCount(0);
    await expect(page.getByText(/1\.5–2\.5/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Set your frame/i })).toBeVisible();
  });

  test('foyer leads with robot-native coaching; depth is earned/demoted', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#startButton')).toBeEnabled({ timeout: 20000 });

    // Primary movements lead with the flagship robot-native path, plus a
    // familiar camera-coaching exercise.
    const curls = page.getByRole('button', { name: /Curls/i }).first();
    const pushups = page.getByRole('button', { name: /Push-ups/i }).first();
    await expect(curls).toBeVisible();
    await expect(pushups).toBeVisible();
    await expect(curls).toHaveAttribute('aria-pressed', 'true');
    await expect(pushups).toHaveAttribute('aria-pressed', 'false');
    await pushups.click();
    await expect(page.locator('body')).toHaveAttribute('data-coach-mode', 'pushups');
    await expect(curls).toHaveAttribute('aria-pressed', 'false');
    await expect(pushups).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#startButton')).toHaveText(/Try one rep/i);
    await expect(page.locator('#startButton')).toHaveAccessibleName(
      /Try one rep of Push-ups with camera coaching/i
    );
    // The robot-native proof case is signposted at the point of choice:
    // exactly one chip, on the Curls card, never on the camera-only card.
    await expect(page.locator('.coach-foyer__robot-chip')).toHaveCount(1);
    await expect(curls.locator('.coach-foyer__robot-chip')).toBeVisible();
    await expect(pushups.locator('.coach-foyer__robot-chip')).toHaveCount(0);

    // Lower-body and additional movements stay behind explicit, demoted toggles.
    await expect(page.getByRole('button', { name: /Squats/i })).toHaveCount(0);
    // The privacy line is stated plainly under the CTA, not behind a toggle.
    await expect(page.getByText(/Pose detection runs on your device/i).first()).toBeVisible();

    await page.getByRole('button', { name: /More movements/i }).click();
    await expect(page.getByRole('button', { name: /Squats/i }).first()).toBeVisible();

    // How it works is a landing section, not a hero disclosure.
    await page.locator('.ls-how').scrollIntoViewIfNeeded();
    await expect(page.getByText(/Camera reads your form/i)).toBeVisible();
    await expect(page.getByText(/Coach names one fix/i)).toBeVisible();
    await expect(page.getByText(/The arm shows it/i)).toBeVisible();

    await page.getByRole('button', { name: /Set your frame/i }).click();
    await expect(page.getByText(/1\.5–2\.5/)).toBeVisible();
  });

  test('first START asks the browser directly — denial gets the recovery card', async ({
    page,
  }) => {
    await page.goto('/');
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled({ timeout: 20000 });
    await start.click();

    // No separate pre-screen on a healthy path; denied permission (headless
    // default) surfaces the recovery card with the fix + privacy line.
    await expect(page.getByText('Camera is off')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/No video is recorded or uploaded/i)).toBeVisible();
    await expect(page.getByText('Before we start')).toHaveCount(0);
    await expect(page.locator('[data-testid="recovery-card"]')).toBeVisible();
  });

  test('recovery card "not now" backs out without starting', async ({ page }) => {
    await page.goto('/');
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled({ timeout: 20000 });
    await start.click();

    await expect(page.getByText('Camera is off')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: /not now/i }).click();

    await expect(page.getByText('Camera is off')).not.toBeVisible();
    // Still on the foyer, still ungated
    await expect(start).toBeEnabled();
  });

  test('returning trained guest lands on earned chrome, not a foyer flash', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('imf_hasTrained', '1');
    });
    await page.goto('/');

    // The earned shell paint decision is synchronous: tab chrome and the
    // earned body register are the FIRST thing rendered — no day-0 foyer flash.
    await expect(page.getByRole('button', { name: /Switch to Stats/i })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('body')).toHaveAttribute('data-shell', 'earned');
    // Accidental dashboard chrome must stay gone (intentional mix, not feature drawer).
    await expect(page.getByRole('button', { name: /Hide Features|Show Features/i })).toHaveCount(0);
    await expect(page.getByText(/Quick Actions/i)).toHaveCount(0);
    // (The foyer still exists — as the pre-start doorway inside the Workout
    // tab — it just isn't the naked day-0 surface.)
  });
});

test.describe('Ring 0 - landing hero', () => {
  test.setTimeout(90_000);

  const FRESH_GUEST = () => {
    localStorage.clear();
    localStorage.setItem('imf_seenOnboarding_v1', '1');
    localStorage.setItem('imf_skipWalletIntro', '1');
  };

  test('hero CTA is fully visible without scrolling at 1280x720', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    try {
      await page.addInitScript(FRESH_GUEST);
      await page.goto('/');
      const start = page.locator('#startButton');
      await expect(start).toBeVisible({ timeout: 20000 });
      const geo = await start.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, h: window.innerHeight };
      });
      expect(geo.top).toBeGreaterThanOrEqual(0);
      expect(geo.bottom).toBeLessThanOrEqual(geo.h + 1);
    } finally {
      await context.close();
    }
  });

  test('hero CTA is fully visible without scrolling at 390x844', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await page.addInitScript(FRESH_GUEST);
      await page.goto('/');
      const start = page.locator('#startButton');
      await expect(start).toBeVisible({ timeout: 20000 });
      const geo = await start.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, h: window.innerHeight };
      });
      expect(geo.top).toBeGreaterThanOrEqual(0);
      expect(geo.bottom).toBeLessThanOrEqual(geo.h + 1);
    } finally {
      await context.close();
    }
  });

  test('Plate I is visible on a 390x844 phone, under the fold-safe CTA', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await page.addInitScript(FRESH_GUEST);
      await page.goto('/');
      const plate = page.locator('.coach-foyer__arm--inline .demo-plate');
      await expect(plate).toBeVisible({ timeout: 20000 });
      const box = await plate.boundingBox();
      expect(box && box.height > 80, 'demo plate collapsed on mobile').toBeTruthy();
    } finally {
      await context.close();
    }
  });

  test('demo plate pauses when scrolled offscreen', async ({ page }) => {
    await page.addInitScript(FRESH_GUEST);
    await page.goto('/');
    const plate = page.locator('.demo-plate:visible').first();
    await expect(plate).toBeAttached({ timeout: 20000 });
    await expect(plate).toHaveAttribute('data-playing', 'true');
    await page.locator('.ls-final').scrollIntoViewIfNeeded();
    await expect(plate).toHaveAttribute('data-playing', 'false');
  });

  test('reduced motion renders the static final frame', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.addInitScript(FRESH_GUEST);
      await page.goto('/');
      const plate = page.locator('.demo-plate:visible').first();
      await expect(plate).toBeAttached({ timeout: 20000 });
      await expect(plate.locator('.demo-plate__stamp-text')).toBeAttached();
      const animName = await plate
        .locator('.demo-plate__stamp')
        .evaluate((el) => getComputedStyle(el).animationName);
      expect(animName).toBe('none');
    } finally {
      await context.close();
    }
  });

  test('sticky mini CTA appears on mobile and starts the same flow', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await page.addInitScript(FRESH_GUEST);
      await page.goto('/');
      const mini = page.locator('.coach-foyer__mini-cta');
      await expect(mini).toHaveAttribute('data-visible', 'false');
      // Land the viewport between the hero CTA and the final CTA.
      await page.locator('.ls-faq').evaluate((el) => el.scrollIntoView({ block: 'end' }));
      await expect(mini).toHaveAttribute('data-visible', 'true');
      await mini.locator('.coach-foyer__start').click();
      // Same side effect as the hero CTA: camera flow starts, denial recovery shows.
      await expect(page.getByText('Camera is off')).toBeVisible({ timeout: 8000 });
    } finally {
      await context.close();
    }
  });

  test('no horizontal overflow at 390px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await page.addInitScript(FRESH_GUEST);
      await page.goto('/');
      await expect(page.locator('#startButton')).toBeVisible({ timeout: 20000 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);
    } finally {
      await context.close();
    }
  });

  test('tagline words reach full opacity after scrolling through them', async ({ page }) => {
    await page.addInitScript(FRESH_GUEST);
    await page.goto('/');
    const tagline = page.locator('.ls-tagline');
    await expect(tagline).toBeAttached({ timeout: 20000 });
    await tagline.scrollIntoViewIfNeeded();
    // Scroll until the LAST word sits above the 70% trigger line, then let the
    // transitions land.
    await page.evaluate(() => {
      const words = document.querySelectorAll('.ls-tagline .ls-word');
      const last = words[words.length - 1];
      const top = last.getBoundingClientRect().top;
      window.scrollBy(0, Math.ceil(top - window.innerHeight * 0.6));
    });
    await page.waitForTimeout(800);
    const dimmed = await page.locator('.ls-tagline .ls-word:not(.is-on)').count();
    expect(dimmed, 'tagline words stayed at rest opacity after scrolling').toBe(0);
  });

  test('tagline renders each line once — no duplicated words', async ({ page }) => {
    await page.addInitScript(FRESH_GUEST);
    await page.goto('/');
    const lines = page.locator('.ls-tagline .ls-tagline__line');
    await expect(lines.first()).toHaveText('One rep. One fix.', { timeout: 20000 });
    await expect(lines.nth(1)).toHaveText('See the difference on the next rep.');
  });

  test('plate caption stays on one line at 390px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await page.addInitScript(FRESH_GUEST);
      await page.goto('/');
      const caption = page.locator('.coach-foyer__arm--inline .demo-plate__caption');
      await expect(caption).toBeVisible({ timeout: 20000 });
      const metrics = await caption.evaluate((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        return { contentHeight: r.height - pad, lineHeight: parseFloat(cs.lineHeight) };
      });
      expect(metrics.contentHeight).toBeLessThan(metrics.lineHeight * 1.5);
    } finally {
      await context.close();
    }
  });

  test('tagline is fully visible immediately with reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.addInitScript(FRESH_GUEST);
      await page.goto('/');
      const tagline = page.locator('.ls-tagline');
      await expect(tagline).toBeAttached({ timeout: 20000 });
      await tagline.scrollIntoViewIfNeeded();
      const opacities = await page
        .locator('.ls-tagline .ls-word')
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
      expect(opacities.length).toBeGreaterThan(0);
      for (const opacity of opacities) {
        expect(Number(opacity)).toBe(1);
      }
    } finally {
      await context.close();
    }
  });

  test('FAQ items open via keyboard', async ({ page }) => {
    await page.addInitScript(FRESH_GUEST);
    await page.goto('/');
    const first = page.locator('.ls-faq__item').first();
    await expect(first).toBeAttached({ timeout: 20000 });
    await first.scrollIntoViewIfNeeded();
    await first.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(first).toHaveJSProperty('open', true);
    await expect(first.locator('p')).toBeVisible();
  });

  test('skip link focuses the start button', async ({ page }) => {
    await page.addInitScript(FRESH_GUEST);
    await page.goto('/');
    const skip = page.locator('.coach-foyer__skip');
    await expect(skip).toBeAttached({ timeout: 20000 });
    await skip.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#startButton')).toBeFocused();
  });
});

test.describe('Ring 0 - mobile doorway', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only invariant');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('imf_seenOnboarding_v1', '1');
      localStorage.setItem('imf_skipWalletIntro', '1');
    });
  });

  test('portrait phone is not gate-kept by the rotate modal before START', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#startButton')).toBeEnabled({ timeout: 20000 });
    // Landscape guidance belongs inside a running session, not over the foyer.
    await expect(page.getByText('Rotate your phone')).toHaveCount(0);
  });
});
