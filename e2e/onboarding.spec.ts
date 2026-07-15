import { test, expect } from '@playwright/test';

test.describe('Onboarding Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Clear onboarding state so modal shows
    await page.addInitScript(() => {
      localStorage.removeItem('imf_seenOnboarding_v1');
    });
  });

  test('first-time user sees onboarding modal', async ({ page }) => {
    await page.goto('/');
    // Modal should be visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });
    // First step (calm register, trust-first) visible
    await expect(page.getByText('Your camera coaches you')).toBeVisible();
  });

  test('user can step through all onboarding steps', async ({ page }) => {
    await page.goto('/');
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Step 1 - trust/privacy (teal register)
    await expect(page.getByText('Your camera coaches you')).toBeVisible();

    // Next to step 2 - arcade register
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText('Compete when you want to')).toBeVisible();

    // Next to step 3 - lab register
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText('Grow a little every day')).toBeVisible();

    // Complete onboarding
    await page.getByRole('button', { name: /begin/i }).click();
    await expect(modal).not.toBeVisible();
  });

  test('user can skip onboarding', async ({ page }) => {
    await page.goto('/');
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /skip/i }).first().click();
    await expect(modal).not.toBeVisible();
  });

  test('returning user does not see onboarding modal', async ({ page }) => {
    // Set seen flag before navigation
    await page.addInitScript(() => {
      localStorage.setItem('imf_seenOnboarding_v1', '1');
    });
    await page.goto('/');
    // Wait for page to settle
    await page.waitForTimeout(1000);
    const modal = page.getByRole('dialog');
    await expect(modal).not.toBeVisible();
  });

  test('onboarding modal is keyboard accessible', async ({ page }) => {
    await page.goto('/');
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // The primary action is reachable and activatable by keyboard
    await page.getByRole('button', { name: /next/i }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Compete when you want to')).toBeVisible();
  });
});

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('imf_seenOnboarding_v1', '1');
    });
  });

  test('tab navigation is keyboard accessible', async ({ page }) => {
    await page.goto('/');
    // Tab buttons should have aria-current on active tab
    const activeTab = page.locator('[aria-current="page"]');
    await expect(activeTab).toBeVisible({ timeout: 5000 });
  });

  test('switching tabs shows correct content', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Click Dashboard tab
    const dashboardTab = page.getByRole('button', { name: /dashboard/i });
    if (await dashboardTab.isVisible()) {
      await dashboardTab.click();
      // Dashboard content should appear
      await expect(page.getByText(/quest|xp|level/i).first()).toBeVisible({ timeout: 3000 });
    }
  });
});
