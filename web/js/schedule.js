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
 * @param {object} profile — doit avoir `workout_days: number[]`
 * @returns {boolean}
 */
export function isWorkoutDay(date, profile) {
  const mon0 = (date.getDay() + 6) % 7; // JS: 0=Dim → Mon=0 … Sun=6
  if (profile.workout_days?.length > 0) {
    return profile.workout_days.includes(mon0);
  }
  // Fallback : vieux profil sans workout_days → pattern par sessions_per_week
  const pattern = WORKOUT_PATTERNS[profile.sessions_per_week] ?? WORKOUT_PATTERNS[3];
  return pattern.includes(mon0);
}
