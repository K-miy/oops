// @ts-check
import { test, expect } from '@playwright/test';

// Helper : créer un profil en base pour bypasser l'onboarding
async function setupProfile(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    // Injecte un profil directement dans IndexedDB
    const { default: Dexie } = await import('/js/db.js');
    // Alternative : appel direct à la DB
  });
  // On passe par l'onboarding complet (plus fiable que l'injection directe)
  await page.waitForSelector('#screen-disclaimer.active');
  await page.locator('#disclaimer-checkbox').check();
  await page.locator('#disclaimer-accept-btn').click();
  await page.waitForSelector('#screen-onboarding.active');

  await page.locator('.choice-card[data-value="fr"]').click();
  await page.locator('#onboarding-next-btn').click();
  await page.locator('.choice-card[data-value="male"]').click();
  await page.locator('#input-age').fill('35');
  await page.locator('#input-weight').fill('80');
  await page.locator('#onboarding-next-btn').click();
  await page.locator('.choice-card[data-value="intermediate"]').click();
  await page.locator('#onboarding-next-btn').click();
  await page.locator('#freq-chips .chip[data-value="3"]').click();
  await page.locator('#duration-chips .chip[data-value="30"]').click();
  await page.locator('#onboarding-next-btn').click();
  await page.locator('.choice-card[data-value="false"]').click();
  await page.locator('#onboarding-next-btn').click();
  await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
}

test.describe('Écran d\'accueil', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases?.() ?? [];
      for (const db of dbs) indexedDB.deleteDatabase(db.name);
    });
    await setupProfile(page);
  });

  test('affiche la séance du jour', async ({ page }) => {
    await expect(page.locator('.session-card')).toBeVisible();
  });

  test('affiche le bouton Commencer la séance', async ({ page }) => {
    await expect(page.locator('#start-session-btn')).toBeVisible();
  });

  test('affiche le streak (au moins 0)', async ({ page }) => {
    await expect(page.locator('.streak-card')).toBeVisible();
  });
});

test.describe('Séance active', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases?.() ?? [];
      for (const db of dbs) indexedDB.deleteDatabase(db.name);
    });
    await setupProfile(page);
    await page.locator('#start-session-btn').click();
    await page.waitForSelector('#screen-session.active');
  });

  test('affiche les exercices de la séance', async ({ page }) => {
    await expect(page.locator('.exercise-card').first()).toBeVisible();
  });

  test('affiche le compteur de progression', async ({ page }) => {
    await expect(page.locator('#session-progress')).toHaveText(/0\s*\/\s*\d+/);
  });

  test('marquer un exercice met à jour le compteur', async ({ page }) => {
    const firstDoneBtn = page.locator('.exercise-done-btn').first();
    await firstDoneBtn.click();
    await expect(page.locator('#session-progress')).toHaveText(/1\s*\/\s*\d+/);
  });

  test('terminer tous les exercices affiche le bouton Terminer', async ({ page }) => {
    const doneBtns = page.locator('.exercise-done-btn');
    const count = await doneBtns.count();
    for (let i = 0; i < count; i++) {
      await page.locator('.exercise-done-btn').first().click();
    }
    await expect(page.locator('#finish-session-btn')).toBeVisible();
  });

  test('terminer la séance affiche l\'écran RPE', async ({ page }) => {
    const doneBtns = page.locator('.exercise-done-btn');
    const count = await doneBtns.count();
    for (let i = 0; i < count; i++) {
      await page.locator('.exercise-done-btn').first().click();
    }
    await page.locator('#finish-session-btn').click();
    await expect(page.locator('.rpe-scale')).toBeVisible();
  });

  test('ignorer le RPE retourne à l\'accueil', async ({ page }) => {
    const doneBtns = page.locator('.exercise-done-btn');
    const count = await doneBtns.count();
    for (let i = 0; i < count; i++) {
      await page.locator('.exercise-done-btn').first().click();
    }
    await page.locator('#finish-session-btn').click();
    await page.locator('#skip-rpe-btn').click();
    await page.waitForSelector('#screen-home.active');
    await expect(page.locator('#screen-home')).toBeVisible();
  });
});
