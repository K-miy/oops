// @ts-check
import { test, expect } from '@playwright/test';

// Lundi 6 janvier 2025 à 12h00 — jour de workout (3 séances/sem)
const MONDAY_TS = new Date('2025-01-06T12:00:00').getTime();

// Helper : onboarding complet depuis un état vide
async function setupProfile(page) {
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

  await page.locator('.choice-card[data-value="fr"]').click();
  await page.waitForSelector('#input-age', { timeout: 2000 });
  await page.locator('.choice-card[data-value="male"]').click();
  await page.locator('#input-age').fill('35');
  await page.locator('#input-weight').fill('80');
  await page.locator('#onboarding-next-btn').click();

  await page.locator('.choice-card[data-value="intermediate"]').click();
  await page.waitForSelector('#freq-chips', { timeout: 2000 });
  await page.locator('#freq-chips .chip[data-value="3"]').click();
  await page.locator('#duration-chips .chip[data-value="30"]').click();
  await page.locator('#onboarding-next-btn').click();

  await page.locator('.choice-card[data-value="false"]').click();
  await page.locator('#onboarding-next-btn').click();

  await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
}

test.describe('Navigation — barre du bas', () => {
  test.beforeEach(setupProfile);

  test('la barre de navigation est visible sur l\'accueil', async ({ page }) => {
    await expect(page.locator('#bottom-nav')).toBeVisible();
  });

  test('la barre de navigation est cachée sur le disclaimer', async ({ page }) => {
    // Recharger en état vide pour voir le disclaimer
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases?.() ?? [];
      for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
    });
    await page.reload();
    await page.waitForSelector('#screen-disclaimer.active');
    await expect(page.locator('#bottom-nav')).toBeHidden();
  });

  test('cliquer Historique affiche l\'écran historique', async ({ page }) => {
    await page.locator('.nav-item[data-screen="history"]').click();
    await expect(page.locator('#screen-history')).toBeVisible();
    await expect(page.locator('#bottom-nav')).toBeVisible();
  });

  test('cliquer Paramètres affiche l\'écran paramètres', async ({ page }) => {
    await page.locator('.nav-item[data-screen="settings"]').click();
    await expect(page.locator('#screen-settings')).toBeVisible();
    await expect(page.locator('#bottom-nav')).toBeVisible();
  });

  test('cliquer Accueil depuis l\'historique revient à l\'accueil', async ({ page }) => {
    await page.locator('.nav-item[data-screen="history"]').click();
    await page.waitForSelector('#screen-history.active');
    await page.locator('.nav-item[data-screen="home"]').click();
    await page.waitForSelector('#screen-home.active');
    await expect(page.locator('#screen-home')).toBeVisible();
  });

  test('le bouton actif a la classe active', async ({ page }) => {
    await expect(page.locator('.nav-item[data-screen="home"]')).toHaveClass(/active/);
    await page.locator('.nav-item[data-screen="history"]').click();
    await page.waitForSelector('#screen-history.active');
    await expect(page.locator('.nav-item[data-screen="history"]')).toHaveClass(/active/);
    await expect(page.locator('.nav-item[data-screen="home"]')).not.toHaveClass(/active/);
  });
});

test.describe('Accueil — aperçu semaine', () => {
  test.beforeEach(setupProfile);

  test('affiche la section "Cette semaine"', async ({ page }) => {
    await expect(page.locator('.week-preview')).toBeVisible();
  });

  test('affiche 7 cartes jour', async ({ page }) => {
    await expect(page.locator('.day-card')).toHaveCount(7);
  });

  test('la carte d\'aujourd\'hui a la classe day-card-today', async ({ page }) => {
    await expect(page.locator('.day-card-today')).toBeVisible();
  });
});

test.describe('Historique — état vide', () => {
  test.beforeEach(setupProfile);

  test('affiche l\'état vide sans séances', async ({ page }) => {
    await page.locator('.nav-item[data-screen="history"]').click();
    await page.waitForSelector('#screen-history.active');
    await expect(page.locator('#history-main')).toBeVisible();
  });
});
