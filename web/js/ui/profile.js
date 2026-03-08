/**
 * profile.js — Page de modification du profil
 *
 * Formulaire unique (pas de steps, pas d'auto-avance).
 * Les champs reprennent le contenu du onboarding mais sur une seule page scrollable.
 */
import { t, initI18n } from '../i18n.js';

/**
 * @param {HTMLElement} container - #profile-content
 * @param {{
 *   profile: object,
 *   onSave: (profile: object) => void,
 * }} opts
 */
export function renderProfileEdit(container, { profile, onSave }) {
  const draft = {
    sound_enabled: true,
    ...profile,
    workout_days: profile.workout_days ? [...profile.workout_days] : [],
    injury_notes: profile.injury_notes ? [...profile.injury_notes] : [],
  };

  function render() {
    const ageBrackets = ['under_35', '35_44', '45_plus'];
    const dayKeys = ['0', '1', '2', '3', '4', '5', '6'];
    const minuteOptions = [15, 20, 30, 45, 60];
    const injuries = ['lower_back', 'knee', 'shoulder', 'wrist'];
    const isMale = draft.sex === 'male';

    container.innerHTML = `
      <!-- Langue -->
      <div class="profile-section">
        <div class="profile-section-title">${t('profile.lang')}</div>
        <div class="choice-list choice-list-sm" id="profile-lang">
          <button class="choice-card${draft.lang === 'fr' ? ' selected' : ''}" data-value="fr">
            <div class="choice-title">🇫🇷 Français</div>
          </button>
          <button class="choice-card${draft.lang === 'en' ? ' selected' : ''}" data-value="en">
            <div class="choice-title">🇬🇧 English</div>
          </button>
        </div>
      </div>

      <!-- Sexe -->
      <div class="profile-section">
        <div class="profile-section-title">${t('onboarding.sex.label')}</div>
        <div class="choice-list choice-list-sm" id="profile-sex">
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

      <!-- Tranche d'âge -->
      <div class="profile-section">
        <div class="profile-section-title">${t('onboarding.age_bracket.label')}</div>
        <div class="choice-list choice-list-sm" id="profile-age">
          ${ageBrackets.map((b) => `
            <button class="choice-card${draft.age_bracket === b ? ' selected' : ''}" data-value="${b}">
              <div class="choice-title">${t('onboarding.age_bracket.' + b)}</div>
            </button>`).join('')}
        </div>
      </div>

      <!-- Niveau de forme -->
      <div class="profile-section">
        <div class="profile-section-title">${t('onboarding.fitness_level.label')}</div>
        <div class="choice-list choice-list-sm" id="profile-level">
          <button class="choice-card${draft.fitness_level === 'beginner' ? ' selected' : ''}" data-value="beginner">
            <div class="choice-title">${t('onboarding.fitness_level.beginner')}</div>
            <div class="choice-desc">${t('onboarding.fitness_level.beginner_desc')}</div>
          </button>
          <button class="choice-card${draft.fitness_level === 'intermediate' ? ' selected' : ''}" data-value="intermediate">
            <div class="choice-title">${t('onboarding.fitness_level.intermediate')}</div>
            <div class="choice-desc">${t('onboarding.fitness_level.intermediate_desc')}</div>
          </button>
        </div>
      </div>

      <!-- Jours d'entraînement -->
      <div class="profile-section">
        <div class="profile-section-title">${t('onboarding.workout_days.label')}</div>
        <p class="hint">${t('onboarding.workout_days.hint')}</p>
        <div class="chip-group" id="profile-days">
          ${dayKeys.map((d) => `
            <button class="chip${draft.workout_days.includes(Number(d)) ? ' selected' : ''}" data-value="${d}">
              ${t('onboarding.workout_days.days.' + d)}
            </button>`).join('')}
        </div>
        <div class="rest-warning" id="profile-rest-warning" hidden>
          ⚠️ ${t('onboarding.workout_days.rest_warning')}
        </div>
      </div>

      <!-- Durée -->
      <div class="profile-section">
        <div class="profile-section-title">${t('onboarding.minutes_per_session.label')}</div>
        <div class="chip-group" id="profile-duration">
          ${minuteOptions.map((m) => `
            <button class="chip${draft.minutes_per_session === m ? ' selected' : ''}" data-value="${m}">
              ${m} min
            </button>`).join('')}
        </div>
      </div>

      <!-- Post-partum (toujours dans le DOM, masqué si sexe = male) -->
      <div class="profile-section" id="profile-postpartum-section"${isMale ? ' hidden' : ''}>
        <div class="profile-section-title">${t('onboarding.is_postpartum.label')}</div>
        <div class="choice-list choice-list-sm" id="profile-postpartum">
          <button class="choice-card${draft.is_postpartum === true ? ' selected' : ''}" data-value="true">
            <div class="choice-title">${t('onboarding.is_postpartum.yes')}</div>
          </button>
          <button class="choice-card${draft.is_postpartum === false ? ' selected' : ''}" data-value="false">
            <div class="choice-title">${t('onboarding.is_postpartum.no')}</div>
          </button>
        </div>
      </div>

      <!-- Ancre -->
      <div class="profile-section">
        <div class="profile-section-title">${t('onboarding.has_anchor.label')}</div>
        <p class="hint">${t('onboarding.has_anchor.hint')}</p>
        <div class="choice-list choice-list-sm" id="profile-anchor">
          <button class="choice-card${draft.has_anchor === true ? ' selected' : ''}" data-value="true">
            <div class="choice-title">${t('onboarding.has_anchor.yes')}</div>
            <div class="choice-desc">${t('onboarding.has_anchor.yes_desc')}</div>
          </button>
          <button class="choice-card${draft.has_anchor === false ? ' selected' : ''}" data-value="false">
            <div class="choice-title">${t('onboarding.has_anchor.no')}</div>
          </button>
        </div>
      </div>

      <!-- Blessures -->
      <div class="profile-section">
        <div class="profile-section-title">${t('onboarding.injuries.label')}</div>
        <div class="chip-group" id="profile-injuries">
          ${injuries.map((inj) => `
            <button class="chip${draft.injury_notes.includes(inj) ? ' selected' : ''}" data-value="${inj}">
              ${t('onboarding.injuries.' + inj)}
            </button>`).join('')}
        </div>
      </div>

      <!-- Sons -->
      <div class="profile-section">
        <label class="profile-toggle-row">
          <div>
            <div class="profile-section-title" style="margin-bottom:2px">${t('profile.sounds')}</div>
            <div class="hint" style="margin:0">${t('profile.sounds_hint')}</div>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" id="profile-sound" ${draft.sound_enabled !== false ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </label>
      </div>

      <!-- Sauvegarder -->
      <button class="btn btn-primary" id="profile-save-btn" style="margin:8px 0 40px;width:100%">
        ${t('profile.save')}
      </button>
    `;

    wire();
  }

  function wire() {
    // Langue : re-render avec nouvelle langue
    wireChoiceGroup('#profile-lang', async (val) => {
      draft.lang = val;
      await initI18n(val);
      const scrollTop = container.parentElement?.scrollTop ?? 0;
      render();
      if (container.parentElement) container.parentElement.scrollTop = scrollTop;
    });

    // Sexe : show/hide postpartum sans re-render
    wireChoiceGroup('#profile-sex', (val) => {
      draft.sex = val;
      const $pp = container.querySelector('#profile-postpartum-section');
      if ($pp) $pp.hidden = val === 'male';
      if (val === 'male') draft.is_postpartum = false;
    });

    wireChoiceGroup('#profile-age', (val) => { draft.age_bracket = val; });
    wireChoiceGroup('#profile-level', (val) => { draft.fitness_level = val; });
    wireChoiceGroup('#profile-postpartum', (val) => { draft.is_postpartum = val === 'true'; });
    wireChoiceGroup('#profile-anchor', (val) => { draft.has_anchor = val === 'true'; });

    // Jours (multi-select)
    container.querySelectorAll('#profile-days .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const val = Number(chip.dataset.value);
        if (draft.workout_days.includes(val)) {
          draft.workout_days = draft.workout_days.filter((d) => d !== val);
          chip.classList.remove('selected');
        } else {
          draft.workout_days = [...draft.workout_days, val].sort((a, b) => a - b);
          chip.classList.add('selected');
        }
        const $w = container.querySelector('#profile-rest-warning');
        if ($w) $w.hidden = !hasConsecutiveDays(draft.workout_days);
      });
    });

    // Durée
    container.querySelectorAll('#profile-duration .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('#profile-duration .chip').forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
        draft.minutes_per_session = parseInt(chip.dataset.value, 10);
      });
    });

    // Blessures (multi-select)
    container.querySelectorAll('#profile-injuries .chip').forEach((chip) => {
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

    // Sons
    container.querySelector('#profile-sound')?.addEventListener('change', (e) => {
      draft.sound_enabled = e.target.checked;
    });

    // Sauvegarder
    container.querySelector('#profile-save-btn').addEventListener('click', () => {
      if (!validate()) {
        const $btn = container.querySelector('#profile-save-btn');
        $btn.classList.add('shake');
        setTimeout(() => $btn.classList.remove('shake'), 400);
        return;
      }
      onSave(draft);
    });
  }

  function wireChoiceGroup(selector, onChange) {
    container.querySelectorAll(`${selector} .choice-card`).forEach((card) => {
      card.addEventListener('click', () => {
        container.querySelectorAll(`${selector} .choice-card`).forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        onChange(card.dataset.value);
      });
    });
  }

  function validate() {
    return !!draft.sex && !!draft.age_bracket && !!draft.fitness_level && draft.workout_days.length >= 2;
  }

  function hasConsecutiveDays(days) {
    const s = [...days].sort((a, b) => a - b);
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i + 1] - s[i] === 1) return true;
    }
    return s.includes(0) && s.includes(6);
  }

  render();
}
