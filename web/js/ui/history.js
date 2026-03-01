/**
 * history.js — Écran historique des séances
 */
import { t } from '../i18n.js';

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

  const exerciseMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';

  // Grouper par mois (YYYY-MM)
  const byMonth = new Map();
  for (const session of sessions) {
    const monthKey = session.date.slice(0, 7);
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
    byMonth.get(monthKey).push(session);
  }

  const html = [...byMonth.entries()].map(([monthKey, monthSessions]) => {
    const monthDate  = new Date(monthKey + '-15T12:00:00');
    const monthLabel = capitalise(monthDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' }));
    const count      = monthSessions.length;
    const countLabel = lang === 'fr'
      ? `${count} séance${count > 1 ? 's' : ''}`
      : `${count} session${count > 1 ? 's' : ''}`;

    const items = monthSessions.map((session) => {
      const date    = new Date(session.date + 'T12:00:00');
      const dateStr = capitalise(date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' }));

      const completedIds = session.completed_exercise_ids ?? [];
      const totalCount   = session.plan?.exercises?.length ?? 0;
      const mins         = session.duration_actual_s ? Math.round(session.duration_actual_s / 60) : null;

      // Noms des exercices complétés (max 3 + surplus)
      const names  = completedIds.map((id) => {
        const info = exerciseMap[id];
        return info ? (lang === 'fr' ? info.name_fr : info.name_en) : null;
      }).filter(Boolean);
      const shown  = names.slice(0, 3);
      const hidden = names.length - shown.length;
      const exLine = shown.join(', ') + (hidden > 0 ? ` +${hidden}` : '');

      // RPE coloré selon zone
      const rpe      = session.rpe;
      const rpeClass = rpe == null ? '' : rpe <= 4 ? 'rpe-badge-easy' : rpe <= 7 ? 'rpe-badge-target' : 'rpe-badge-hard';

      return `
        <div class="history-item animate-in">
          <div class="history-item-header">
            <div class="history-item-date">${dateStr}</div>
            <div class="history-item-badges">
              ${mins != null ? `<span class="session-badge">⏱ ${mins} min</span>` : ''}
              ${rpe != null ? `<span class="session-badge ${rpeClass}">RPE ${rpe}</span>` : ''}
            </div>
          </div>
          ${exLine ? `<div class="history-item-exercises">${exLine}</div>` : ''}
          <div class="history-item-footer">${completedIds.length}${totalCount ? `/${totalCount}` : ''} ex.</div>
        </div>`;
    }).join('');

    return `
      <div class="history-month">
        <div class="history-month-label animate-in">${monthLabel} · ${countLabel}</div>
        ${items}
      </div>`;
  }).join('');

  container.innerHTML = `<div class="history-list">${html}</div>`;
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
