/**
 * session.js — Déroulement d'une séance d'entraînement
 *
 * Affiche les exercices un à un, permet de les marquer comme faits,
 * et propose une évaluation RPE en fin de séance.
 */
import { t } from '../i18n.js';

/**
 * @param {HTMLElement} container - #screen-session
 * @param {{
 *   plan: object,               // SessionPlan
 *   exercises: object[],        // catalogue
 *   lang: string,
 *   onComplete: (result: object) => void,
 *   onAbort: () => void,
 * }} opts
 */
export function renderSession(container, { plan, exercises, lang, onComplete, onAbort }) {
  const $main   = container.querySelector('#session-main');
  const $footer = container.querySelector('#session-footer');
  const $progress = container.querySelector('#session-progress');

  const exerciseMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const completed   = new Set();
  const startTime   = Date.now();

  function updateProgress() {
    $progress.textContent = `${completed.size} / ${plan.exercises.length}`;
    $progress.setAttribute('aria-label', `${completed.size} exercices terminés sur ${plan.exercises.length}`);
  }

  function renderExerciseList() {
    $main.innerHTML = plan.exercises.map((ex, idx) => {
      const info = exerciseMap[ex.exercise_id];
      const name = info
        ? (lang === 'fr' ? info.name_fr : info.name_en)
        : ex.exercise_id;
      const instructions = info
        ? (lang === 'fr' ? info.instructions_fr : info.instructions_en)
        : '';
      const category = info ? categoryLabel(info.category, lang) : '';
      const isDone = completed.has(ex.exercise_id);

      const specReps = ex.reps
        ? `${ex.sets} × ${ex.reps} reps`
        : `${ex.sets} × ${ex.duration_s}s`;
      const rest = ex.rest_s ? `${t('session.rest')} ${ex.rest_s}s` : '';

      return `
        <div class="exercise-card${isDone ? ' done' : ''} animate-in" data-id="${ex.exercise_id}" data-idx="${idx}">
          <div class="exercise-card-header">
            <span class="exercise-name">${name}</span>
            <span class="exercise-category-badge">${category}</span>
          </div>
          <div class="exercise-specs">
            <span class="exercise-spec">${specReps}</span>
            ${rest ? `<span class="exercise-spec">${rest}</span>` : ''}
          </div>
          ${instructions ? `<div class="exercise-instructions">${instructions}</div>` : ''}
          ${!isDone ? `
            <button class="btn btn-primary exercise-done-btn mt-8" data-id="${ex.exercise_id}">
              ✓ ${t('session.done')}
            </button>` : ''}
        </div>`;
    }).join('');

    // Boutons "Terminé" par exercice
    $main.querySelectorAll('.exercise-done-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        completed.add(id);
        updateProgress();
        renderExerciseList();
        renderFooter();

        // Scroll vers l'exercice suivant
        const allCards = [...$main.querySelectorAll('.exercise-card')];
        const nextCard = allCards.find((c) => !c.classList.contains('done'));
        if (nextCard) {
          nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    updateProgress();
  }

  function renderFooter() {
    const allDone = completed.size >= plan.exercises.length;

    $footer.innerHTML = allDone
      ? `<button class="btn btn-accent" id="finish-session-btn">I did it again</button>`
      : `<button class="btn btn-ghost" id="skip-session-btn" style="margin-top:0">${t('session.skip_rest')}</button>`;

    $footer.querySelector('#finish-session-btn')?.addEventListener('click', () => {
      renderRpeScreen();
    });
  }

  function renderRpeScreen() {
    $main.innerHTML = `
      <div class="rpe-container animate-in">
        <div class="rpe-title">${t('session.rpe_prompt')}</div>
        <div class="rpe-subtitle">${t('session.rpe_subtitle')}</div>
        <div class="rpe-scale">
          ${Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `
            <button class="rpe-btn" data-rpe="${n}" aria-label="RPE ${n}">${n}</button>
          `).join('')}
        </div>
        <div id="rpe-labels" style="display:flex;justify-content:space-between;margin-top:8px;font-size:.75rem;color:var(--color-text-muted)">
          <span>${t('session.rpe_easy')}</span>
          <span>${t('session.rpe_hard')}</span>
        </div>
      </div>`;

    $footer.innerHTML = `<button class="btn btn-ghost" id="skip-rpe-btn">${t('session.skip_rpe')}</button>`;

    let selectedRpe = null;

    $main.querySelectorAll('.rpe-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $main.querySelectorAll('.rpe-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedRpe = parseInt(btn.dataset.rpe, 10);
        // Auto-valide après sélection RPE
        setTimeout(() => finishSession(selectedRpe), 400);
      });
    });

    $footer.querySelector('#skip-rpe-btn').addEventListener('click', () => {
      finishSession(null);
    });
  }

  function finishSession(rpe) {
    const duration_actual_s = Math.round((Date.now() - startTime) / 1000);
    onComplete({
      completed_exercise_ids: [...completed],
      rpe,
      duration_actual_s,
    });
  }

  // ── Init ──
  renderExerciseList();
  renderFooter();
}

function categoryLabel(category, lang) {
  const labels = {
    fr: { push: 'Poussée', squat: 'Squat', hinge: 'Charnière', core: 'Gainage', mobility: 'Mobilité' },
    en: { push: 'Push', squat: 'Squat', hinge: 'Hinge', core: 'Core', mobility: 'Mobility' },
  };
  return labels[lang]?.[category] ?? category;
}
