// @ts-check
import { test, expect } from '@playwright/test';
import { setupProfile, skipToRpe } from './helpers.js';

test.describe('Écran d\'accueil', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
  });

  test('affiche la séance du jour', async ({ page }) => {
    await expect(page.locator('.session-card')).toBeVisible();
  });

  test('affiche le bouton Commencer la séance', async ({ page }) => {
    await expect(page.locator('#start-session-btn')).toBeVisible();
  });

  test('affiche le streak', async ({ page }) => {
    await expect(page.locator('.streak-card')).toBeVisible();
  });
});

test.describe('Séance — phase PREVIEW', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await page.locator('#start-session-btn').click();
    await page.waitForSelector('#screen-session.active');
  });

  test('affiche la liste des exercices avant de commencer', async ({ page }) => {
    await expect(page.locator('.preview-list')).toBeVisible();
    await expect(page.locator('.preview-row').first()).toBeVisible();
  });

  test('affiche le bouton C\'est parti !', async ({ page }) => {
    await expect(page.locator('#session-start-btn')).toBeVisible();
  });

  test('on peut passer un exercice via ✕', async ({ page }) => {
    const skipBtns = page.locator('.preview-skip-btn');
    const countBefore = await page.locator('.preview-row:not(.preview-row--skipped)').count();
    await skipBtns.first().click();
    const countAfter = await page.locator('.preview-row.preview-row--skipped').count();
    expect(countAfter).toBe(1);
    expect(countBefore).toBeGreaterThan(0);
  });

  test('re-cliquer ✕ retire le skip', async ({ page }) => {
    const firstSkip = page.locator('.preview-skip-btn').first();
    await firstSkip.click();
    await expect(page.locator('.preview-row.preview-row--skipped')).toHaveCount(1);
    await firstSkip.click();
    await expect(page.locator('.preview-row.preview-row--skipped')).toHaveCount(0);
  });
});

test.describe('Séance — phase READING', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await page.locator('#start-session-btn').click();
    await page.waitForSelector('#screen-session.active');
    await page.locator('#session-start-btn').click();
  });

  test('affiche la phase de lecture avec le nom de l\'exercice', async ({ page }) => {
    await expect(page.locator('.session-reading')).toBeVisible();
    await expect(page.locator('.session-ex-name')).toBeVisible();
  });

  test('affiche un décompte de 15 secondes', async ({ page }) => {
    await expect(page.locator('#reading-timer')).toBeVisible();
    const text = await page.locator('#reading-timer').textContent();
    expect(text).toMatch(/1[0-5]s/); // 10–15s (peut avoir légèrement avancé)
  });

  test('affiche le bouton C\'est parti !', async ({ page }) => {
    await expect(page.locator('#start-exercise-btn')).toBeVisible();
  });

  test('passer la lecture affiche le timer d\'exercice', async ({ page }) => {
    await page.locator('#start-exercise-btn').click();
    await expect(page.locator('.session-exercise')).toBeVisible();
    await expect(page.locator('#timer-value')).toBeVisible();
  });
});

test.describe('Séance — phase EXERCISING', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await page.locator('#start-session-btn').click();
    await page.waitForSelector('#screen-session.active');
    await page.locator('#session-start-btn').click();
    await page.locator('#start-exercise-btn').click(); // skip reading
  });

  test('affiche le nom de l\'exercice et le timer', async ({ page }) => {
    await expect(page.locator('.session-ex-name')).toBeVisible();
    await expect(page.locator('#timer-value')).toBeVisible();
  });

  test('affiche le bouton Passer (skip set)', async ({ page }) => {
    await expect(page.locator('#skip-set-btn')).toBeVisible();
  });

  test('affiche le bouton Changer (swap)', async ({ page }) => {
    await expect(page.locator('#swap-ex-btn')).toBeVisible();
  });

  test('passer un set mène au repos ou à la lecture', async ({ page }) => {
    await page.locator('#skip-set-btn').click();
    // Should show either rest (inter-set) or reading (next exercise)
    const showsRest = await page.locator('.session-rest').isVisible();
    const showsReading = await page.locator('.session-reading').isVisible();
    expect(showsRest || showsReading).toBe(true);
  });
});

test.describe('Séance — phase RESTING', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await page.locator('#start-session-btn').click();
    await page.waitForSelector('#screen-session.active');
    await page.locator('#session-start-btn').click();
    await page.locator('#start-exercise-btn').click();
    await page.locator('#skip-set-btn').click();
    // After skipping a set we should be in rest (if multi-set) or reading (if single-set)
    // Wait for either phase
    await page.waitForSelector('.session-rest, .session-reading', { timeout: 3000 });
  });

  test('la phase de repos est accessible via skip set', async ({ page }) => {
    // Either rest or reading is shown — both are valid states
    const inRest = await page.locator('.session-rest').isVisible();
    const inReading = await page.locator('.session-reading').isVisible();
    expect(inRest || inReading).toBe(true);
  });
});

test.describe('Séance — RPE et fin', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await page.locator('#start-session-btn').click();
    await page.waitForSelector('#screen-session.active');
    await skipToRpe(page);
  });

  test('affiche l\'échelle RPE', async ({ page }) => {
    await expect(page.locator('.rpe-scale')).toBeVisible();
    await expect(page.locator('.rpe-btn').first()).toBeVisible();
  });

  test('affiche le bouton I did it again', async ({ page }) => {
    await expect(page.locator('#finish-btn')).toBeVisible();
  });

  test('sélectionner un RPE l\'active', async ({ page }) => {
    await page.locator('.rpe-btn[data-rpe="6"]').click();
    await expect(page.locator('.rpe-btn[data-rpe="6"]')).toHaveClass(/selected/);
  });

  test('cliquer I did it again sans RPE revient à l\'accueil', async ({ page }) => {
    await page.locator('#finish-btn').click();
    await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
    await expect(page.locator('#screen-home')).toBeVisible();
  });

  test('cliquer I did it again avec RPE revient à l\'accueil', async ({ page }) => {
    await page.locator('.rpe-btn[data-rpe="6"]').click();
    await page.locator('#finish-btn').click();
    await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
    await expect(page.locator('#screen-home')).toBeVisible();
  });
});
