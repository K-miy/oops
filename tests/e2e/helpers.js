// @ts-check
/**
 * Shared test helpers for OOPS E2E tests.
 */
import { expect } from '@playwright/test';

/** Lundi 6 janvier 2025 à 12h — jour d'entraînement (L/Me/V sélectionnés). */
export const MONDAY_TS = new Date('2025-01-06T12:00:00').getTime();

/**
 * Resets IndexedDB, runs the full onboarding and lands on the home screen.
 * Profile: male, 35–44, intermediate, Mon/Wed/Fri, 30 min, no special conditions.
 */
export async function setupProfile(page) {
  await page.addInitScript(`Date.now = () => ${MONDAY_TS}`);
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.() ?? [];
    for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
  });
  await page.reload();

  await page.waitForSelector('#screen-disclaimer.active', { timeout: 10_000 });
  await page.locator('#disclaimer-accept-btn').click();
  await page.waitForSelector('#screen-onboarding.active');

  // Étape 1 : langue — auto-advance
  await page.locator('.choice-card[data-value="fr"]').click();

  // Étape 2 : sexe + tranche d'âge — auto-advance when both selected
  await page.waitForSelector('#sex-choices', { timeout: 2000 });
  await page.locator('#sex-choices .choice-card[data-value="male"]').click();
  await page.locator('#age-bracket-choices .choice-card[data-value="35_44"]').click();

  // Étape 3 : niveau — auto-advance
  await page.locator('.choice-card[data-value="intermediate"]').click();

  // Étape 4 : jours (Lun, Mer, Ven) + durée + Next
  await page.waitForSelector('#day-chips', { timeout: 2000 });
  await page.locator('#day-chip-0').click();
  await page.locator('#day-chip-2').click();
  await page.locator('#day-chip-4').click();
  await page.locator('#duration-chips .chip[data-value="30"]').click();
  await page.locator('#onboarding-next-btn').click();

  // Étape 5 : conditions (tout optionnel) + Finish
  await page.locator('#onboarding-next-btn').click();

  await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
}

/**
 * Skips through the entire active session (reading → exercise → rest loops)
 * until the RPE screen is shown.
 */
export async function skipToRpe(page) {
  // Start from preview
  await page.locator('#session-start-btn').click();

  for (let i = 0; i < 100; i++) {
    if (await page.locator('.rpe-scale').isVisible()) break;

    if (await page.locator('#start-exercise-btn').isVisible()) {
      await page.locator('#start-exercise-btn').click();
    } else if (await page.locator('#skip-set-btn').isVisible()) {
      await page.locator('#skip-set-btn').click();
    } else if (await page.locator('#skip-rest-btn').isVisible()) {
      await page.locator('#skip-rest-btn').click();
    } else {
      await page.waitForTimeout(150);
    }
  }

  await expect(page.locator('.rpe-scale')).toBeVisible({ timeout: 5000 });
}
