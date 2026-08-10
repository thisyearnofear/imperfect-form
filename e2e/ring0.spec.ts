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
    await expect(page.getByText('IMPERFECT FORM.FUN').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Make one rep better/i })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText(/Camera catches one thing/i)).toBeVisible();
    await expect(
      page.locator('.coach-foyer__coach-status').getByText(/Private camera coaching/i)
    ).toBeVisible();
    // The full camera → coach → SO-101 relationship is progressive detail,
    // not part of the first-visit visual stack.
    await expect(page.getByRole('img', { name: /Camera waiting for you/i })).toHaveCount(0);
    await expect(page.locator('#screen')).toHaveAttribute('data-register', 'studio');
    await expect(page.locator('#game-container')).toHaveAttribute('data-register', 'studio');
    await expect(page.locator('body')).toHaveAttribute('data-shell', 'studio');
    await expect(page.locator('body')).toHaveAttribute('data-coach-mode', 'curls');
    await expect(page.locator('body')).toHaveAttribute('data-coach-state', 'selected');
    await expect(page.locator('.studio-atmosphere__caption')).toContainText(/Path ready/i);
    await expect(page.locator('.studio-atmosphere__bay')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__stage-frame')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__rails')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__calibration')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__floor')).toHaveCount(1);
    await expect(page.locator('.studio-atmosphere__plinth')).toHaveCount(1);
    // Human input is represented as a restrained motion study, not a literal
    // stick figure, while the loop remains present in the first-visit collage.
    await expect(page.locator('.studio-atmosphere__motion-study')).toHaveCount(1);
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
    await expect(start).toHaveText(/Try one rep.*Curls/i);
    await expect(start).toHaveAccessibleName(/Try one rep of Curls with camera coaching/i);
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
    await expect(page.locator('#startButton')).toHaveText(/Try one rep.*Push-ups/i);
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
    await expect(page.getByText(/Pose detection runs on your device/i)).toHaveCount(0);

    await page.getByRole('button', { name: /More movements/i }).click();
    await expect(page.getByRole('button', { name: /Squats/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /How it works/i }).click();
    await expect(page.getByText(/Pose detection runs on your device/i)).toBeVisible();
    await expect(page.getByRole('img', { name: /Camera waiting for you/i })).toBeVisible();
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
    await expect(page.getByText(/Video stays on your device/i)).toBeVisible();
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
