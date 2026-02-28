/**
 * onboarding.js — Assistant de création de profil (5 étapes)
 *
 * Étapes :
 *  1. Langue
 *  2. Sexe, âge, poids
 *  3. Niveau de forme
 *  4. Fréquence & durée
 *  5. Conditions spéciales (post-partum, blessures)
 */
import { t, initI18n, applyToDOM } from '../i18n.js';

const TOTAL_STEPS = 5;

/**
 * @param {HTMLElement} container - #screen-onboarding
 * @param {{ onComplete: (profile: object) => void, exercises: object[] }} opts
 */
export function renderOnboarding(container, { onComplete }) {
  let step = 1;
  const draft = {
    lang: 'fr',
    sex: null,
    age_years: null,
    weight_kg: null,
    fitness_level: null,
    sessions_per_week: 3,
    minutes_per_session: 30,
    is_postpartum: false,
    injury_notes: [],
    disclaimer_accepted_at: new Date().toISOString().slice(0, 10),
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
        // Rechargement dynamique des traductions
        await initI18n(draft.lang);
        renderStep();
      });
    });
  }

  // ── Étape 2 : Infos personnelles ──
  function renderPersonalStep() {
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
      <div class="field mt-24">
        <label for="input-age">${t('onboarding.age.label')}</label>
        <input id="input-age" type="number" inputmode="numeric" min="18" max="80"
          placeholder="${t('onboarding.age.placeholder')}"
          value="${draft.age_years ?? ''}" />
      </div>
      <div class="field">
        <label for="input-weight">${t('onboarding.weight.label')}</label>
        <input id="input-weight" type="number" inputmode="decimal" min="30" max="250" step="0.1"
          placeholder="${t('onboarding.weight.placeholder')}"
          value="${draft.weight_kg ?? ''}" />
      </div>`;

    $content.querySelectorAll('[data-value]').forEach((card) => {
      card.addEventListener('click', () => {
        $content.querySelectorAll('#sex-choices .choice-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        draft.sex = card.dataset.value;
      });
    });

    $content.querySelector('#input-age').addEventListener('input', (e) => {
      draft.age_years = parseInt(e.target.value, 10) || null;
    });
    $content.querySelector('#input-weight').addEventListener('input', (e) => {
      draft.weight_kg = parseFloat(e.target.value) || null;
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
      });
    });
  }

  // ── Étape 4 : Fréquence & durée ──
  function renderScheduleStep() {
    const sessionOptions = [2, 3, 4, 5];
    const minuteOptions  = [15, 20, 30, 45, 60];

    $content.innerHTML = `
      <div class="onboarding-question">
        <h2>${t('onboarding.sessions_per_week.label')}</h2>
        <div class="chip-group" id="freq-chips">
          ${sessionOptions.map((n) => `
            <button class="chip${draft.sessions_per_week === n ? ' selected' : ''}" data-value="${n}">
              ${n}×/sem
            </button>`).join('')}
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

    $content.querySelectorAll('#freq-chips .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        $content.querySelectorAll('#freq-chips .chip').forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
        draft.sessions_per_week = parseInt(chip.dataset.value, 10);
      });
    });

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

    $content.innerHTML = `
      <div class="onboarding-question">
        <h2>${t('onboarding.is_postpartum.label')}</h2>
        <div class="choice-list">
          <button class="choice-card${draft.is_postpartum === true ? ' selected' : ''}" data-value="true">
            <div class="choice-title">${t('onboarding.is_postpartum.yes')}</div>
          </button>
          <button class="choice-card${draft.is_postpartum === false ? ' selected' : ''}" data-value="false">
            <div class="choice-title">${t('onboarding.is_postpartum.no')}</div>
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

    $content.querySelectorAll('[data-value="true"], [data-value="false"]').forEach((card) => {
      card.addEventListener('click', () => {
        $content.querySelectorAll('.choice-list .choice-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        draft.is_postpartum = card.dataset.value === 'true';
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
      case 2: return draft.sex && draft.age_years >= 18 && draft.weight_kg > 0;
      case 3: return !!draft.fitness_level;
      case 4: return draft.sessions_per_week > 0 && draft.minutes_per_session > 0;
      case 5: return true; // conditions spéciales = optionnelles
    }
    return true;
  }

  // ── Navigation ──
  $nextBtn.addEventListener('click', () => {
    if (!validateStep()) {
      $nextBtn.classList.add('shake');
      setTimeout(() => $nextBtn.classList.remove('shake'), 400);
      return;
    }
    if (step < TOTAL_STEPS) {
      step++;
      renderStep();
    } else {
      onComplete(draft);
    }
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
