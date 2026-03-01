/**
 * history.js — Écran historique des séances
 */
import { t } from '../i18n.js';

export function renderHistory(container, { sessions, lang }) {
  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state animate-in">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-title">${t('history.empty_title')}</div>
        <div class="empty-state-desc">${t('history.empty_desc')}</div>
      </div>`;
    return;
  }

  container.innerHTML = renderCharts(sessions, lang);
}

function renderCharts(sessions, lang) {
  // ── Buckets 8 semaines ──────────────────────────────────────────────────
  const now   = new Date();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 7 * (7 - i));
    const weekStart = d.toISOString().slice(0, 10);
    const d2 = new Date(d);
    d2.setDate(d2.getDate() + 6);
    const weekEnd = d2.toISOString().slice(0, 10);
    return { weekStart, weekEnd, count: 0, rpes: [], mins: [] };
  });

  for (const s of sessions) {
    const w = weeks.find((w) => s.date >= w.weekStart && s.date <= w.weekEnd);
    if (!w) continue;
    w.count++;
    if (s.rpe != null) w.rpes.push(s.rpe);
    if (s.duration_actual_s) w.mins.push(Math.round(s.duration_actual_s / 60));
  }

  // ── Stats globales ──────────────────────────────────────────────────────
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

  // ── Histogramme fréquence (7 semaines complètes — exclut la semaine en cours) ──
  const pastWeeks = weeks.slice(0, 7);
  const maxCount  = Math.max(...pastWeeks.map((w) => w.count), 1);
  const freqBars  = pastWeeks.map((w) => {
    const pct = Math.round((w.count / maxCount) * 100);
    return `
      <div class="history-bar-col" title="${w.count} session${w.count !== 1 ? 's' : ''}">
        <div class="history-bar-wrap">
          <div class="history-bar-fill" style="height:${pct}%"></div>
        </div>
        <div class="history-bar-label">${w.count > 0 ? w.count : ''}</div>
      </div>`;
  }).join('');

  const freqHtml = `
    <div class="history-section-title">${lang === 'fr' ? 'Séances / semaine' : 'Sessions / week'}</div>
    <div class="history-chart">${freqBars}</div>`;

  // ── Scatter RPE ─────────────────────────────────────────────────────────
  const rpeHtml = weeks.some((w) => w.rpes.length > 0)
    ? `<div class="history-section-title">RPE</div>
       <div class="history-rpe-wrap">${scatterSvg(weeks, {
          getValues: (w) => w.rpes,
          yMin: 1, yMax: 10,
          yTickLabels: [1, 5, 10],
          dotColor: (v) => v <= 4 ? '#aaa' : v <= 7 ? '#2D6A4F' : '#F4A261',
          zoneMin: 5, zoneMax: 7,
        })}</div>`
    : '';

  // ── Scatter durée ────────────────────────────────────────────────────────
  const allMins = weeks.flatMap((w) => w.mins);
  const maxMins = Math.max(...allMins, 1);
  const durHtml = allMins.length > 0
    ? `<div class="history-section-title">${lang === 'fr' ? 'Durée / séance (min)' : 'Duration / session (min)'}</div>
       <div class="history-rpe-wrap">${scatterSvg(weeks, {
          getValues: (w) => w.mins,
          yMin: 0, yMax: maxMins,
          yTickLabels: [0, Math.round(maxMins / 2), maxMins],
          dotColor: () => '#2D6A4F',
        })}</div>`
    : '';

  return `
    <div class="history-summary animate-in">
      ${statsHtml}
      ${freqHtml}
      ${rpeHtml}
      ${durHtml}
    </div>`;
}

/**
 * SVG scatter plot réutilisable — scatter + ligne des moyennes hebdo.
 * @param {Array}  weeks       — buckets semaine
 * @param {{
 *   getValues:    (w) => number[],
 *   yMin:         number,
 *   yMax:         number,
 *   yTickLabels:  number[],
 *   dotColor:     (v: number) => string,
 *   zoneMin?:     number,
 *   zoneMax?:     number,
 * }} cfg
 */
function scatterSvg(weeks, cfg) {
  const { getValues, yMin, yMax, yTickLabels, dotColor, zoneMin, zoneMax } = cfg;
  const W = 280, H = 120, padY = 8;
  const chartH = H - padY * 2;
  const colW   = W / 8;

  const xCenter = (i) => i * colW + colW / 2;
  const yPos    = (v) => padY + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  // Zone optionnelle
  const zoneEl = (zoneMin != null && zoneMax != null)
    ? `<rect x="0" y="${yPos(zoneMax).toFixed(1)}" width="${W}" height="${(yPos(zoneMin) - yPos(zoneMax)).toFixed(1)}" fill="#A3BFA8" opacity="0.25"/>`
    : '';

  // Scatter dots
  const dots = weeks.flatMap((w, i) =>
    getValues(w).map((v) =>
      `<circle cx="${xCenter(i).toFixed(1)}" cy="${yPos(v).toFixed(1)}" r="4" fill="${dotColor(v)}" opacity="0.65"/>`
    )
  ).join('');

  // Moyenne par semaine + polyline
  const avgPts = weeks.map((w, i) => {
    const vals = getValues(w);
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { x: xCenter(i), y: yPos(avg) };
  }).filter(Boolean);

  let lineEl = '';
  if (avgPts.length >= 2) {
    const pts = avgPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    lineEl = `<polyline points="${pts}" fill="none" stroke="#2D6A4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const avgDots = avgPts.map((p) =>
    `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#2D6A4F"/>`
  ).join('');

  // Labels axe Y
  const yLabels = yTickLabels.map((v) =>
    `<text x="-3" y="${yPos(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="8" fill="#999">${v}</text>`
  ).join('');

  return `<svg viewBox="-18 0 ${W + 18} ${H}" class="history-rpe-svg" aria-hidden="true">
    ${zoneEl}${dots}${lineEl}${avgDots}${yLabels}
  </svg>`;
}
