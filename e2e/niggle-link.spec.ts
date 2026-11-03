import { test, expect } from '@playwright/test';

/**
 * Shared niggle link + the organic landing — the acquisition doorway and the
 * default front door (docs/DESIGN_EVOLUTION.md, docs/RECEIVING_EXPERIENCE.md
 * "Organic variant").
 *
 * A valid `?niggle=` arrival lands on the receiving foyer ("Fig 1"): sent-by
 * greeting, engraved plate, joint-aware title and the fixed-rep reading CTA.
 * The "not your niggle? change it" door unfolds the same plate-idiom intake
 * chips the organic hero shows inline. Organic arrivals (no link, or an
 * unknown joint) get the wordmark variant: NIGGLEOMETER in the envelope, the
 * intake chips in the hero, and an honest one-rep CTA.
 *
 * The envelope (Act 0) is skipped via its same-session seen flag in most
 * tests so they assert DOM, not the ~1.2s intro choreography; one test keeps
 * it to verify the organic wordmark.
 */

const SKIP_ENVELOPE = () => {
  localStorage.clear();
  localStorage.setItem('imf_seenOnboarding_v1', '1');
  localStorage.setItem('imf_skipWalletIntro', '1');
  // Skip Act 0 — the envelope only plays once per session anyway.
  sessionStorage.setItem('imf_rf_envelope_v1', '1');
};

test.describe('Shared niggle link', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(SKIP_ENVELOPE);
  });

  test('a valid link lands on the receiving hero — learning first, ask last', async ({ page }) => {
    await page.goto('/?niggle=neck-shoulders:desk&from=Udi');
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer).toBeVisible({ timeout: 20000 });
    await expect(foyer.getByText('Udi sent you this')).toBeVisible();
    await expect(foyer.locator('.reach-plate').first()).toBeVisible();
    // The gift, not the diagnosis: without &note= the context's empathy line
    // is quoted; the headline promises the thing a worried person wants.
    await expect(foyer.locator('.rf-gift')).toContainText("Heard it's been tight lately");
    await expect(foyer.locator('#rf-title')).toContainText('See if it’s actually getting better.');

    // Onboarding-first for link recipients: the hero teaches, it does not
    // ask — no CTA button in the hero, a scroll cue naming what is below,
    // and one quiet link that jumps to the reading in the outro.
    const hero = foyer.locator('.rf-hero');
    await expect(hero.locator('#startButton')).toHaveCount(0);
    await expect(hero.locator('.coach-foyer__start')).toHaveCount(0);
    await expect(foyer.getByText('the meter, explained')).toBeVisible();
    const skip = foyer.getByRole('link', { name: 'Skip to the reading' });
    await expect(skip).toBeVisible();
    await expect(skip).toHaveAttribute('href', '#rf-reading');

    // The CTA block is the finale: plate + reading CTA + change-it door.
    const finale = foyer.locator('#rf-reading');
    await finale.scrollIntoViewIfNeeded();
    await expect(finale.locator('.rf-plate')).toBeVisible();
    await expect(finale.locator('#startButton')).toContainText('Take a 5-rep reading');
    await expect(finale.getByRole('button', { name: 'not your niggle? change it' })).toBeVisible();
  });

  test('a &note= link quotes the sender’s own words', async ({ page }) => {
    await page.goto(
      '/?niggle=neck-shoulders:desk&from=Papa&note=sorry%20the%20trap%27s%20been%20tight'
    );
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer).toBeVisible({ timeout: 20000 });
    await expect(foyer.getByText('Papa sent you this')).toBeVisible();
    // The sender's note wins over the context giftLine.
    await expect(foyer.locator('.rf-gift')).toContainText("sorry the trap's been tight");
    await expect(foyer.locator('.rf-gift')).not.toContainText('Heard');
    await expect(foyer.locator('#rf-title')).toContainText('See if it’s actually getting better.');
  });

  test('"not your niggle" unfolds the standard intake chips', async ({ page }) => {
    await page.goto('/?niggle=neck-shoulders:desk&from=Udi');
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer).toBeVisible({ timeout: 20000 });

    // The change-it door lives in the outro finale for link recipients —
    // the intake starts folded, chips inside the collapsed region.
    const finale = foyer.locator('#rf-reading');
    await finale.scrollIntoViewIfNeeded();
    await finale.getByRole('button', { name: 'not your niggle? change it' }).click();
    const intake = page.locator('#rf-intake');
    const chip = intake.getByRole('button', { name: 'My neck & shoulders' });
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');

    // Picking a different joint remaps the reading — and the quoted gift
    // line follows the selected context (knee defaults to stairs).
    await intake.locator('.rf-chip', { hasText: 'My knee' }).click();
    await expect(foyer.locator('.rf-gift')).toContainText('Heard the stairs have been a thing');
    await expect(foyer.locator('#rf-title')).toContainText('See if it’s actually getting better.');
    // Squats has no fixed-rep protocol — the CTA drops to the honest one rep.
    await expect(finale.locator('#startButton')).toContainText('Try one rep');
  });

  test('an unknown joint lands on the organic variant', async ({ page }) => {
    await page.goto('/?niggle=bogus');
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer).toBeVisible({ timeout: 20000 });
    // No sender greeting — the wordmark eyebrow instead.
    await expect(foyer.getByText(/sent you this/)).toHaveCount(0);
    await expect(foyer.locator('.rf-sent-by')).toHaveText('NIGGLEOMETER');
    // The intake is the hero: chips visible without unfolding anything, and
    // the organic hero keeps its CTA — the learn-first restructure is
    // link-only.
    await expect(foyer.locator('.rf-chip', { hasText: 'My neck & shoulders' })).toBeVisible();
    await expect(foyer.locator('.rf-chip.is-selected')).toHaveCount(0);
    await expect(foyer.locator('.rf-hero #startButton')).toContainText('Try one rep');
    await expect(foyer.getByRole('link', { name: 'Skip to the reading' })).toHaveCount(0);
  });
});

test.describe('Organic landing', () => {
  test.setTimeout(90_000);

  test('the envelope materializes NIGGLEOMETER, not a sender line', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('imf_seenOnboarding_v1', '1');
      localStorage.setItem('imf_skipWalletIntro', '1');
    });
    await page.goto('/');
    // No seen-flag: Act 0 plays. The ring carries the wordmark for organic
    // arrivals (a ?from= name would carry "sent you this" instead).
    const greeting = page.locator('.rf-envelope__greeting');
    await expect(greeting).toHaveText('NIGGLEOMETER', { timeout: 20000 });
    await expect(page.locator('.rf-envelope')).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator('.receiving-foyer')).toBeVisible();
  });

  test('hero intake chips answer the niggle and stay honest', async ({ page }) => {
    await page.addInitScript(SKIP_ENVELOPE);
    await page.goto('/');
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer).toBeVisible({ timeout: 20000 });
    await expect(foyer.locator('#rf-title')).toContainText('Your niggle, measured.');
    await expect(foyer.locator('#startButton')).toContainText('Try one rep');

    // Picking a joint unfolds the context row, retitles the hero, and the
    // CTA promises the real protocol when the movement has one.
    await foyer.locator('.rf-chip', { hasText: 'My neck & shoulders' }).click();
    await expect(foyer.locator('#rf-title')).toContainText('neck & shoulders');
    await expect(foyer.locator('.rf-chip--context', { hasText: 'desk work' })).toBeVisible();
    await expect(foyer.locator('#startButton')).toContainText('Take a 5-rep reading');
    await expect(foyer.getByRole('button', { name: 'Send this to a friend' })).toBeVisible();

    // The company beat lights the answered joint's stat block.
    const company = page.locator('.rf-beat[aria-label="The company"]');
    await company.scrollIntoViewIfNeeded();
    await expect(company.locator('.rf-stat.is-lit')).toHaveCount(1);
    await expect(company.locator('.rf-stat.is-lit')).toContainText('Neck & shoulders');
    await expect(company.locator('h2')).toContainText('enormous, invisible company');
  });

  test('"or pick a movement" unfolds the exercise cards', async ({ page }) => {
    await page.addInitScript(SKIP_ENVELOPE);
    await page.goto('/');
    const foyer = page.locator('.receiving-foyer');
    await expect(foyer).toBeVisible({ timeout: 20000 });

    await foyer.getByRole('button', { name: 'or pick a movement' }).click();
    const moves = page.locator('#rf-moves');
    const squats = moves.locator('.coach-foyer__exercise', { hasText: 'Squats' });
    await expect(squats).toBeVisible();
    await squats.click();
    await expect(page.locator('body')).toHaveAttribute('data-coach-mode', 'squats');
    await expect(squats).toHaveAttribute('aria-pressed', 'true');
    await expect(foyer.locator('#startButton')).toContainText('Try one rep');
  });
});
