/**
 * db.js — Couche de données locale via Dexie.js (IndexedDB)
 * Règle absolue : seul ce fichier est autorisé à toucher à Dexie/IndexedDB.
 */

import Dexie from 'dexie';
import { APP_VERSION } from './version.js';

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

// ════════════════════════ PARAMÈTRES ════════════════════════

export async function getSetting(key) {
  const row = await db.settings.get(key);
  return row?.value ?? null;
}

export async function setSetting(key, value) {
  return db.settings.put({ key, value });
}

// ════════════════════════ RESET COMPLET ════════════════════════

/** Supprime toutes les données locales (vide les tables sans supprimer la DB). */
export async function resetAll() {
  await Promise.all([
    db.profile.clear(),
    db.sessions.clear(),
    db.exercise_logs.clear(),
    db.body_weight_logs.clear(),
    db.settings.clear(),
  ]);
}

// ════════════════════════ EXPORT ════════════════════════

/** Exporte toutes les données en un objet JSON sérialisable. */
export async function exportData() {
  const [profile, sessions, exercise_logs] = await Promise.all([
    getProfile(),
    db.sessions.orderBy('date').toArray(),
    db.exercise_logs.toArray(),
  ]);
  return {
    exported_at:   new Date().toISOString(),
    app_version:   APP_VERSION,
    profile,
    sessions,
    exercise_logs,
  };
}

/**
 * Importe une sauvegarde JSON (produite par exportData).
 * Réinitialise toutes les données avant l'import.
 */
export async function importData(data) {
  if (!data || typeof data !== 'object') throw new Error('Format invalide');
  await resetAll();
  if (data.profile)  await saveProfile({ ...data.profile, id: 1 });
  if (Array.isArray(data.sessions)) {
    for (const session of data.sessions) {
      const { id, ...rest } = session;
      await db.sessions.add(rest);
    }
  }
  if (Array.isArray(data.exercise_logs)) {
    for (const log of data.exercise_logs) {
      const { id, ...rest } = log;
      await db.exercise_logs.add(rest);
    }
  }
}

export default db;
