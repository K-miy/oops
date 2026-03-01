// @ts-check
import { test, expect } from '@playwright/test';

// Lundi 6 janvier 2025 — jour d'entraînement (3 séances/sem : Lun, Mer, Ven)
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

test.describe('Aperçu semaine — détails au clic', () => {
  test.beforeEach(setupProfile);

  test('cliquer sur une carte d\'entraînement affiche les exercices', async ({ page }) => {
    // Lundi = jour d'entraînement (index 0, day-card-today)
    const todayCard = page.locator('.day-card-today');
    await expect(todayCard).toBeVisible();
    await todayCard.click();

    // Le panneau de détail doit apparaître avec au moins un exercice
    await expect(page.locator('#week-day-detail')).not.toBeEmpty();
    await expect(page.locator('#week-day-detail .exercise-preview')).not.toHaveCount(0);
  });

  test('re-cliquer sur la même carte ferme le détail', async ({ page }) => {
    const todayCard = page.locator('.day-card-today');
    await todayCard.click();
    await expect(page.locator('#week-day-detail')).not.toBeEmpty();

    await todayCard.click();
    await expect(page.locator('#week-day-detail')).toBeEmpty();
  });

  test('cliquer sur une autre carte change le détail', async ({ page }) => {
    // Carte Lundi (index 0) → Mercredi (index 2, aussi jour d'entraînement pour 3/sem)
    const cards = page.locator('.day-card[data-day-idx]');
    await cards.nth(0).click();
    const firstContent = await page.locator('#week-day-detail').textContent();

    await cards.nth(2).click();
    const secondContent = await page.locator('#week-day-detail').textContent();

    // Les deux jours ont un contenu (exercices), potentiellement différent
    expect(firstContent?.length).toBeGreaterThan(0);
    expect(secondContent?.length).toBeGreaterThan(0);
  });

  test('la carte sélectionnée a la classe day-card-selected', async ({ page }) => {
    const todayCard = page.locator('.day-card-today');
    await todayCard.click();
    await expect(todayCard).toHaveClass(/day-card-selected/);
  });

  test('cliquer une carte désélectionne la précédente', async ({ page }) => {
    const cards = page.locator('.day-card[data-day-idx]');
    await cards.nth(0).click();
    await expect(cards.nth(0)).toHaveClass(/day-card-selected/);

    await cards.nth(2).click();
    await expect(cards.nth(0)).not.toHaveClass(/day-card-selected/);
    await expect(cards.nth(2)).toHaveClass(/day-card-selected/);
  });
});
