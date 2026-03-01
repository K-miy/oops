// @ts-check
import { test, expect } from '@playwright/test';

const MONDAY_TS = new Date('2025-01-06T12:00:00').getTime();

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

  // Étape 1 : langue
  await page.locator('.choice-card[data-value="fr"]').click();

  // Étape 2 : sexe + tranche d'âge
  await page.waitForSelector('#sex-choices', { timeout: 2000 });
  await page.locator('#sex-choices .choice-card[data-value="male"]').click();
  await page.locator('#age-bracket-choices .choice-card[data-value="35_44"]').click();
  await page.locator('#onboarding-next-btn').click();

  // Étape 3 : niveau
  await page.locator('.choice-card[data-value="intermediate"]').click();

  // Étape 4 : jours d'entraînement & durée (multi-select, min 2 jours)
  await page.waitForSelector('#day-chips', { timeout: 2000 });
  await page.locator('#day-chip-0').click(); // Lun
  await page.locator('#day-chip-2').click(); // Mer
  await page.locator('#day-chip-4').click(); // Ven
  await page.locator('#duration-chips .chip[data-value="30"]').click();
  await page.locator('#onboarding-next-btn').click();

  // Étape 5 : conditions
  await page.locator('.choice-card[data-value="false"]').click();
  await page.locator('#onboarding-next-btn').click();

  await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
}

test.describe('Modifier le profil', () => {
  test.beforeEach(setupProfile);

  test('ouvre l\'onboarding depuis les paramètres', async ({ page }) => {
    await page.locator('.nav-item[data-screen="settings"]').click();
    await page.waitForSelector('#screen-settings.active');

    await page.locator('#settings-profile-row').click();
    await page.waitForSelector('#screen-onboarding.active');

    // En mode édition, on démarre à l'étape 2 (tranche d'âge visible, pas de choix de langue)
    await expect(page.locator('#age-bracket-choices')).toBeVisible();
  });

  test('l\'onboarding est pré-rempli avec la tranche d\'âge existante', async ({ page }) => {
    await page.locator('.nav-item[data-screen="settings"]').click();
    await page.waitForSelector('#screen-settings.active');
    await page.locator('#settings-profile-row').click();
    await page.waitForSelector('#screen-onboarding.active');

    // La tranche d'âge saisie lors de l'onboarding doit être pré-sélectionnée
    await expect(page.locator('#age-bracket-35_44')).toHaveClass(/selected/);
  });

  test('sauvegarder le profil modifié revient à l\'accueil', async ({ page }) => {
    await page.locator('.nav-item[data-screen="settings"]').click();
    await page.waitForSelector('#screen-settings.active');
    await page.locator('#settings-profile-row').click();
    await page.waitForSelector('#screen-onboarding.active');

    // Modifier la tranche d'âge
    await page.locator('#age-bracket-choices .choice-card[data-value="45_plus"]').click();
    await page.locator('#onboarding-next-btn').click(); // étape 2 → 3 (niveau)

    // Étape 3 : niveau pré-sélectionné, on avance via Suivant
    await page.locator('#onboarding-next-btn').click(); // étape 3 → 4 (jours)
    await page.waitForSelector('#day-chips', { timeout: 2000 });

    await page.locator('#onboarding-next-btn').click(); // étape 4 → 5 (conditions)
    await page.locator('#onboarding-next-btn').click(); // étape 5 → terminé

    await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
    await expect(page.locator('#screen-home')).toBeVisible();
  });
});
