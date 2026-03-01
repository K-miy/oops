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
  const summaryHtml = renderSummary(sessions, lang);

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

  container.innerHTML = `${summaryHtml}<div class="history-list">${html}</div>`;
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderSummary(sessions, lang) {
  // Last 8 weeks of session frequency (bar chart)
  const now     = new Date();
  const weeks   = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (7 * (7 - i)));
    const weekStart = d.toISOString().slice(0, 10);
    const d2 = new Date(d);
    d2.setDate(d2.getDate() + 6);
    const weekEnd = d2.toISOString().slice(0, 10);
    return { weekStart, weekEnd, count: 0 };
  });

  for (const s of sessions) {
    const w = weeks.find((w) => s.date >= w.weekStart && s.date <= w.weekEnd);
    if (w) w.count++;
  }

  const maxCount = Math.max(...weeks.map((w) => w.count), 1);

  const bars = weeks.map((w, i) => {
    const pct     = Math.round((w.count / maxCount) * 100);
    const isNow   = i === 7;
    const label   = isNow ? (lang === 'fr' ? 'Sem.' : 'Wk') : '';
    return `
      <div class="history-bar-col" title="${w.count} session${w.count !== 1 ? 's' : ''}">
        <div class="history-bar-wrap">
          <div class="history-bar-fill${isNow ? ' history-bar-now' : ''}" style="height:${pct}%"></div>
        </div>
        <div class="history-bar-label">${w.count > 0 ? w.count : label}</div>
      </div>`;
  }).join('');

  // Stats
  const total    = sessions.length;
  const withRpe  = sessions.filter((s) => s.rpe != null);
  const avgRpe   = withRpe.length
    ? (withRpe.reduce((sum, s) => sum + s.rpe, 0) / withRpe.length).toFixed(1)
    : null;
  const totalMin = Math.round(
    sessions.reduce((sum, s) => sum + (s.duration_actual_s ?? 0), 0) / 60
  );

  const statsHtml = `
    <div class="history-stats">
      <div class="history-stat">
        <div class="history-stat-value">${total}</div>
        <div class="history-stat-label">${lang === 'fr' ? 'séances' : 'sessions'}</div>
      </div>
      ${avgRpe != null ? `
      <div class="history-stat">
        <div class="history-stat-value">${avgRpe}</div>
        <div class="history-stat-label">RPE ${lang === 'fr' ? 'moyen' : 'avg'}</div>
      </div>` : ''}
      ${totalMin > 0 ? `
      <div class="history-stat">
        <div class="history-stat-value">${totalMin}</div>
        <div class="history-stat-label">min ${lang === 'fr' ? 'total' : 'total'}</div>
      </div>` : ''}
    </div>`;

  return `
    <div class="history-summary animate-in">
      <div class="history-chart">${bars}</div>
      ${statsHtml}
    </div>`;
}
