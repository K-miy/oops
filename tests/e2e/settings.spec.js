// @ts-check
/**
 * Tests E2E — écran Paramètres
 *
 * TDD : ces tests définissent le comportement ATTENDU.
 * Ils doivent être rouges avant l'implémentation.
 */
import { test, expect } from '@playwright/test';
import { setupProfile } from './helpers.js';

test.describe('Paramètres — ordre des sections', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await page.locator('.nav-item[data-screen="settings"]').click();
    await page.waitForSelector('#screen-settings.active');
  });

  test('Sons apparaît avant Langue dans le DOM', async ({ page }) => {
    const soundTop  = await page.locator('#settings-sound-row').evaluate((el) => el.getBoundingClientRect().top);
    const langTop   = await page.locator('#settings-lang-row').evaluate((el) => el.getBoundingClientRect().top);
    expect(soundTop).toBeLessThan(langTop);
  });

  test('Taille du texte apparaît avant Langue dans le DOM', async ({ page }) => {
    const fontTop = await page.locator('#settings-font-slider').evaluate((el) => el.getBoundingClientRect().top);
    const langTop = await page.locator('#settings-lang-row').evaluate((el) => el.getBoundingClientRect().top);
    expect(fontTop).toBeLessThan(langTop);
  });

  test('Langue apparaît avant Profil dans le DOM', async ({ page }) => {
    const langTop    = await page.locator('#settings-lang-row').evaluate((el) => el.getBoundingClientRect().top);
    const profileTop = await page.locator('#settings-profile-row').evaluate((el) => el.getBoundingClientRect().top);
    expect(langTop).toBeLessThan(profileTop);
  });

  test('Reset (zone danger) est en dernier', async ({ page }) => {
    const resetTop  = await page.locator('#settings-reset-row').evaluate((el) => el.getBoundingClientRect().top);
    const exportTop = await page.locator('#settings-export-row').evaluate((el) => el.getBoundingClientRect().top);
    expect(resetTop).toBeGreaterThan(exportTop);
  });
});

test.describe('Paramètres — toggle sons', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await page.locator('.nav-item[data-screen="settings"]').click();
    await page.waitForSelector('#screen-settings.active');
  });

  test('le toggle sons est visible', async ({ page }) => {
    await expect(page.locator('#settings-sound-toggle')).toBeVisible();
  });

  test('cliquer le toggle change son état', async ({ page }) => {
    const before = await page.locator('#settings-sound-toggle').isChecked();
    await page.locator('#settings-sound-toggle').click();
    const after = await page.locator('#settings-sound-toggle').isChecked();
    expect(after).toBe(!before);
  });

  test('la préférence son est persistée après rechargement', async ({ page }) => {
    // Activer le son
    const before = await page.locator('#settings-sound-toggle').isChecked();
    if (!before) await page.locator('#settings-sound-toggle').click();
    await page.waitForTimeout(300);

    // Recharger et revenir aux paramètres
    await page.reload();
    await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
    await page.locator('.nav-item[data-screen="settings"]').click();
    await page.waitForSelector('#screen-settings.active');

    await expect(page.locator('#settings-sound-toggle')).toBeChecked();
  });
});
