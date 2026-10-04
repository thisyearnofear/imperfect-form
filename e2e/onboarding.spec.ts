import { test, expect } from '@playwright/test';

// The OnboardingModal was deleted on 2026-10-04. It had the best-written
// expectation-setting copy in the repo but never mounted — this file skipped it
// in every run, and e2e/ring0.spec.ts seeds `imf_seenOnboarding_v1 = '1'` to
// bypass a modal that never appeared.
//
// Onboarding now lives inline in the foyer, which is the better surface: the
// camera prompt fires directly from the START press and the "Try one rep"
// contract is honoured literally. The copy itself survives as ONBOARDING_STEPS
// in src/lib/brandPositioning.ts.
//
// The retired modal's five specs went with it — they encoded a flow no user
// could reach. The Tab Navigation coverage below never depended on it.

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Tab chrome is earned after the first coached session — not day-0.
      localStorage.setItem('imf_hasTrained', '1');
    });
  });

  test('tab navigation is keyboard accessible', async ({ page }) => {
    await page.goto('/');
    // Two tab bars are present once Tab chrome is earned (a desktop rail and
    // the mobile bottom nav), so scope to the first rather than letting strict
    // mode fail on the pair.
    const activeTab = page.locator('[aria-current="page"]').first();
    await expect(activeTab).toBeVisible({ timeout: 5000 });
    // The active tab is the Workout tab, not just any element carrying the attr.
    await expect(activeTab).toHaveAttribute('aria-label', /Workout/i);
  });

  test('switching tabs shows correct content', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Click Stats tab
    const statsTab = page.getByRole('button', { name: /stats/i });
    if (await statsTab.isVisible()) {
      await statsTab.click();
      // Dashboard content should appear
      await expect(page.getByText(/quest|xp|level/i).first()).toBeVisible({ timeout: 3000 });
    }
  });
});
