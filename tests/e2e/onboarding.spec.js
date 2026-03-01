// @ts-check
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.() ?? [];
    for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
  });
  await page.reload();
});

test.describe('Premier lancement — Disclaimer', () => {
  test('affiche le disclaimer au premier lancement', async ({ page }) => {
    await page.waitForSelector('#screen-disclaimer.active', { timeout: 10_000 });
    await expect(page.locator('#screen-disclaimer')).toBeVisible();
  });

  test('le bouton Confirmer est visible et actif', async ({ page }) => {
    await page.waitForSelector('#screen-disclaimer.active');
    await expect(page.locator('#disclaimer-accept-btn')).toBeEnabled();
  });

  test('confirmer le disclaimer mène à l\'onboarding', async ({ page }) => {
    await page.waitForSelector('#screen-disclaimer.active');
    await page.locator('#disclaimer-accept-btn').click();
    await page.waitForSelector('#screen-onboarding.active');
    await expect(page.locator('#screen-onboarding')).toBeVisible();
  });
});

test.describe('Onboarding — Création de profil', () => {
  test.beforeEach(async ({ page }) => {
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
    // Étape 1 : langue — auto-advance
    await page.locator('.choice-card[data-value="fr"]').click();

    // Étape 2 : sexe + tranche d'âge — auto-advance when both selected
    await page.waitForSelector('#sex-choices', { timeout: 2000 });
    await page.locator('#sex-choices .choice-card[data-value="female"]').click();
    await page.locator('#age-bracket-choices .choice-card[data-value="under_35"]').click();

    // Étape 3 : niveau — auto-advance
    await page.locator('.choice-card[data-value="beginner"]').click();

    // Étape 4 : jours (min 2) + durée + Next
    await page.waitForSelector('#day-chips', { timeout: 2000 });
    await page.locator('#day-chip-1').click(); // Mar
    await page.locator('#day-chip-4').click(); // Ven
    await page.locator('#duration-chips .chip[data-value="30"]').click();
    await page.locator('#onboarding-next-btn').click();

    // Étape 5 : conditions — tout optionnel
    await page.locator('#onboarding-next-btn').click();

    await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
    await expect(page.locator('#screen-home')).toBeVisible();
  });

  test('le bouton Retour ramène à l\'étape précédente', async ({ page }) => {
    // Step 1 auto-advance → attend step 2
    await page.locator('.choice-card[data-value="fr"]').click();
    await page.waitForSelector('#sex-choices', { timeout: 2000 });
    await expect(page.locator('#onboarding-back-btn')).toBeVisible();
    // Retour → step 1
    await page.locator('#onboarding-back-btn').click();
    await expect(page.locator('.choice-card[data-value="fr"]')).toBeVisible();
  });

  test('le bouton Suivant sans saisie secoue le bouton (validation)', async ({ page }) => {
    // Step 1 auto-advance → step 2
    await page.locator('.choice-card[data-value="fr"]').click();
    await page.waitForSelector('#sex-choices', { timeout: 2000 });

    // Cliquer Next sans avoir sélectionné sexe + tranche d'âge
    await page.locator('#onboarding-next-btn').click();
    // On reste à l'étape 2 (sex-choices toujours visible)
    await expect(page.locator('#sex-choices')).toBeVisible();
  });
});
