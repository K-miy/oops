/**
 * home.js — Écran d'accueil : séance du jour + streak
 */
import { t } from '../i18n.js';

/**
 * @param {HTMLElement} container - #home-main
 * @param {{
 *   profile: object,
 *   plan: object,          // SessionPlan { exercises: [] }
 *   todaySession: object|null,
 *   streak: number,
 *   lang: string,
 *   exercises: object[],   // catalogue complet
 *   onStartSession: () => void,
 *   onOpenSettings: () => void,
 * }} opts
 */
export function renderHome(container, { profile, plan, todaySession, streak, lang, exercises, onStartSession }) {
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
    <div class="home-greeting animate-in">${greeting(lang)}, ${profile.sex === 'other' ? '' : ''} 💪</div>
    <div class="home-date animate-in">${capitalise(dateStr)}</div>

    ${plan && plan.exercises.length > 0 ? `
    <div class="session-card animate-in">
      <div class="session-card-title">${t('home.today')}</div>
      <div class="session-meta">
        <span class="session-badge">⏱ ${totalMins} min</span>
        <span class="session-badge">🏋 ${plan.exercises.length} exercices</span>
        ${alreadyDone ? `<span class="session-badge" style="background:var(--color-success);color:#fff">✓ ${t('home.done')}</span>` : ''}
      </div>
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
      <div class="empty-state-desc">${t('home.rest_day_desc')}</div>
    </div>
    `}

    <div class="streak-card animate-in" style="margin-top:16px">
      <div class="streak-number">${streak}</div>
      <div>
        <div style="font-weight:600">${t('home.streak')}</div>
        <div class="streak-label">${streak === 1 ? t('home.streak_day') : t('home.streak_days')}</div>
      </div>
    </div>
  `;

  container.querySelector('#start-session-btn')?.addEventListener('click', onStartSession);
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
