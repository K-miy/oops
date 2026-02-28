// @ts-check
import { test, expect } from '@playwright/test';

// Lundi 6 janvier 2025 à 12h00 — jour de workout pour 3 séances/semaine (L/Me/Ve)
const MONDAY_TS = new Date('2025-01-06T12:00:00').getTime();

// Helper : créer un profil via l'onboarding complet
async function setupProfile(page) {
  // Figer la date à un lundi pour garantir un jour d'entraînement
  await page.addInitScript(`Date.now = () => ${MONDAY_TS}`);

  await page.goto('/');
  await page.waitForSelector('#screen-disclaimer.active', { timeout: 10_000 });
  await page.locator('#disclaimer-accept-btn').click();
  await page.waitForSelector('#screen-onboarding.active');

  // Étape 1 : langue — auto-avance après sélection
  await page.locator('.choice-card[data-value="fr"]').click();
  await page.waitForSelector('#input-age', { timeout: 2000 });

  // Étape 2 : infos perso — bouton Next requis
  await page.locator('.choice-card[data-value="male"]').click();
  await page.locator('#input-age').fill('35');
  await page.locator('#input-weight').fill('80');
  await page.locator('#onboarding-next-btn').click();

  // Étape 3 : niveau — auto-avance après sélection
  await page.locator('.choice-card[data-value="intermediate"]').click();
  await page.waitForSelector('#freq-chips', { timeout: 2000 });

  // Étape 4 : fréquence + durée
  await page.locator('#freq-chips .chip[data-value="3"]').click();
  await page.locator('#duration-chips .chip[data-value="30"]').click();
  await page.locator('#onboarding-next-btn').click();

  // Étape 5 : post-partum
  await page.locator('.choice-card[data-value="false"]').click();
  await page.locator('#onboarding-next-btn').click();

  await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
}

test.describe('Écran d\'accueil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases?.() ?? [];
      for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
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
    await page.goto('/');
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases?.() ?? [];
      for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
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
    await page.locator('.exercise-done-btn').first().click();
    await expect(page.locator('#session-progress')).toHaveText(/1\s*\/\s*\d+/);
  });

  test('terminer tous les exercices affiche le bouton Terminer', async ({ page }) => {
    const count = await page.locator('.exercise-done-btn').count();
    for (let i = 0; i < count; i++) {
      await page.locator('.exercise-done-btn').first().click();
    }
    await expect(page.locator('#finish-session-btn')).toBeVisible();
  });

  test('terminer la séance affiche l\'écran RPE', async ({ page }) => {
    const count = await page.locator('.exercise-done-btn').count();
    for (let i = 0; i < count; i++) {
      await page.locator('.exercise-done-btn').first().click();
    }
    await page.locator('#finish-session-btn').click();
    await expect(page.locator('.rpe-scale')).toBeVisible();
  });

  test('ignorer le RPE retourne à l\'accueil', async ({ page }) => {
    const count = await page.locator('.exercise-done-btn').count();
    for (let i = 0; i < count; i++) {
      await page.locator('.exercise-done-btn').first().click();
    }
    await page.locator('#finish-session-btn').click();
    await page.locator('#skip-rpe-btn').click();
    await page.waitForSelector('#screen-home.active');
    await expect(page.locator('#screen-home')).toBeVisible();
  });
});
