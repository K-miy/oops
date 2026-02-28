// @ts-check
import { test, expect } from '@playwright/test';

// Chaque test repart d'une IndexedDB vide
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.() ?? [];
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  });
  await page.reload();
});

test.describe('Premier lancement — Disclaimer', () => {
  test('affiche le disclaimer au premier lancement', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#screen-disclaimer.active', { timeout: 10_000 });
    await expect(page.locator('#screen-disclaimer')).toBeVisible();
  });

  test('le bouton Confirmer est visible et actif', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#screen-disclaimer.active');
    await expect(page.locator('#disclaimer-accept-btn')).toBeEnabled();
  });

  test('confirmer le disclaimer mène à l\'onboarding', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#screen-disclaimer.active');
    await page.locator('#disclaimer-accept-btn').click();
    await page.waitForSelector('#screen-onboarding.active');
    await expect(page.locator('#screen-onboarding')).toBeVisible();
  });
});

test.describe('Onboarding — Création de profil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#screen-disclaimer.active');
    await page.locator('#disclaimer-accept-btn').click();
    await page.waitForSelector('#screen-onboarding.active');
  });

  test('le premier écran propose le choix de langue', async ({ page }) => {
    await expect(page.locator('.choice-card[data-value="fr"]')).toBeVisible();
    await expect(page.locator('.choice-card[data-value="en"]')).toBeVisible();
  });

  test('sélectionner la langue FR active la carte', async ({ page }) => {
    await page.locator('.choice-card[data-value="fr"]').click();
    await expect(page.locator('.choice-card[data-value="fr"]')).toHaveClass(/selected/);
  });

  test('naviguer jusqu\'à la fin crée le profil et mène à l\'accueil', async ({ page }) => {
    // Étape 1 : langue — auto-avance après sélection (350ms)
    await page.locator('.choice-card[data-value="fr"]').click();
    await page.waitForSelector('#input-age', { timeout: 2000 }); // attend l'étape 2

    // Étape 2 : infos perso — bouton Next requis (champs texte)
    await page.locator('.choice-card[data-value="female"]').click();
    await page.locator('#input-age').fill('32');
    await page.locator('#input-weight').fill('65');
    await page.locator('#onboarding-next-btn').click();

    // Étape 3 : niveau — auto-avance après sélection (300ms)
    await page.locator('.choice-card[data-value="beginner"]').click();
    await page.waitForSelector('#freq-chips', { timeout: 2000 }); // attend l'étape 4

    // Étape 4 : fréquence
    await page.locator('#freq-chips .chip[data-value="3"]').click();
    await page.locator('#duration-chips .chip[data-value="30"]').click();
    await page.locator('#onboarding-next-btn').click();

    // Étape 5 : conditions
    await page.locator('.choice-card[data-value="false"]').click();
    await page.locator('#onboarding-next-btn').click();

    // Arrivée à l'accueil
    await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
    await expect(page.locator('#screen-home')).toBeVisible();
  });

  test('le bouton Retour ramène à l\'étape précédente', async ({ page }) => {
    // Step 1 auto-avance → on attend step 2
    await page.locator('.choice-card[data-value="fr"]').click();
    await page.waitForSelector('#input-age', { timeout: 2000 });
    await expect(page.locator('#onboarding-back-btn')).toBeVisible();
    // Retour → step 1
    await page.locator('#onboarding-back-btn').click();
    await expect(page.locator('.choice-card[data-value="fr"]')).toBeVisible();
  });
});
