/**
 * history.js — Écran historique des séances
 */
import { t } from '../i18n.js';

/**
 * @param {HTMLElement} container - #history-main
 * @param {{ sessions: object[], exercises: object[], lang: string }} opts
 */
export function renderHistory(container, { sessions, exercises, lang }) {
  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state animate-in">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-title">${t('history.empty_title')}</div>
        <div class="empty-state-desc">${t('history.empty_desc')}</div>
      </div>`;
    return;
  }

  const items = sessions.map((session) => {
    const date = new Date(session.date + 'T12:00:00');
    const dateStr = date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    const completedCount = session.completed_exercise_ids?.length ?? 0;
    const totalCount = session.plan?.exercises?.length ?? 0;
    const mins = session.duration_actual_s ? Math.round(session.duration_actual_s / 60) : null;
    const done = totalCount > 0 && completedCount >= totalCount;

    return `
      <div class="history-item animate-in">
        <div class="history-item-header">
          <div class="history-item-date">${capitalise(dateStr)}</div>
          ${done ? `<span class="history-done-badge">✓</span>` : ''}
        </div>
        <div class="history-item-meta">
          <span class="session-badge">🏋 ${completedCount}/${totalCount}</span>
          ${mins ? `<span class="session-badge">⏱ ${mins} min</span>` : ''}
          ${session.rpe ? `<span class="session-badge">RPE ${session.rpe}/10</span>` : ''}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="history-list">${items}</div>`;
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
