/**
 * home.js — Écran d'accueil : séance du jour + aperçu semaine + streak
 */
import { t, tRandom } from '../i18n.js';

/**
 * @param {HTMLElement} container - #home-main
 * @param {{
 *   profile: object,
 *   plan: object|null,        // SessionPlan { exercises: [] } ou null (jour de repos)
 *   todaySession: object|null,
 *   streak: number,
 *   lang: string,
 *   exercises: object[],      // catalogue complet
 *   weekPreview: object[],    // 7 jours [{ date, isWorkout, plan }]
 *   onStartSession: () => void,
 *   onOpenSettings: () => void,
 * }} opts
 */
export function renderHome(container, { profile, plan, todaySession, streak, lang, exercises, weekPreview, onStartSession }) {
  const exerciseMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const alreadyDone = !!todaySession;
  const today = new Date();
  const dateStr = today.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  const totalMins = plan
    ? Math.round(plan.exercises.reduce((sum, ex) => sum + estimateDuration(ex), 0) / 60)
    : 0;

  const exercisePreviews = plan?.exercises
    .slice(0, 4)
    .map((ex) => {
      const info = exerciseMap[ex.exercise_id];
      const name = info ? (lang === 'fr' ? info.name_fr : info.name_en) : ex.exercise_id;
      return `<div class="exercise-preview animate-in">
        <span class="exercise-preview-dot"></span>
        <span>${name} — ${ex.sets}×${ex.reps ?? Math.round(ex.duration_s / 3)}${ex.reps ? ' reps' : 's'}</span>
      </div>`;
    })
    .join('') ?? '';

  const moreCount = (plan?.exercises.length ?? 0) - 4;

  container.innerHTML = `
    <div class="home-greeting animate-in">${greeting(lang)}, 💪</div>
    <div class="home-date animate-in">${capitalise(dateStr)}</div>

    ${plan && plan.exercises.length > 0 ? `
    <div class="session-card animate-in">
      <div class="session-card-title">${t('home.today')}</div>
      <div class="session-meta">
        <span class="session-badge">⏱ ${totalMins} min</span>
        <span class="session-badge">🏋 ${plan.exercises.length} exercices</span>
        ${alreadyDone ? `<span class="session-badge" style="background:var(--color-success-soft);color:#1A1A1A">✓ ${t('home.done')}</span>` : ''}
      </div>
      ${alreadyDone ? `
        <div class="post-session-message animate-in">${tRandom('home.post_session_messages')}</div>
      ` : ''}
      <div class="exercise-preview-list">
        ${exercisePreviews}
        ${moreCount > 0 ? `<div class="exercise-preview" style="color:var(--color-text-muted)">+${moreCount} ${t('home.more_exercises')}</div>` : ''}
      </div>
      ${!alreadyDone ? `
        <button class="btn btn-accent" id="start-session-btn">${t('home.start')}</button>
      ` : `
        <button class="btn btn-ghost" id="start-session-btn">${t('home.redo')}</button>
      `}
    </div>
    ` : `
    <div class="empty-state animate-in">
      <div class="empty-state-icon">🛋️</div>
      <div class="empty-state-title">${t('home.rest_day')}</div>
      <div class="empty-state-desc">${tRandom('home.rest_day_messages')}</div>
    </div>
    `}

    <div class="streak-card animate-in" style="margin-top:16px">
      <div class="streak-number">${streak}</div>
      <div>
        <div style="font-weight:600">${t('home.streak')}</div>
        <div class="streak-label">${streak === 1 ? t('home.streak_day') : t('home.streak_days')}</div>
      </div>
    </div>

    ${weekPreview?.length ? renderWeekPreview(weekPreview, lang) : ''}
  `;

  container.querySelector('#start-session-btn')?.addEventListener('click', onStartSession);

  // Détails exercices dans l'aperçu semaine
  container.querySelectorAll('.day-card[data-day-idx]').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.dayIdx, 10);
      const entry = weekPreview[idx];
      const detail = container.querySelector('#week-day-detail');
      if (!detail) return;

      // Fermer si déjà ouvert
      if (detail.dataset.openIdx === String(idx)) {
        detail.innerHTML = '';
        detail.dataset.openIdx = '';
        card.classList.remove('day-card-selected');
        return;
      }

      container.querySelectorAll('.day-card').forEach((c) => c.classList.remove('day-card-selected'));
      card.classList.add('day-card-selected');
      detail.dataset.openIdx = String(idx);

      if (!entry.isWorkout || !entry.plan?.exercises?.length) {
        detail.innerHTML = `<div class="week-detail animate-in" style="color:var(--color-text-muted);padding:8px 0">${tRandom('home.rest_day_messages')}</div>`;
        return;
      }

      const dayName = entry.date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
      const rows = entry.plan.exercises.map((ex) => {
        const info = exerciseMap[ex.exercise_id];
        const name = info ? (lang === 'fr' ? info.name_fr : info.name_en) : ex.exercise_id;
        const spec = ex.reps ? `${ex.sets}×${ex.reps} reps` : `${ex.sets}×${ex.duration_s}s`;
        return `<div class="exercise-preview animate-in">
          <span class="exercise-preview-dot"></span>
          <span>${name} — ${spec}</span>
        </div>`;
      }).join('');

      detail.innerHTML = `
        <div class="week-detail animate-in">
          <div class="week-detail-title">${capitalise(dayName)}</div>
          ${rows}
        </div>`;
    });
  });
}

function renderWeekPreview(weekPreview, lang) {
  const days = weekPreview.map((entry, i) => {
    const dayName = entry.date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short' });
    const isToday = i === 0;
    const exCount = entry.plan?.exercises?.length ?? 0;
    const todayClass = isToday ? ' day-card-today' : '';

    if (entry.isWorkout) {
      return `
        <div class="day-card${todayClass}" data-day-idx="${i}" style="cursor:pointer">
          <div class="day-card-name">${dayName}</div>
          <div class="day-card-icon">💪</div>
          <div class="day-card-count">${exCount} ex</div>
        </div>`;
    }
    return `
      <div class="day-card day-card-rest${todayClass}" data-day-idx="${i}" style="cursor:pointer">
        <div class="day-card-name">${dayName}</div>
        <div class="day-card-icon">🛋️</div>
        <div class="day-card-count">${t('home.rest_short')}</div>
      </div>`;
  }).join('');

  return `
    <div class="week-preview animate-in">
      <div class="week-preview-title">${t('home.week')}</div>
      <div class="week-scroll">${days}</div>
      <div id="week-day-detail" data-open-idx=""></div>
    </div>`;
}

function greeting(lang) {
  const h = new Date().getHours();
  if (lang === 'fr') {
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bonne après-midi';
    return 'Bonsoir';
  } else {
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function estimateDuration(ex) {
  const workPerSet = ex.duration_s ?? (ex.reps ?? 10) * 3;
  const totalWork  = workPerSet * ex.sets;
  const totalRest  = ex.rest_s * Math.max(0, ex.sets - 1);
  return totalWork + totalRest;
}
