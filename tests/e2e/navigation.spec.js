// @ts-check
import { test, expect } from '@playwright/test';
import { setupProfile } from './helpers.js';

test.describe('Navigation — barre du bas', () => {
  test.beforeEach(setupProfile);

  test('la barre de navigation est visible sur l\'accueil', async ({ page }) => {
    await expect(page.locator('#bottom-nav')).toBeVisible();
  });

  test('la barre de navigation est cachée sur le disclaimer', async ({ page }) => {
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

  test('affiche l\'écran historique', async ({ page }) => {
    await page.locator('.nav-item[data-screen="history"]').click();
    await page.waitForSelector('#screen-history.active');
    await expect(page.locator('#history-main')).toBeVisible();
  });
});
