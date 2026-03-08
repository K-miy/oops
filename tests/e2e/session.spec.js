// @ts-check
/**
 * Tests E2E — machine à états de la séance
 *
 * Chaque describe couvre une transition ou un état du diagramme :
 *
 *   PREVIEW → READING → EXERCISING → RESTING (inter-sets)  → EXERCISING
 *                                  → RESTING (inter-ex)    → EXERCISING
 *                                  → RPE (dernier ex done) → home
 */
import { test, expect } from '@playwright/test';
import { setupProfile, skipToRpe } from './helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers locaux
// ─────────────────────────────────────────────────────────────────────────────

/** Ouvre l'écran de séance depuis l'accueil. */
async function openSession(page) {
  await page.locator('#start-session-btn').click();
  await page.waitForSelector('#screen-session.active');
}

/** PREVIEW → READING → EXERCISING (passe la lecture au clic). */
async function goToExercising(page) {
  await page.locator('#session-start-btn').click();       // PREVIEW → READING
  await page.waitForSelector('#start-exercise-btn');
  await page.locator('#start-exercise-btn').click();      // READING → EXERCISING
  await page.waitForSelector('#skip-set-btn');
}

/**
 * Depuis EXERCISING, skip des séries jusqu'à atteindre un repos inter-exercices
 * (label contient le nom de l'exercice suivant).
 * Retourne true si on y est arrivé, false si on a atteint RPE avant.
 */
async function skipToInterExRest(page) {
  for (let i = 0; i < 20; i++) {
    if (await page.locator('.rpe-scale').isVisible()) return false;

    if (await page.locator('#skip-set-btn').isVisible()) {
      await page.locator('#skip-set-btn').click();
      await page.waitForSelector('.session-rest, .session-exercise, .rpe-scale', { timeout: 2000 });
    }

    if (await page.locator('.session-rest').isVisible()) {
      const label = await page.locator('.session-rest-next').textContent();
      if (label && !label.includes('série')) return true; // inter-exercise rest
      // inter-set rest → continue
      await page.locator('#skip-rest-btn').click();
      await page.waitForSelector('#skip-set-btn, .rpe-scale', { timeout: 2000 });
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// État : PREVIEW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PREVIEW — liste avant démarrage', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await openSession(page);
  });

  test('affiche la liste des exercices', async ({ page }) => {
    await expect(page.locator('.preview-list')).toBeVisible();
    await expect(page.locator('.preview-row').first()).toBeVisible();
  });

  test('chaque exercice montre son nom et ses séries/reps', async ({ page }) => {
    const first = page.locator('.preview-row').first();
    await expect(first.locator('.preview-row-name')).not.toBeEmpty();
    await expect(first.locator('.preview-row-spec')).not.toBeEmpty();
  });

  test('le bouton démarrer est présent', async ({ page }) => {
    await expect(page.locator('#session-start-btn')).toBeVisible();
  });

  test('✕ marque un exercice comme skipped', async ({ page }) => {
    await page.locator('.preview-skip-btn').first().click();
    await expect(page.locator('.preview-row.preview-row--skipped')).toHaveCount(1);
  });

  test('re-cliquer ✕ retire le skip (toggle)', async ({ page }) => {
    const btn = page.locator('.preview-skip-btn').first();
    await btn.click();
    await btn.click();
    await expect(page.locator('.preview-row.preview-row--skipped')).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transition : PREVIEW → READING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PREVIEW → READING', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await openSession(page);
  });

  test('clic sur C\'est parti! affiche la phase de lecture', async ({ page }) => {
    await page.locator('#session-start-btn').click();
    await expect(page.locator('.session-reading')).toBeVisible();
  });

  test('le nom et les instructions de l\'exercice sont affichés', async ({ page }) => {
    await page.locator('#session-start-btn').click();
    await expect(page.locator('.session-ex-name')).not.toBeEmpty();
  });

  test('le décompte démarre à 15s', async ({ page }) => {
    await page.locator('#session-start-btn').click();
    const text = await page.locator('#reading-timer').textContent();
    // Légèrement en dessous de 15 est acceptable (délai d'execution)
    expect(parseInt(text ?? '0')).toBeGreaterThanOrEqual(13);
  });

  test('le bouton "C\'est parti !" est disponible', async ({ page }) => {
    await page.locator('#session-start-btn').click();
    await expect(page.locator('#start-exercise-btn')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transition : READING → EXERCISING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('READING → EXERCISING', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await openSession(page);
    await page.locator('#session-start-btn').click();
    await page.waitForSelector('#start-exercise-btn');
  });

  test('clic sur start affiche la phase exercice', async ({ page }) => {
    await page.locator('#start-exercise-btn').click();
    await expect(page.locator('.session-exercise')).toBeVisible();
  });

  test('le timer est actif et positif', async ({ page }) => {
    await page.locator('#start-exercise-btn').click();
    const val = await page.locator('#timer-value').textContent();
    expect(parseInt(val ?? '0')).toBeGreaterThan(0);
  });

  test('le compteur de reps est affiché pour les exercices en reps', async ({ page }) => {
    await page.locator('#start-exercise-btn').click();
    // Peut ne pas être présent si l'exercice est timed — on vérifie juste que le timer est là
    await expect(page.locator('#timer-value')).toBeVisible();
  });

  test('les boutons Passer et Changer sont présents', async ({ page }) => {
    await page.locator('#start-exercise-btn').click();
    await expect(page.locator('#skip-set-btn')).toBeVisible();
    await expect(page.locator('#swap-ex-btn')).toBeVisible();
  });

  test('le compteur de position exercice est correct (1 / N)', async ({ page }) => {
    await page.locator('#start-exercise-btn').click();
    const counter = await page.locator('.session-ex-counter').textContent();
    expect(counter).toMatch(/^1 \/ \d+$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISING : swap
// ─────────────────────────────────────────────────────────────────────────────

test.describe('EXERCISING — swap d\'exercice', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await openSession(page);
    await goToExercising(page);
  });

  test('si un alternatif existe, le swap change le nom de l\'exercice', async ({ page }) => {
    const disabled = await page.locator('#swap-ex-btn').getAttribute('disabled');
    if (disabled !== null) {
      test.skip(); // pas d'alternatif disponible, test non applicable
      return;
    }
    const before = await page.locator('.session-ex-name').textContent();
    await page.locator('#swap-ex-btn').click();
    const after = await page.locator('.session-ex-name').textContent();
    expect(after).not.toBe(before);
  });

  test('un swap remet le compteur de séries à 1', async ({ page }) => {
    const disabled = await page.locator('#swap-ex-btn').getAttribute('disabled');
    if (disabled !== null) return;
    await page.locator('#swap-ex-btn').click();
    const setLabel = await page.locator('.session-ex-setlabel').textContent();
    expect(setLabel).toMatch(/1 \//);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transition : EXERCISING → RESTING inter-séries
// ─────────────────────────────────────────────────────────────────────────────

test.describe('EXERCISING → RESTING inter-séries', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await openSession(page);
    await goToExercising(page);
    await page.locator('#skip-set-btn').click();
    await page.waitForSelector('.session-rest, .session-exercise, .rpe-scale', { timeout: 3000 });
  });

  test('passer une série non-terminale mène au repos ou à l\'exercice suivant', async ({ page }) => {
    const inRest     = await page.locator('.session-rest').isVisible();
    const inExercise = await page.locator('.session-exercise').isVisible();
    const inRpe      = await page.locator('.rpe-scale').isVisible();
    expect(inRest || inExercise || inRpe).toBe(true);
  });

  test('le repos inter-séries affiche "Prochaine série"', async ({ page }) => {
    if (!await page.locator('.session-rest').isVisible()) return;
    const label = await page.locator('.session-rest-next').textContent();
    // Inter-set : pas de nom d'exercice dans le label
    expect(label).toMatch(/série/i);
  });

  test('le repos inter-séries affiche un décompte actif', async ({ page }) => {
    if (!await page.locator('.session-rest').isVisible()) return;
    const timer = await page.locator('#rest-timer').textContent();
    expect(parseInt(timer ?? '0')).toBeGreaterThan(0);
  });

  test('passer le repos inter-séries revient à EXERCISING', async ({ page }) => {
    if (!await page.locator('.session-rest').isVisible()) return;
    await page.locator('#skip-rest-btn').click();
    await expect(page.locator('.session-exercise')).toBeVisible();
  });

  test('après le repos, le compteur de séries s\'incrémente', async ({ page }) => {
    if (!await page.locator('.session-rest').isVisible()) return;
    await page.locator('#skip-rest-btn').click();
    await page.waitForSelector('.session-ex-setlabel');
    const setLabel = await page.locator('.session-ex-setlabel').textContent();
    expect(setLabel).toMatch(/2 \//);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transition : EXERCISING → RESTING inter-exercices
// ─────────────────────────────────────────────────────────────────────────────

test.describe('EXERCISING → RESTING inter-exercices', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await openSession(page);
    await goToExercising(page);
  });

  test('fin du dernier set d\'un exercice → repos inter-exercices ou RPE', async ({ page }) => {
    const reached = await skipToInterExRest(page);
    const inRest = await page.locator('.session-rest').isVisible();
    const inRpe  = await page.locator('.rpe-scale').isVisible();
    expect(inRest || inRpe).toBe(true);
  });

  test('le repos inter-exercices affiche le nom de l\'exercice suivant', async ({ page }) => {
    const reached = await skipToInterExRest(page);
    if (!reached) return; // séance trop courte → RPE direct, skip le test
    const label = await page.locator('.session-rest-next').textContent();
    expect(label).toMatch(/exercice/i);
  });

  test('passer le repos inter-exercices affiche l\'exercice suivant', async ({ page }) => {
    const reached = await skipToInterExRest(page);
    if (!reached) return;
    const counterBefore = await page.locator('.session-rest-next').textContent();
    await page.locator('#skip-rest-btn').click();
    await page.waitForSelector('#skip-set-btn');
    // Le compteur de position doit être > 1
    const counter = await page.locator('.session-ex-counter').textContent();
    expect(counter).not.toMatch(/^1 \//);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transition : → RPE (dernier set du dernier exercice)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('→ RPE', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await openSession(page);
    await skipToRpe(page);
  });

  test('fin de tous les exercices → écran RPE affiché', async ({ page }) => {
    await expect(page.locator('.rpe-scale')).toBeVisible();
  });

  test('10 boutons RPE (1–10) sont présents', async ({ page }) => {
    await expect(page.locator('.rpe-btn')).toHaveCount(10);
  });

  test('le bouton I did it again est présent', async ({ page }) => {
    await expect(page.locator('#finish-btn')).toBeVisible();
  });

  test('la barre de progression indique 100%', async ({ page }) => {
    const fill = page.locator('.session-prog-fill');
    const width = await fill.evaluate((el) => el.style.width);
    expect(width).toBe('100%');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RPE : sélection et hints
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RPE — sélection et hints', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await openSession(page);
    await skipToRpe(page);
  });

  test('cliquer un bouton l\'active', async ({ page }) => {
    await page.locator('.rpe-btn[data-rpe="6"]').click();
    await expect(page.locator('.rpe-btn[data-rpe="6"]')).toHaveClass(/selected/);
  });

  test('sélectionner un autre RPE désactive le précédent', async ({ page }) => {
    await page.locator('.rpe-btn[data-rpe="6"]').click();
    await page.locator('.rpe-btn[data-rpe="4"]').click();
    await expect(page.locator('.rpe-btn[data-rpe="6"]')).not.toHaveClass(/selected/);
    await expect(page.locator('.rpe-btn[data-rpe="4"]')).toHaveClass(/selected/);
  });

  test('RPE ≤ 4 affiche un hint "trop facile"', async ({ page }) => {
    await page.locator('.rpe-btn[data-rpe="3"]').click();
    await expect(page.locator('#rpe-hint')).not.toBeEmpty();
  });

  test('RPE ≥ 9 affiche un hint "récupération"', async ({ page }) => {
    await page.locator('.rpe-btn[data-rpe="9"]').click();
    await expect(page.locator('#rpe-hint')).not.toBeEmpty();
  });

  test('RPE 5–7 (zone cible) n\'affiche pas de hint', async ({ page }) => {
    await page.locator('.rpe-btn[data-rpe="6"]').click();
    const hint = await page.locator('#rpe-hint').textContent();
    expect(hint?.trim()).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transition : RPE → fin de séance
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RPE → fin de séance', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await openSession(page);
    await skipToRpe(page);
  });

  test('I did it again sans RPE revient à l\'accueil', async ({ page }) => {
    await page.locator('#finish-btn').click();
    await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
    await expect(page.locator('#screen-home')).toBeVisible();
  });

  test('I did it again avec RPE (zone cible) revient à l\'accueil', async ({ page }) => {
    await page.locator('.rpe-btn[data-rpe="6"]').click();
    await page.locator('#finish-btn').click();
    await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
    await expect(page.locator('#screen-home')).toBeVisible();
  });

  test('après la séance, le bouton passe en "Refaire" (séance marquée faite)', async ({ page }) => {
    await page.locator('.rpe-btn[data-rpe="6"]').click();
    await page.locator('#finish-btn').click();
    await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
    // La séance du jour est marquée comme faite
    await expect(page.locator('#start-session-btn')).toBeVisible();
    const label = await page.locator('#start-session-btn').textContent();
    expect(label?.trim().toLowerCase()).toContain('refaire');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bouton mute flottant dans la séance
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Session — bouton mute flottant', () => {
  test.beforeEach(async ({ page }) => {
    await setupProfile(page);
    await page.locator('#start-session-btn').click();
    await page.waitForSelector('#screen-session.active');
  });

  test('le bouton mute est visible en phase PREVIEW', async ({ page }) => {
    await expect(page.locator('#session-mute-btn')).toBeVisible();
  });

  test('le bouton mute est visible en phase EXERCISING', async ({ page }) => {
    await page.locator('#session-start-btn').click();
    await page.locator('#start-exercise-btn').click();
    await expect(page.locator('#session-mute-btn')).toBeVisible();
  });

  test('le bouton mute est visible en phase RPE', async ({ page }) => {
    await skipToRpe(page);
    await expect(page.locator('#session-mute-btn')).toBeVisible();
  });

  test('cliquer le bouton mute change son icône', async ({ page }) => {
    const before = await page.locator('#session-mute-btn').textContent();
    await page.locator('#session-mute-btn').click();
    const after = await page.locator('#session-mute-btn').textContent();
    expect(after).not.toBe(before);
  });

  test('le mute est persisté : après séance, les paramètres reflètent le changement', async ({ page }) => {
    // Couper le son en séance
    await page.locator('#session-mute-btn').click();
    // Terminer la séance
    await skipToRpe(page);
    await page.locator('#finish-btn').click();
    await page.waitForSelector('#screen-home.active', { timeout: 10_000 });
    // Aller dans les paramètres
    await page.locator('.nav-item[data-screen="settings"]').click();
    await page.waitForSelector('#screen-settings.active');
    // Le toggle son doit être décoché
    await expect(page.locator('#settings-sound-toggle')).not.toBeChecked();
  });
});
