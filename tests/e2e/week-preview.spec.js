// @ts-check
import { test, expect } from '@playwright/test';
import { setupProfile } from './helpers.js';

test.describe('Aperçu semaine — détails au clic', () => {
  test.beforeEach(setupProfile);

  test('cliquer sur une carte d\'entraînement affiche les exercices', async ({ page }) => {
    const todayCard = page.locator('.day-card-today');
    await expect(todayCard).toBeVisible();
    await todayCard.click();

    await expect(page.locator('#week-day-detail')).not.toBeEmpty();
    await expect(page.locator('#week-day-detail .exercise-preview').first()).toBeVisible();
  });

  test('re-cliquer sur la même carte ferme le détail', async ({ page }) => {
    const todayCard = page.locator('.day-card-today');
    await todayCard.click();
    await expect(page.locator('#week-day-detail')).not.toBeEmpty();

    await todayCard.click();
    await expect(page.locator('#week-day-detail')).toBeEmpty();
  });

  test('cliquer sur une autre carte change le détail', async ({ page }) => {
    const cards = page.locator('.day-card[data-day-idx]');
    await cards.nth(0).click();
    const firstContent = await page.locator('#week-day-detail').textContent();

    await cards.nth(2).click();
    const secondContent = await page.locator('#week-day-detail').textContent();

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
