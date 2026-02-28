/**
 * tests/js/schedule.test.mjs
 * Tests unitaires pour isWorkoutDay (Node.js built-in test runner)
 *
 * Exécuter : node --test tests/js/schedule.test.mjs
 *
 * Patterns attendus (Mon=0 … Sun=6) :
 *   2/sem → [1, 4]           Mar, Ven
 *   3/sem → [0, 2, 4]        Lun, Mer, Ven
 *   4/sem → [0, 1, 3, 4]     Lun, Mar, Jeu, Ven
 *   5/sem → [0, 1, 2, 3, 4]  Lun → Ven
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isWorkoutDay } from '../../web/js/schedule.js';

// Dates de référence (semaine du 6–12 jan 2025)
// Constructeur avec composants locaux (pas de string ISO) pour éviter l'ambiguïté UTC.
const MON = new Date(2025, 0, 6);  // lundi   mon0 = 0
const TUE = new Date(2025, 0, 7);  // mardi   mon0 = 1
const WED = new Date(2025, 0, 8);  // mercredi mon0 = 2
const THU = new Date(2025, 0, 9);  // jeudi   mon0 = 3
const FRI = new Date(2025, 0, 10); // vendredi mon0 = 4
const SAT = new Date(2025, 0, 11); // samedi  mon0 = 5
const SUN = new Date(2025, 0, 12); // dimanche mon0 = 6

describe('isWorkoutDay — 2 séances/semaine', () => {
  test('mardi = entraînement',    () => assert.equal(isWorkoutDay(TUE, 2), true));
  test('vendredi = entraînement', () => assert.equal(isWorkoutDay(FRI, 2), true));
  test('lundi = repos',           () => assert.equal(isWorkoutDay(MON, 2), false));
  test('mercredi = repos',        () => assert.equal(isWorkoutDay(WED, 2), false));
  test('jeudi = repos',           () => assert.equal(isWorkoutDay(THU, 2), false));
  test('samedi = repos',          () => assert.equal(isWorkoutDay(SAT, 2), false));
  test('dimanche = repos',        () => assert.equal(isWorkoutDay(SUN, 2), false));
});

describe('isWorkoutDay — 3 séances/semaine', () => {
  test('lundi = entraînement',    () => assert.equal(isWorkoutDay(MON, 3), true));
  test('mercredi = entraînement', () => assert.equal(isWorkoutDay(WED, 3), true));
  test('vendredi = entraînement', () => assert.equal(isWorkoutDay(FRI, 3), true));
  test('mardi = repos',           () => assert.equal(isWorkoutDay(TUE, 3), false));
  test('jeudi = repos',           () => assert.equal(isWorkoutDay(THU, 3), false));
  test('samedi = repos',          () => assert.equal(isWorkoutDay(SAT, 3), false));
  test('dimanche = repos',        () => assert.equal(isWorkoutDay(SUN, 3), false));
});

describe('isWorkoutDay — 4 séances/semaine', () => {
  test('lundi = entraînement',    () => assert.equal(isWorkoutDay(MON, 4), true));
  test('mardi = entraînement',    () => assert.equal(isWorkoutDay(TUE, 4), true));
  test('jeudi = entraînement',    () => assert.equal(isWorkoutDay(THU, 4), true));
  test('vendredi = entraînement', () => assert.equal(isWorkoutDay(FRI, 4), true));
  test('mercredi = repos',        () => assert.equal(isWorkoutDay(WED, 4), false));
  test('samedi = repos',          () => assert.equal(isWorkoutDay(SAT, 4), false));
  test('dimanche = repos',        () => assert.equal(isWorkoutDay(SUN, 4), false));
});

describe('isWorkoutDay — 5 séances/semaine', () => {
  test('lundi = entraînement',    () => assert.equal(isWorkoutDay(MON, 5), true));
  test('mardi = entraînement',    () => assert.equal(isWorkoutDay(TUE, 5), true));
  test('mercredi = entraînement', () => assert.equal(isWorkoutDay(WED, 5), true));
  test('jeudi = entraînement',    () => assert.equal(isWorkoutDay(THU, 5), true));
  test('vendredi = entraînement', () => assert.equal(isWorkoutDay(FRI, 5), true));
  test('samedi = repos',          () => assert.equal(isWorkoutDay(SAT, 5), false));
  test('dimanche = repos',        () => assert.equal(isWorkoutDay(SUN, 5), false));
});

describe('isWorkoutDay — valeur inconnue → fallback 3/sem', () => {
  test('6/sem → fallback 3 : lundi = entraînement', () => assert.equal(isWorkoutDay(MON, 6), true));
  test('1/sem → fallback 3 : lundi = entraînement', () => assert.equal(isWorkoutDay(MON, 1), true));
  test('0/sem → fallback 3 : samedi = repos',        () => assert.equal(isWorkoutDay(SAT, 0), false));
});
