/**
 * session.js — Déroulement guidé d'une séance
 *
 * Machine à états : PREVIEW → EXERCISING ↔ RESTING → RPE
 *
 * PREVIEW    : liste des exercices, skip individuel possible avant départ
 * EXERCISING : chrono automatique (reps × 3s ou duration_s), une série à la fois
 * RESTING    : décompte inter-séries ou inter-exercices, auto-avance
 * RPE        : évaluation de l'effort + gros bouton "I did it again"
 */
import { t } from '../i18n.js';

/**
 * @param {HTMLElement} container - #screen-session
 * @param {{
 *   plan: object,
 *   exercises: object[],
 *   lang: string,
 *   onComplete: (result: object) => void,
 *   onAbort: () => void,
 * }} opts
 */
export function renderSession(container, { plan, exercises, lang, onComplete }) {
  const $main     = container.querySelector('#session-main');
  const $footer   = container.querySelector('#session-footer');
  const $progress = container.querySelector('#session-progress');

  const exerciseMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const startTime   = Date.now();

  // ── State ──
  const state = {
    phase:      'preview',
    skipped:    new Set(),   // indices dans plan.exercises à ignorer
    activeList: null,        // construit au démarrage (plan.exercises sans skipped)
    exIdx:      0,           // index dans activeList
    setIdx:     0,           // série courante (0-indexé)
    timeLeft:   0,           // secondes restantes
    timer:      null,        // handle setInterval
  };

  // ── Utilitaires ──
  function getInfo(ex) { return exerciseMap[ex.exercise_id]; }

  /** Trouve un exercice alternatif de même movement_pattern, non déjà dans la liste active */
  function findAlternative(ex) {
    const info = getInfo(ex);
    if (!info) return null;
    const usedIds = new Set(state.activeList.map((e) => e.exercise_id));
    const candidates = exercises.filter((e) =>
      e.movement_pattern === info.movement_pattern &&
      !usedIds.has(e.id) &&
      e.id !== ex.exercise_id
    );
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function exName(ex) {
    const info = getInfo(ex);
    return info ? (lang === 'fr' ? info.name_fr : info.name_en) : ex.exercise_id;
  }

  function exInstructions(ex) {
    const info = getInfo(ex);
    return info ? (lang === 'fr' ? info.instructions_fr : info.instructions_en) : '';
  }

  function isTimed(ex) { return ex.reps == null && ex.duration_s != null; }

  /** Durée d'une série en secondes (reps × 3s ou durée iso) */
  function setDuration(ex) { return isTimed(ex) ? ex.duration_s : ex.reps * 3; }

  function stopTimer() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }

  function setFooterBtn(label, id, ghost = false) {
    $footer.innerHTML = `<button class="btn ${ghost ? 'btn-ghost' : 'btn-outline'} session-skip-btn" id="${id}">${label}</button>`;
  }

  // ── Barre de progression ──
  function renderProgress() {
    const total = state.activeList ? state.activeList.length : plan.exercises.length;
    const done  = state.phase === 'rpe' ? total : (state.exIdx || 0);
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    $progress.innerHTML = `
      <div class="session-prog-bar" role="progressbar" aria-valuenow="${done}" aria-valuemax="${total}" aria-label="${done}/${total}">
        <div class="session-prog-fill" style="width:${pct}%"></div>
      </div>`;
  }

  // ── PHASE : PREVIEW ──
  function showPreview() {
    state.phase = 'preview';
    stopTimer();
    renderProgress();

    const rows = plan.exercises.map((ex, idx) => {
      const name = exName(ex);
      const spec = isTimed(ex)
        ? `${ex.sets} × ${ex.duration_s}s`
        : `${ex.sets} × ${ex.reps} reps`;
      const isSkipped = state.skipped.has(idx);
      return `
        <div class="preview-row${isSkipped ? ' preview-row--skipped' : ''}" data-idx="${idx}">
          <div class="preview-row-body">
            <span class="preview-row-name">${name}</span>
            <span class="preview-row-spec">${spec}</span>
          </div>
          <button class="preview-skip-btn" data-idx="${idx}" aria-label="${t('session.skip_exercise')}">✕</button>
        </div>`;
    }).join('');

    $main.innerHTML = `
      <div class="session-preview animate-in">
        <p class="session-preview-hint">${t('session.preview_hint')}</p>
        <div class="preview-list">${rows}</div>
      </div>`;

    $footer.innerHTML = `<button class="btn btn-accent session-start-btn" id="session-start-btn">${t('session.start')}</button>`;

    $main.querySelectorAll('.preview-skip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        state.skipped.has(idx) ? state.skipped.delete(idx) : state.skipped.add(idx);
        showPreview();
      });
    });

    document.getElementById('session-start-btn').addEventListener('click', () => {
      state.activeList = plan.exercises.filter((_, i) => !state.skipped.has(i));
      if (state.activeList.length === 0) { finishSession(null); return; }
      state.exIdx  = 0;
      state.setIdx = 0;
      showExercise();
    });
  }

  // ── PHASE : EXERCISING ──
  function showExercise() {
    state.phase = 'exercising';
    renderProgress();

    const ex       = state.activeList[state.exIdx];
    const total    = state.activeList.length;
    const setLabel = `${t('session.set')} ${state.setIdx + 1} / ${ex.sets}`;
    const exLabel  = `${state.exIdx + 1} / ${total}`;
    const instructions = exInstructions(ex);

    state.timeLeft = setDuration(ex);

    const imgUrl = getInfo(ex)?.image_url ?? null;

    $main.innerHTML = `
      <div class="session-exercise animate-in">
        <div class="session-ex-meta">
          <span class="session-ex-counter">${exLabel}</span>
          <span class="session-ex-setlabel">${setLabel}</span>
        </div>
        ${imgUrl ? `<img class="session-ex-img" src="${imgUrl}" alt="${exName(ex)}" loading="lazy" />` : ''}
        <div class="session-ex-name">${exName(ex)}</div>
        <div class="session-timer">
          <span class="session-timer-value" id="timer-value">${state.timeLeft}s</span>
          ${!isTimed(ex) ? `<span class="session-timer-rep" id="timer-rep">${t('session.rep')} 1 / ${ex.reps}</span>` : ''}
        </div>
        ${instructions ? `<p class="session-ex-instructions">${instructions}</p>` : ''}
      </div>`;

    $footer.innerHTML = `
      <button class="btn btn-ghost session-skip-btn" id="skip-set-btn">${t('session.skip_rest')}</button>
      <button class="btn btn-ghost session-swap-btn" id="swap-ex-btn">${t('session.swap_exercise')}</button>`;

    document.getElementById('skip-set-btn').addEventListener('click', () => {
      stopTimer();
      advanceAfterSet();
    });

    document.getElementById('swap-ex-btn').addEventListener('click', () => {
      const alt = findAlternative(ex);
      if (!alt) return;
      stopTimer();
      state.activeList[state.exIdx] = { ...ex, exercise_id: alt.id };
      state.setIdx = 0;
      showExercise();
    });

    stopTimer();
    state.timer = setInterval(() => {
      state.timeLeft--;
      const $v = document.getElementById('timer-value');
      if ($v) $v.textContent = `${state.timeLeft}s`;

      if (!isTimed(ex)) {
        const elapsed    = setDuration(ex) - state.timeLeft;
        const currentRep = Math.min(Math.floor(elapsed / 3) + 1, ex.reps);
        const $r = document.getElementById('timer-rep');
        if ($r) $r.textContent = `${t('session.rep')} ${currentRep} / ${ex.reps}`;
      }

      if (state.timeLeft <= 0) { stopTimer(); advanceAfterSet(); }
    }, 1000);
  }

  // ── Avancement après une série ──
  function advanceAfterSet() {
    const ex        = state.activeList[state.exIdx];
    const isLastSet = state.setIdx >= ex.sets - 1;

    if (isLastSet) {
      state.exIdx++;
      state.setIdx = 0;
      renderProgress();
      if (state.exIdx >= state.activeList.length) {
        showRpe();
      } else {
        const nextEx = state.activeList[state.exIdx];
        showRest(ex.rest_s, exName(nextEx));
      }
    } else {
      state.setIdx++;
      showRest(ex.rest_s, null);
    }
  }

  // ── PHASE : RESTING ──
  function showRest(restSeconds, nextExerciseName) {
    state.phase    = 'resting';
    state.timeLeft = restSeconds;

    const nextLabel = nextExerciseName
      ? `${t('session.next_exercise')} : ${nextExerciseName}`
      : t('session.next_set');

    $main.innerHTML = `
      <div class="session-rest animate-in">
        <div class="session-rest-label">${t('session.rest')}</div>
        <div class="session-rest-timer" id="rest-timer">${state.timeLeft}s</div>
        <div class="session-rest-next">${nextLabel}</div>
      </div>`;

    setFooterBtn(t('session.skip_rest'), 'skip-rest-btn', true);
    document.getElementById('skip-rest-btn').addEventListener('click', () => {
      stopTimer();
      showExercise();
    });

    stopTimer();
    state.timer = setInterval(() => {
      state.timeLeft--;
      const $rt = document.getElementById('rest-timer');
      if ($rt) $rt.textContent = `${state.timeLeft}s`;
      if (state.timeLeft <= 0) { stopTimer(); showExercise(); }
    }, 1000);
  }

  // ── PHASE : RPE ──
  function showRpe() {
    state.phase = 'rpe';
    stopTimer();
    renderProgress();

    $main.innerHTML = `
      <div class="rpe-container animate-in">
        <div class="rpe-title">${t('session.rpe_prompt')}</div>
        <div class="rpe-subtitle">${t('session.rpe_subtitle')}</div>
        <div class="rpe-scale">
          ${Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const zone = n <= 4 ? 'easy' : n <= 7 ? 'target' : 'hard';
            return `<button class="rpe-btn rpe-${zone}" data-rpe="${n}">${n}</button>`;
          }).join('')}
        </div>
        <div class="rpe-zone-labels">
          <span>${t('session.rpe_easy')}</span>
          <span class="rpe-zone-target">${t('session.rpe_target')}</span>
          <span>${t('session.rpe_hard')}</span>
        </div>
        <div class="rpe-hint" id="rpe-hint"></div>
        <button class="btn-finish" id="finish-btn">I did it again</button>
      </div>`;

    $footer.innerHTML = `
      <button class="btn btn-ghost btn-skip-rpe" id="skip-rpe-btn">${t('session.skip_rpe')}</button>`;

    let selectedRpe = null;

    $main.querySelectorAll('.rpe-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $main.querySelectorAll('.rpe-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedRpe = parseInt(btn.dataset.rpe, 10);

        const $hint = document.getElementById('rpe-hint');
        let hint = '';
        if (selectedRpe <= 4)      hint = t('session.rpe_hint_easy');
        else if (selectedRpe >= 9) hint = t('session.rpe_hint_hard');
        if ($hint && hint) { $hint.textContent = hint; $hint.classList.add('animate-in'); }
      });
    });

    document.getElementById('finish-btn').addEventListener('click', () => finishSession(selectedRpe));
    document.getElementById('skip-rpe-btn').addEventListener('click', () => finishSession(null));
  }

  // ── Fin de séance ──
  function finishSession(rpe) {
    stopTimer();
    onComplete({
      completed_exercise_ids: (state.activeList ?? []).map((ex) => ex.exercise_id),
      rpe,
      duration_actual_s: Math.round((Date.now() - startTime) / 1000),
    });
  }

  // ── Init ──
  renderProgress();
  showPreview();
}
