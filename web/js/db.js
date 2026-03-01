/**
 * db.js — Couche de données locale via Dexie.js (IndexedDB)
 * Règle absolue : seul ce fichier est autorisé à toucher à Dexie/IndexedDB.
 */

import Dexie from 'dexie';

const db = new Dexie('oops');

// ── Schéma v1 ──
db.version(1).stores({
  // Profil unique (id = 1 toujours)
  profile:           'id',
  // Séances : triables par date
  sessions:          '++id, date',
  // Logs détaillés par exercice (optionnels, activables dans les settings)
  exercise_logs:     '++id, session_id, exercise_id',
  // Suivi poids (optionnel)
  body_weight_logs:  '++id, date',
  // Paramètres clé/valeur
  settings:          'key',
});

// ════════════════════════ PROFIL ════════════════════════

/** Récupère le profil enregistré, ou null. */
export async function getProfile() {
  return db.profile.get(1) ?? null;
}

/** Sauvegarde (ou met à jour) le profil. */
export async function saveProfile(profile) {
  return db.profile.put({ ...profile, id: 1 });
}

/** Supprime le profil (reset). */
export async function deleteProfile() {
  return db.profile.delete(1);
}

// ════════════════════════ SÉANCES ════════════════════════

/**
 * Enregistre une séance complétée.
 * @param {object} session - { date, plan, completed_exercise_ids, rpe, duration_actual_s }
 */
export async function saveSession(session) {
  return db.sessions.add({ ...session, date: session.date ?? new Date().toISOString().slice(0, 10) });
}

/** Retourne les N dernières séances (triées du plus récent au plus ancien). */
export async function getRecentSessions(limit = 30) {
  return db.sessions.orderBy('date').reverse().limit(limit).toArray();
}

/**
 * Retourne la séance du jour (date ISO YYYY-MM-DD), ou null.
 * @param {string} today - Format "YYYY-MM-DD"
 */
export async function getTodaySession(today) {
  return db.sessions.where('date').equals(today).first() ?? null;
}

/** Calcule le streak actuel (jours consécutifs avec séance). */
export async function getCurrentStreak() {
  const sessions = await db.sessions.orderBy('date').reverse().toArray();
  if (sessions.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let current = today;

  for (const s of sessions) {
    if (s.date === current) {
      streak++;
      // Recule d'un jour
      const d = new Date(current);
      d.setDate(d.getDate() - 1);
      current = d.toISOString().slice(0, 10);
    } else if (s.date < current) {
      // Gap → streak rompu
      break;
    }
  }
  return streak;
}

// ════════════════════════ LOGS DÉTAILLÉS ════════════════════════

/** Enregistre le détail d'un exercice d'une séance. */
export async function saveExerciseLog(log) {
  return db.exercise_logs.add(log);
}

/** Récupère les logs pour une séance donnée. */
export async function getSessionLogs(sessionId) {
  return db.exercise_logs.where('session_id').equals(sessionId).toArray();
}

/**
 * Retourne les statistiques RPE moyennes par exercice.
 * { exercise_id: { avg_rpe: number, count: number } }
 */
export async function getExerciseRpeStats() {
  const logs = await db.exercise_logs.toArray();
  const map = {};
  for (const log of logs) {
    if (log.rpe == null) continue;
    if (!map[log.exercise_id]) map[log.exercise_id] = { sum: 0, count: 0 };
    map[log.exercise_id].sum   += log.rpe;
    map[log.exercise_id].count += 1;
  }
  const result = {};
  for (const [id, { sum, count }] of Object.entries(map)) {
    result[id] = { avg_rpe: sum / count, count };
  }
  return result;
}

// ════════════════════════ POIDS ════════════════════════

/** Enregistre une pesée. */
export async function saveBodyWeight(weightKg) {
  return db.body_weight_logs.add({
    date: new Date().toISOString().slice(0, 10),
    weight_kg: weightKg,
  });
}

/** Retourne l'historique de poids (du plus récent au plus ancien). */
export async function getBodyWeightLogs() {
  return db.body_weight_logs.orderBy('date').reverse().toArray();
}

// ════════════════════════ PARAMÈTRES ════════════════════════

export async function getSetting(key) {
  const row = await db.settings.get(key);
  return row?.value ?? null;
}

export async function setSetting(key, value) {
  return db.settings.put({ key, value });
}

// ════════════════════════ RESET COMPLET ════════════════════════

/** Supprime toutes les données locales. */
export async function resetAll() {
  await db.delete();
}

// ════════════════════════ EXPORT ════════════════════════

/** Exporte toutes les données en un objet JSON sérialisable. */
export async function exportData() {
  const [profile, sessions] = await Promise.all([
    getProfile(),
    db.sessions.orderBy('date').toArray(),
  ]);
  return {
    exported_at:  new Date().toISOString(),
    app_version:  '0.1.0',
    profile,
    sessions,
  };
}

export default db;
