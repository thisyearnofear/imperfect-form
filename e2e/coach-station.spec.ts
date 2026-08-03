import { test, expect } from '@playwright/test';

/**
 * Fail-silent guard for the coach-station path (docs/ROADMAP.md Milestone 1):
 * when no station is listening (the default production config), the Ring 0
 * core loop must still work. The station is opt-in via NEXT_PUBLIC_COACH_STATION.
 */

test.describe('Coach station - fail-silent when offline', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('imf_seenOnboarding_v1', '1');
      localStorage.setItem('imf_skipWalletIntro', '1');
      localStorage.setItem('cameraPrimerSeen', 'true');
    });
  });

  test('START still works when no coach station is configured', async ({ page }) => {
    // Production builds leave NEXT_PUBLIC_COACH_STATION unset — coachStation.enabled
    // is false and every send* is a no-op. This test locks that invariant to Ring 0.
    await page.goto('/');
    const start = page.locator('#startButton');
    await expect(start).toBeEnabled({ timeout: 20000 });
    await start.click();

    await expect(
      page.getByText(/Initializing Engine|Loading camera|Starting camera|Coach AI/i).first()
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test('unreachable station WebSocket does not break START', async ({ page }) => {
    // Even if a station URL were baked in at build time, a dead socket must not
    // surface as a page error. Simulate the failure mode by blocking ws upgrades.
    await page.route('**/ws**', (route) => route.abort());
    await page.goto('/');

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const start = page.locator('#startButton');
    await expect(start).toBeEnabled({ timeout: 20000 });
    await start.click();

    await expect(
      page.getByText(/Initializing Engine|Loading camera|Starting camera|Coach AI/i).first()
    ).toBeVisible({
      timeout: 15000,
    });
    expect(pageErrors).toEqual([]);
  });
});
