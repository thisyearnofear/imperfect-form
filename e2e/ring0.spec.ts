import { test, expect } from '@playwright/test';

/**
 * Ring 0 guard - the product's most important invariant (docs/NORTH_STAR.md):
 * the core loop must be fully usable with NO wallet, NO sign-in, NOTHING.
 * If any of these fail, someone has re-gated the front door.
 *
 * Day-0 doorway is the receiving foyer ("Fig 1", studio register) — the same
 * surface for organic arrivals and `?niggle=` links (docs/RECEIVING_EXPERIENCE.md
 * "Organic variant"). One screen, one button, one permission: the foyer IS
 * the landing experience (no boot gate, no pre-screens); the browser's camera
 * prompt is the consent UX; the primer survives only as denial-recovery.
 */

// Skip Act 0 — the envelope only plays once per session and is covered by
// niggle-link.spec.ts; these tests assert the settled surface.
const SKIP_ENVELOPE = () => {
  sessionStorage.setItem('imf_rf_envelope_v1', '1');
};

test.describe('Ring 0 - wallet-free core loop', () => {
  // Dev-mode cold compiles on mobile UA bundles can be slow.
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Fresh guest, past the informational surfaces
      localStorage.clear();
      localStorage.setItem('imf_seenOnboarding_v1', '1'); // skip onboarding modal
      localStorage.setItem('imf_skipWalletIntro', '1'); // skip intro dialog
      sessionStorage.setItem('imf_rf_envelope_v1', '1'); // settled hero, not Act 0
    });
  });

  test('no interactive boot gate stands in front of the foyer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Your niggle/i })).toBeVisible({
      timeout: 20000,
    });
    // The old ceremony ("Enter the bay" / "Enter quietly") must never come back.
    await expect(page.getByRole('button', { name: /Enter the bay/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Enter quietly/i })).toHaveCount(0);
  });

  test('day-0 foyer is studio coaching doorway, not XP chrome', async ({ page }) => {
    await page.goto('/');
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer).toBeVisible({ timeout: 20000 });
    // Organic arrivals get the wordmark, not a sender line.
    await expect(foyer.locator('.rf-sent-by')).toHaveText('NIGGLEOMETER');
    await expect(page.getByRole('heading', { name: /Your niggle/i })).toBeVisible();
    await expect(foyer.getByText(/camera watches; nothing leaves your phone/i)).toBeVisible();
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
    // No niggle answered yet — the CTA honestly promises a single rep.
    await expect(start).toHaveText(/Try one rep/i);
    await expect(start).toHaveAccessibleName(/Try one rep/i);
    // Day-0 is coaching, not a wallet/tutorial wall.
    await expect(page.getByText(/Connect to sync/i)).toHaveCount(0);
    await expect(page.getByText(/on-chain at 5/i)).toHaveCount(0);
    // Framing guidance lives in the outro FAQ now, not a hero disclosure.
    await expect(page.getByText(/How should I set up the camera\?/i).first()).toBeAttached();
  });

  test('foyer leads with the niggle intake; the movement picker stays demoted', async ({
    page,
  }) => {
    await page.goto('/');
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled({ timeout: 20000 });

    // The intake is the hero: joint chips before any exercise card.
    const neck = page.getByRole('button', { name: 'My neck & shoulders' });
    await expect(neck).toBeVisible();
    await expect(neck).toHaveAttribute('aria-pressed', 'false');

    // All six movements live behind one quiet link — the unfold starts
    // collapsed (clipped, so assert the toggle state rather than visibility).
    const movesToggle = page.getByRole('button', { name: 'or pick a movement' });
    await expect(movesToggle).toHaveAttribute('aria-expanded', 'false');
    await movesToggle.click();
    await expect(movesToggle).toHaveAttribute('aria-expanded', 'true');

    const moves = page.locator('#rf-moves');
    const curls = moves.getByRole('button', { name: /Curls/i });
    const pushups = moves.getByRole('button', { name: /Push-ups/i });
    await expect(curls).toBeVisible();
    await expect(pushups).toBeVisible();
    await expect(curls).toHaveAttribute('aria-pressed', 'true');
    await expect(pushups).toHaveAttribute('aria-pressed', 'false');
    await pushups.click();
    await expect(page.locator('body')).toHaveAttribute('data-coach-mode', 'pushups');
    await expect(curls).toHaveAttribute('aria-pressed', 'false');
    await expect(pushups).toHaveAttribute('aria-pressed', 'true');
    await expect(start).toHaveText(/Try one rep/i);
    // The robot-native proof case is signposted at the point of choice:
    // one robot chip on the Curls card, never on the camera-only card.
    // (Squats carries its own "Mobility check" chip in the same unfold.)
    await expect(page.locator('.coach-foyer__robot-chip:not(.is-mobility)')).toHaveCount(1);
    await expect(curls.locator('.coach-foyer__robot-chip')).toBeVisible();
    await expect(pushups.locator('.coach-foyer__robot-chip')).toHaveCount(0);
    // Squats, pull-ups, jumps ride the same unfold — no second tier.
    const squats = moves.getByRole('button', { name: /Squats/i });
    await expect(squats).toBeVisible();
    await expect(squats.locator('.coach-foyer__robot-chip.is-mobility')).toHaveCount(1);

    // Let the unfold + ScrollTrigger refresh settle before measuring beats.
    await page.waitForTimeout(800);

    // The privacy promise is a hairline ledger line in the honesty beat.
    const honesty = page.locator('.rf-beat[aria-label="The honesty"]');
    await honesty.scrollIntoViewIfNeeded();
    await expect(honesty.getByText(/video never uploads/i)).toBeVisible();

    // How it works is compressed to three hairline rows on the coach-arm beat.
    const arm = page.locator('.rf-beat[aria-label="The coach arm"]');
    await arm.scrollIntoViewIfNeeded();
    await expect(arm.getByText(/Camera reads your form/i)).toBeVisible();
    await expect(arm.getByText(/Coach names one fix/i)).toBeVisible();
    await expect(arm.getByText(/The arm shows it/i)).toBeVisible();

    // Camera framing is a FAQ answer now — same guidance, no hero toggle.
    const frameQ = page.locator('.ls-faq__item', { hasText: 'How should I set up the camera?' });
    await frameQ.scrollIntoViewIfNeeded();
    await frameQ.locator('summary').click();
    await expect(frameQ.getByText(/1\.5 to 2\.5/)).toBeVisible();
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
    SKIP_ENVELOPE();
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

  test('Fig 1 — the living plate is visible on a 390x844 phone', async ({ browser }) => {
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
      const plate = page.locator('.rf-hero__plate .reach-plate');
      await expect(plate).toBeVisible({ timeout: 20000 });
      const box = await plate.boundingBox();
      expect(box && box.height > 80, 'hero plate collapsed on mobile').toBeTruthy();
      // The engraved caption keeps "Fig 1 · The Reach" regardless of joint.
      await expect(plate.locator('.rp-caption')).toHaveText('· Fig 1 · The Reach ·');
    } finally {
      await context.close();
    }
  });

  test('the Fig 2 coach arm plate rides the scroll story', async ({ page }) => {
    await page.addInitScript(FRESH_GUEST);
    await page.goto('/');
    const arm = page.locator('.rf-beat[aria-label="The coach arm"]');
    await arm.scrollIntoViewIfNeeded();
    await expect(arm).toBeVisible({ timeout: 20000 });
    await expect(arm.locator('.rf-arm-plate')).toBeVisible();
    await expect(arm.locator('.rf-arm-plate__img')).toHaveAttribute(
      'src',
      /so101-follower-cutout\.webp/
    );
    await expect(arm.locator('.rf-arm-plate')).toContainText('Fig 2 · The Coach Arm');
  });

  test('reduced motion rests the plate at the raised pose, pips filled', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.addInitScript(FRESH_GUEST);
      await page.goto('/');
      // Reduced motion: no envelope, the figure static at the raised pose.
      await expect(page.locator('.rf-envelope')).toHaveCount(0);
      const plate = page.locator('.rf-hero__plate .reach-plate');
      await expect(plate).toBeVisible({ timeout: 20000 });
      await expect(plate.locator('.rp-pip.is-lit')).toHaveCount(5);
    } finally {
      await context.close();
    }
  });

  test('the outro CTA mirrors the hero and starts the same flow', async ({ browser }) => {
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
      const finale = page.locator('.rf-final');
      await expect(finale).toBeAttached({ timeout: 20000 });
      await finale.scrollIntoViewIfNeeded();
      await expect(finale.locator('.reach-plate')).toBeVisible({ timeout: 20000 });
      await finale.locator('.rf-cta').click();
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

  test('every beat reveals on scroll — nothing stays hidden', async ({ page }) => {
    await page.addInitScript(FRESH_GUEST);
    await page.goto('/');
    const beats = page.locator('.rf-beat');
    await expect(beats).toHaveCount(6, { timeout: 20000 });
    for (let i = 0; i < 6; i++) {
      const beat = beats.nth(i);
      await beat.scrollIntoViewIfNeeded();
      await expect(beat).toBeVisible();
    }
  });

  test('beats are fully visible immediately with reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.addInitScript(FRESH_GUEST);
      await page.goto('/');
      const beats = page.locator('.rf-beat');
      await expect(beats).toHaveCount(6, { timeout: 20000 });
      // The scroll choreography no-ops under reduced motion: every beat sits
      // at full opacity before any scrolling.
      const opacities = await beats.evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).opacity)
      );
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
      sessionStorage.setItem('imf_rf_envelope_v1', '1');
    });
  });

  test('portrait phone is not gate-kept by the rotate modal before START', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#startButton')).toBeEnabled({ timeout: 20000 });
    await expect(page.getByText(/Rotate your phone|Turn your phone/i)).toHaveCount(0);
  });
});
