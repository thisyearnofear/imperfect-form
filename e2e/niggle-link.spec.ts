import { test, expect } from '@playwright/test';

/**
 * Shared niggle link — the acquisition doorway (docs/DESIGN_EVOLUTION.md,
 * docs/RECEIVING_EXPERIENCE.md).
 *
 * A valid `?niggle=` arrival lands on the receiving foyer ("Fig 1"): sent-by
 * greeting, engraved plate, joint-aware title and the fixed-rep reading CTA.
 * The "not your niggle? change it" door unfolds the standard intake chips.
 * An unknown joint must leave the day-0 CoachFoyer exactly as a fresh visit.
 *
 * The envelope (Act 0) is skipped via its same-session seen flag so these
 * tests assert DOM, not the ~1.2s intro choreography.
 */

test.describe('Shared niggle link', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('imf_seenOnboarding_v1', '1');
      localStorage.setItem('imf_skipWalletIntro', '1');
      // Skip Act 0 — the envelope only plays once per session anyway.
      sessionStorage.setItem('imf_rf_envelope_v1', '1');
    });
  });

  test('a valid link lands on the receiving hero', async ({ page }) => {
    await page.goto('/?niggle=neck-shoulders:desk&from=Udi');
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer).toBeVisible({ timeout: 20000 });
    await expect(foyer.getByText('Udi sent you this')).toBeVisible();
    await expect(foyer.locator('.reach-plate').first()).toBeVisible();
    await expect(foyer.locator('#rf-title')).toContainText('neck & shoulders');
    await expect(foyer.locator('#startButton')).toContainText('Take a 5-rep reading');
  });

  test('"not your niggle" unfolds the standard intake chips', async ({ page }) => {
    await page.goto('/?niggle=neck-shoulders:desk&from=Udi');
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer).toBeVisible({ timeout: 20000 });

    // Intake starts folded — the chips are inside the collapsed region.
    await page.getByRole('button', { name: 'not your niggle? change it' }).click();
    const chip = page.getByRole('button', { name: 'My neck & shoulders' });
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');

    // Picking a different joint retitles the hero and remaps the reading.
    await page.locator('.coach-foyer__pain-chip', { hasText: 'My knee' }).click();
    await expect(foyer.locator('#rf-title')).toContainText('knee');
  });

  test('an unknown joint leaves the day-0 foyer untouched', async ({ page }) => {
    await page.goto('/?niggle=bogus');
    await expect(page.locator('.coach-foyer')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.receiving-foyer')).toHaveCount(0);
    await expect(page.locator('#startButton')).toContainText('Take a reading');
    await expect(page.locator('.coach-foyer__pain-chip.is-selected')).toHaveCount(0);
  });
});
