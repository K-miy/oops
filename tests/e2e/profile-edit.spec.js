// @ts-check
import { test, expect } from '@playwright/test';
import { setupProfile } from './helpers.js';

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
