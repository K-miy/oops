/**
 * schedule.js — Logique de planification hebdomadaire
 *
 * Module pur (pas de dépendances navigateur ni WASM) : testable en Node.js.
 */

/** Jours d'entraînement selon fréquence hebdo (Mon=0 … Sun=6). */
export const WORKOUT_PATTERNS = {
  2: [1, 4],           // Mar, Ven
  3: [0, 2, 4],        // Lun, Mer, Ven
  4: [0, 1, 3, 4],     // Lun, Mar, Jeu, Ven
  5: [0, 1, 2, 3, 4],  // Lun → Ven
};

/**
 * Retourne true si la date donnée est un jour d'entraînement.
 * @param {Date} date
 * @param {number} sessionsPerWeek
 * @returns {boolean}
 */
export function isWorkoutDay(date, sessionsPerWeek) {
  const mon0 = (date.getDay() + 6) % 7; // JS: 0=Dim → Mon=0 … Sun=6
  const pattern = WORKOUT_PATTERNS[sessionsPerWeek] ?? WORKOUT_PATTERNS[3];
  return pattern.includes(mon0);
}
