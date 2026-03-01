/**
 * onboarding.js — Assistant de création de profil (5 étapes)
 *
 * Étapes :
 *  1. Langue
 *  2. Sexe, tranche d'âge
 *  3. Niveau de forme
 *  4. Fréquence & durée
 *  5. Conditions spéciales (post-partum, blessures)
 */
import { t, initI18n, applyToDOM } from '../i18n.js';

const TOTAL_STEPS = 5;

/**
 * @param {HTMLElement} container - #screen-onboarding
 * @param {{
 *   onComplete: (profile: object) => void,
 *   initialProfile?: object,  // si fourni : mode édition (saute étape 1)
 * }} opts
 */
export function renderOnboarding(container, { onComplete, initialProfile = null }) {
  const isEditing = !!initialProfile;
  let step = isEditing ? 2 : 1;  // saute l'étape langue en mode édition

  const draft = {
    lang: initialProfile?.lang ?? 'fr',
    sex: initialProfile?.sex ?? null,
    age_bracket: initialProfile?.age_bracket ?? null,
    fitness_level: initialProfile?.fitness_level ?? null,
    workout_days: initialProfile?.workout_days?.length > 0 ? [...initialProfile.workout_days] : [],
    minutes_per_session: initialProfile?.minutes_per_session ?? 30,
    is_postpartum: initialProfile?.is_postpartum ?? false,
    has_anchor: initialProfile?.has_anchor ?? false,
    injury_notes: initialProfile?.injury_notes ?? [],
    disclaimer_accepted_at: initialProfile?.disclaimer_accepted_at ?? new Date().toISOString().slice(0, 10),
  };

  const $content    = container.querySelector('#onboarding-step-content');
  const $nextBtn    = container.querySelector('#onboarding-next-btn');
  const $backBtn    = container.querySelector('#onboarding-back-btn');
  const $indicators = container.querySelectorAll('.step');

  function updateIndicators() {
    $indicators.forEach((dot, i) => {
      dot.classList.toggle('active', i + 1 === step);
      dot.classList.toggle('done', i + 1 < step);
    });
    $backBtn.hidden = step === 1;
    $nextBtn.textContent = step === TOTAL_STEPS ? t('onboarding.finish') : t('onboarding.next');
  }

  function renderStep() {
    $content.innerHTML = '';
    $content.classList.remove('animate-in');
    void $content.offsetWidth; // force reflow
    $content.classList.add('animate-in');

    switch (step) {
      case 1: renderLangStep(); break;
      case 2: renderPersonalStep(); break;
      case 3: renderLevelStep(); break;
      case 4: renderScheduleStep(); break;
      case 5: renderConditionsStep(); break;
    }
    updateIndicators();
  }

  // ── Étape 1 : Langue ──
  function renderLangStep() {
    $content.innerHTML = `
      <div class="onboarding-question">
        <h2>${t('onboarding.lang.label')}</h2>
        <div class="choice-list" id="lang-choices">
          <button class="choice-card${draft.lang === 'fr' ? ' selected' : ''}" data-value="fr">
            <div class="choice-title">🇫🇷 Français</div>
          </button>
          <button class="choice-card${draft.lang === 'en' ? ' selected' : ''}" data-value="en">
            <div class="choice-title">🇬🇧 English</div>
          </button>
        </div>
      </div>`;

    $content.querySelectorAll('.choice-card').forEach((card) => {
      card.addEventListener('click', async () => {
        $content.querySelectorAll('.choice-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        draft.lang = card.dataset.value;
        await initI18n(draft.lang);
        // Re-render pour appliquer les nouvelles traductions, puis auto-avance
        renderStep();
        setTimeout(advance, 350);
      });
    });
  }

  // ── Étape 2 : Sexe + tranche d'âge ──
  function renderPersonalStep() {
    const ageBrackets = ['under_35', '35_44', '45_plus'];

    $content.innerHTML = `
      <div class="onboarding-question">
        <h2>${t('onboarding.sex.label')}</h2>
        <div class="choice-list" id="sex-choices">
          <button class="choice-card${draft.sex === 'male' ? ' selected' : ''}" data-value="male">
            <div class="choice-title">${t('onboarding.sex.male')}</div>
          </button>
          <button class="choice-card${draft.sex === 'female' ? ' selected' : ''}" data-value="female">
            <div class="choice-title">${t('onboarding.sex.female')}</div>
          </button>
          <button class="choice-card${draft.sex === 'other' ? ' selected' : ''}" data-value="other">
            <div class="choice-title">${t('onboarding.sex.other')}</div>
          </button>
        </div>
      </div>
      <div class="onboarding-question mt-24">
        <h2>${t('onboarding.age_bracket.label')}</h2>
        <div class="choice-list" id="age-bracket-choices">
          ${ageBrackets.map((b) => `
            <button class="choice-card${draft.age_bracket === b ? ' selected' : ''}" data-value="${b}" id="age-bracket-${b}">
              <div class="choice-title">${t('onboarding.age_bracket.' + b)}</div>
            </button>`).join('')}
        </div>
      </div>`;

    function checkStep2Complete() {
      if (draft.sex && draft.age_bracket) setTimeout(advance, 350);
    }

    $content.querySelectorAll('#sex-choices .choice-card').forEach((card) => {
      card.addEventListener('click', () => {
        $content.querySelectorAll('#sex-choices .choice-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        draft.sex = card.dataset.value;
        checkStep2Complete();
      });
    });

    $content.querySelectorAll('#age-bracket-choices .choice-card').forEach((card) => {
      card.addEventListener('click', () => {
        $content.querySelectorAll('#age-bracket-choices .choice-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        draft.age_bracket = card.dataset.value;
        checkStep2Complete();
      });
    });
  }

  // ── Étape 3 : Niveau de forme ──
  function renderLevelStep() {
    $content.innerHTML = `
      <div class="onboarding-question">
        <h2>${t('onboarding.fitness_level.label')}</h2>
        <div class="choice-list">
          <button class="choice-card${draft.fitness_level === 'beginner' ? ' selected' : ''}" data-value="beginner">
            <div class="choice-title">${t('onboarding.fitness_level.beginner')}</div>
            <div class="choice-desc">${t('onboarding.fitness_level.beginner_desc')}</div>
          </button>
          <button class="choice-card${draft.fitness_level === 'intermediate' ? ' selected' : ''}" data-value="intermediate">
            <div class="choice-title">${t('onboarding.fitness_level.intermediate')}</div>
            <div class="choice-desc">${t('onboarding.fitness_level.intermediate_desc')}</div>
          </button>
        </div>
      </div>`;

    $content.querySelectorAll('.choice-card').forEach((card) => {
      card.addEventListener('click', () => {
        $content.querySelectorAll('.choice-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        draft.fitness_level = card.dataset.value;
        setTimeout(advance, 300);
      });
    });
  }

  // ── Étape 4 : Jours d'entraînement & durée ──
  function renderScheduleStep() {
    // 0=Lun … 6=Dim (ISO, Mon=0)
    const dayKeys = ['0', '1', '2', '3', '4', '5', '6'];
    const minuteOptions = [15, 20, 30, 45, 60];

    $content.innerHTML = `
      <div class="onboarding-question">
        <h2>${t('onboarding.workout_days.label')}</h2>
        <p class="hint">${t('onboarding.workout_days.hint')}</p>
        <div class="chip-group" id="day-chips">
          ${dayKeys.map((d) => `
            <button class="chip${draft.workout_days.includes(Number(d)) ? ' selected' : ''}"
                    data-value="${d}" id="day-chip-${d}">
              ${t('onboarding.workout_days.days.' + d)}
            </button>`).join('')}
        </div>
        <div class="rest-warning" id="day-rest-warning" hidden>
          ⚠️ ${t('onboarding.workout_days.rest_warning')}
        </div>
      </div>
      <div class="onboarding-question mt-24">
        <h2>${t('onboarding.minutes_per_session.label')}</h2>
        <div class="chip-group" id="duration-chips">
          ${minuteOptions.map((m) => `
            <button class="chip${draft.minutes_per_session === m ? ' selected' : ''}" data-value="${m}">
              ${m} min
            </button>`).join('')}
        </div>
      </div>`;

    function hasConsecutiveDays(days) {
      const s = [...days].sort((a, b) => a - b);
      for (let i = 0; i < s.length - 1; i++) {
        if (s[i + 1] - s[i] === 1) return true;
      }
      return s.includes(0) && s.includes(6); // Sun → Mon wrap
    }

    function updateRestWarning() {
      const $w = document.getElementById('day-rest-warning');
      if ($w) $w.hidden = !hasConsecutiveDays(draft.workout_days);
    }

    // Multi-select : toggle les jours
    $content.querySelectorAll('#day-chips .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const val = Number(chip.dataset.value);
        if (draft.workout_days.includes(val)) {
          draft.workout_days = draft.workout_days.filter((d) => d !== val);
          chip.classList.remove('selected');
        } else {
          draft.workout_days = [...draft.workout_days, val].sort((a, b) => a - b);
          chip.classList.add('selected');
        }
        updateRestWarning();
      });
    });

    updateRestWarning();

    $content.querySelectorAll('#duration-chips .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        $content.querySelectorAll('#duration-chips .chip').forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
        draft.minutes_per_session = parseInt(chip.dataset.value, 10);
      });
    });
  }

  // ── Étape 5 : Conditions spéciales ──
  function renderConditionsStep() {
    const injuries = ['lower_back', 'knee', 'shoulder', 'wrist'];
    // Un homme ne peut pas être en post-partum
    const showPostpartum = draft.sex !== 'male';
    if (!showPostpartum) draft.is_postpartum = false;

    $content.innerHTML = `
      ${showPostpartum ? `
      <div class="onboarding-question">
        <h2>${t('onboarding.is_postpartum.label')}</h2>
        <div class="choice-list" id="postpartum-choices">
          <button class="choice-card${draft.is_postpartum === true ? ' selected' : ''}" data-value="true">
            <div class="choice-title">${t('onboarding.is_postpartum.yes')}</div>
          </button>
          <button class="choice-card${draft.is_postpartum === false ? ' selected' : ''}" data-value="false">
            <div class="choice-title">${t('onboarding.is_postpartum.no')}</div>
          </button>
        </div>
      </div>
      ` : ''}
      <div class="onboarding-question mt-24">
        <h2>${t('onboarding.has_anchor.label')}</h2>
        <p class="hint">${t('onboarding.has_anchor.hint')}</p>
        <div class="choice-list" id="anchor-choices">
          <button class="choice-card${draft.has_anchor === true ? ' selected' : ''}" data-value="true">
            <div class="choice-title">${t('onboarding.has_anchor.yes')}</div>
            <div class="choice-desc">${t('onboarding.has_anchor.yes_desc')}</div>
          </button>
          <button class="choice-card${draft.has_anchor === false ? ' selected' : ''}" data-value="false">
            <div class="choice-title">${t('onboarding.has_anchor.no')}</div>
          </button>
        </div>
      </div>
      <div class="onboarding-question mt-24">
        <h2>${t('onboarding.injuries.label')}</h2>
        <div class="chip-group" id="injury-chips">
          ${injuries.map((inj) => `
            <button class="chip${draft.injury_notes.includes(inj) ? ' selected' : ''}" data-value="${inj}">
              ${t('onboarding.injuries.' + inj)}
            </button>`).join('')}
        </div>
      </div>`;

    if (showPostpartum) {
      $content.querySelectorAll('#postpartum-choices .choice-card').forEach((card) => {
        card.addEventListener('click', () => {
          $content.querySelectorAll('#postpartum-choices .choice-card').forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          draft.is_postpartum = card.dataset.value === 'true';
        });
      });
    }

    $content.querySelectorAll('#anchor-choices .choice-card').forEach((card) => {
      card.addEventListener('click', () => {
        $content.querySelectorAll('#anchor-choices .choice-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        draft.has_anchor = card.dataset.value === 'true';
      });
    });

    $content.querySelectorAll('#injury-chips .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        const val = chip.dataset.value;
        if (chip.classList.contains('selected')) {
          if (!draft.injury_notes.includes(val)) draft.injury_notes.push(val);
        } else {
          draft.injury_notes = draft.injury_notes.filter((x) => x !== val);
        }
      });
    });
  }

  // ── Validation par étape ──
  function validateStep() {
    switch (step) {
      case 1: return !!draft.lang;
      case 2: return !!draft.sex && !!draft.age_bracket;
      case 3: return !!draft.fitness_level;
      case 4: return draft.workout_days.length >= 2 && draft.minutes_per_session > 0;
      case 5: return true; // conditions spéciales = optionnelles
    }
    return true;
  }

  // ── Avancement ──
  function advance() {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS) {
      step++;
      renderStep();
    } else {
      onComplete(draft);
    }
  }

  // ── Navigation ──
  $nextBtn.addEventListener('click', () => {
    if (!validateStep()) {
      $nextBtn.classList.add('shake');
      setTimeout(() => $nextBtn.classList.remove('shake'), 400);
      return;
    }
    advance();
  });

  $backBtn.addEventListener('click', () => {
    if (step > 1) {
      step--;
      renderStep();
    }
  });

  // Rendu initial
  renderStep();
}
