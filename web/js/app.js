/**
 * app.js — Point d'entrée de l'application OOPS
 *
 * Responsabilités :
 *  1. Initialiser WASM, DB, i18n
 *  2. Charger le catalogue d'exercices
 *  3. Orchestrer la navigation entre les écrans
 *  4. Enregistrer le Service Worker
 */

import init, { build_session } from 'oops';
import { initI18n, t, getLang } from './i18n.js';
import { isWorkoutDay } from './schedule.js';
import { getProfile, saveProfile, getSetting, setSetting, resetAll, saveSession, getTodaySession, getCurrentStreak, getRecentSessions } from './db.js';
import { renderDisclaimer } from './ui/disclaimer.js';
import { renderOnboarding } from './ui/onboarding.js';
import { renderHome } from './ui/home.js';
import { renderSession } from './ui/session.js';
import { renderSettings } from './ui/settings.js';
import { renderHistory } from './ui/history.js';
import { renderAbout } from './ui/about.js';

// ────────────────────────────────────────────────
// SW update banner — enregistré immédiatement (avant boot)
// pour ne pas rater l'event controllerchange si le nouveau SW
// s'active pendant le chargement de l'app.
// ────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const banner = document.getElementById('sw-update-banner');
    const text   = document.getElementById('sw-update-text');
    if (!banner || !banner.hidden) return;
    // t() peut retourner la clé-string si i18n n'est pas encore chargée :
    // on utilise l'attribut data du DOM comme fallback garanti.
    if (text) {
      const msg = t('app.update_available');
      text.textContent = msg === 'app.update_available' ? text.textContent : msg;
    }
    banner.hidden = false;
  });
}

// ────────────────────────────────────────────────
// État global de l'app (lecture seule depuis l'extérieur)
// ────────────────────────────────────────────────
const state = {
  profile: null,
  exercises: [],       // catalogue complet
  currentPlan: null,   // SessionPlan JSON (objet parsé)
  wasmReady: false,
};

// ────────────────────────────────────────────────
// Navigation
// ────────────────────────────────────────────────
const NAV_SCREENS = new Set(['home', 'history', 'settings']);
let _currentScreen = 'loading';

export function showScreen(name) {
  const prev = document.querySelector('.screen.active');
  if (prev) prev.classList.remove('active');
  const next = document.getElementById(`screen-${name}`);
  if (!next) {
    console.error(`[app] Écran inconnu : ${name}`);
    return;
  }
  next.classList.add('active');
  _currentScreen = name;

  // Affiche/cache la nav globale
  const nav = document.getElementById('bottom-nav');
  if (nav) {
    nav.hidden = !NAV_SCREENS.has(name);
    // Sync l'état actif de chaque bouton
    nav.querySelectorAll('.nav-item[data-screen]').forEach((btn) => {
      const isActive = btn.dataset.screen === name;
      btn.classList.toggle('active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }
}

async function navigateTo(screen) {
  if (screen === 'home') {
    await routeToHome();
  } else if (screen === 'history') {
    await routeToHistory();
  } else if (screen === 'settings') {
    openSettings();
  }
}

// ────────────────────────────────────────────────
// Chargement catalogue d'exercices
// ────────────────────────────────────────────────
async function loadExercises() {
  const categories = ['push', 'pull', 'squat', 'hinge', 'core', 'mobility'];
  const results = await Promise.all(
    categories.map((cat) =>
      fetch(`/data/exercises/${cat}.json`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status} pour ${cat}.json`);
          return r.json();
        })
        .catch((err) => {
          console.error(`[app] Erreur chargement ${cat}:`, err);
          return [];
        })
    )
  );
  return results.flat();
}

// ────────────────────────────────────────────────
// Filtrage exercices selon profil
// ────────────────────────────────────────────────
function getFilteredExercises(exercises, profile) {
  return exercises.filter((ex) => !ex.requires_anchor || profile.has_anchor);
}

// ────────────────────────────────────────────────
// Déload — semaine de récupération toutes les 4 semaines
// ────────────────────────────────────────────────
function isDeloadWeek(profile) {
  const startStr = profile.disclaimer_accepted_at || profile.created_at;
  if (!startStr) return false;
  const daysSinceStart = Math.floor((Date.now() - new Date(startStr).getTime()) / 86_400_000);
  const weekNumber     = Math.floor(daysSinceStart / 7); // 0-indexed
  return (weekNumber + 1) % 4 === 0;                      // semaines 3, 7, 11…
}

/** Réduit le volume d'un plan de ~40% (1 série de moins, minimum 1). */
function applyDeload(plan) {
  if (!plan) return plan;
  return {
    ...plan,
    exercises: plan.exercises.map((ex) => ({ ...ex, sets: Math.max(1, ex.sets - 1) })),
  };
}

/**
 * Avance chaque exercice du plan vers sa progression si l'exercice est maîtrisé.
 * Parcourt la chaîne progression_to récursivement.
 */
function applyProgressions(plan, profile) {
  if (!plan) return plan;
  const mastered = new Set(profile.mastered_exercises ?? []);
  if (mastered.size === 0) return plan;

  const exerciseMap = Object.fromEntries(state.exercises.map((e) => [e.id, e]));
  return {
    ...plan,
    exercises: plan.exercises.map((ex) => {
      let id = ex.exercise_id;
      while (exerciseMap[id]?.progression_to && mastered.has(id)) {
        id = exerciseMap[id].progression_to;
      }
      return id === ex.exercise_id ? ex : { ...ex, exercise_id: id };
    }),
  };
}

// ────────────────────────────────────────────────
// Génération de séances (aujourd'hui + aperçu semaine)
// ────────────────────────────────────────────────
export function generateTodayPlan(profile, exercises) {
  const daySeed = Math.floor(Date.now() / 86_400_000);
  const planJson = build_session(
    JSON.stringify(profile),
    JSON.stringify(exercises),
    daySeed
  );
  return JSON.parse(planJson);
}

/** Génère un aperçu des 7 prochains jours (index 0 = aujourd'hui). */
function generateWeekPreview(profile, exercises) {
  const dayMs = 86_400_000;
  const now = Date.now();
  const preview = [];

  for (let i = 0; i < 7; i++) {
    const dayTs = now + i * dayMs;
    const date = new Date(dayTs);
    const daySeed = Math.floor(dayTs / dayMs);
    const isWorkout = isWorkoutDay(date, profile);

    let plan = null;
    if (isWorkout) {
      try {
        plan = JSON.parse(build_session(JSON.stringify(profile), JSON.stringify(exercises), daySeed));
      } catch (e) {
        console.warn('[app] generateWeekPreview error day', i, e);
      }
    }

    preview.push({ date, isWorkout, plan });
  }

  return preview;
}

// ────────────────────────────────────────────────
// Boot
// ────────────────────────────────────────────────
async function boot() {
  const $msg = document.getElementById('loading-msg');

  // 1. WASM
  $msg.textContent = 'Chargement du moteur…';
  await init();
  state.wasmReady = true;

  // 2. Profil & langue
  $msg.textContent = 'Initialisation…';
  state.profile = await getProfile();
  const lang = state.profile?.lang ?? (await getSetting('lang')) ?? 'fr';

  // 3. i18n
  await initI18n(lang);
  $msg.textContent = t('app.loading') ?? 'Chargement des exercices…';

  // 4. Exercices
  state.exercises = await loadExercises();

  // 5. Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('[app] SW non enregistré:', err);
    });
  }

  // 6. Routing initial
  await route();

  // 7. Bannière install PWA (si l'event est arrivé avant que i18n soit prête)
  if (_installPrompt) showInstallBanner();

  // 8. Mise à jour du texte SW si la bannière est apparue avant i18n
  const $swText = document.getElementById('sw-update-text');
  if ($swText) $swText.textContent = t('app.update_available');

  _booted = true;
}

async function route() {
  if (!state.profile) {
    renderDisclaimer(document.getElementById('screen-disclaimer'), {
      onAccept: () => {
        renderOnboarding(document.getElementById('screen-onboarding'), {
          exercises: state.exercises,
          onComplete: async (profile) => {
            state.profile = profile;
            await saveProfile(profile);
            await routeToHome();
          },
        });
        showScreen('onboarding');
      },
    });
    showScreen('disclaimer');
    return;
  }

  await routeToHome();
}

async function routeToHome() {
  const today = new Date().toISOString().slice(0, 10);
  const [todaySession, streak] = await Promise.all([
    getTodaySession(today),
    getCurrentStreak(),
  ]);

  const filteredExercises = getFilteredExercises(state.exercises, state.profile);
  const weekPreview = generateWeekPreview(state.profile, filteredExercises);
  const todayEntry = weekPreview[0];

  const deload = isDeloadWeek(state.profile);

  if (todayEntry.isWorkout) {
    if (todaySession) {
      state.currentPlan = todaySession.plan;
    } else {
      let plan = applyProgressions(todayEntry.plan, state.profile);
      if (deload) plan = applyDeload(plan);
      state.currentPlan = plan;
    }
  } else {
    state.currentPlan = null;
  }

  renderHome(document.getElementById('home-main'), {
    profile: state.profile,
    plan: state.currentPlan,
    todaySession,
    isDeload: deload && todayEntry.isWorkout && !todaySession,
    streak,
    lang: getLang(),
    exercises: state.exercises,
    weekPreview,
    onStartSession: () => startSession(),
    onQuickSession: () => startQuickSession(),
    onOpenSettings: () => openSettings(),
  });

  showScreen('home');
}

async function routeToHistory() {
  const sessions = await getRecentSessions(50);
  renderHistory(document.getElementById('history-main'), {
    sessions,
    lang: getLang(),
  });
  showScreen('history');
}

function startSession() {
  if (!state.currentPlan) return;
  renderSession(document.getElementById('screen-session'), {
    plan: state.currentPlan,
    exercises: state.exercises,
    lang: getLang(),
    onComplete: async (result) => {
      const today = new Date().toISOString().slice(0, 10);
      await saveSession({
        date: today,
        plan: state.currentPlan,
        ...result,
      });

      // Séance facile → marque les exercices comme maîtrisés
      if (result.rpe != null && result.rpe <= 5 && result.completed_exercise_ids?.length) {
        const mastered = new Set(state.profile.mastered_exercises ?? []);
        for (const id of result.completed_exercise_ids) mastered.add(id);
        state.profile = { ...state.profile, mastered_exercises: [...mastered] };
        await saveProfile(state.profile);
      }

      await routeToHome();
      showScreen('home');
    },
    onAbort: () => showScreen('home'),
  });
  showScreen('session');
}

function startQuickSession() {
  const filteredExercises = getFilteredExercises(state.exercises, state.profile);
  const daySeed = Math.floor(Date.now() / 86_400_000);
  let plan;
  try {
    plan = JSON.parse(build_session(JSON.stringify(state.profile), JSON.stringify(filteredExercises), daySeed));
  } catch (e) {
    console.error('[app] startQuickSession error:', e);
    return;
  }
  state.currentPlan = plan;
  startSession();
}

// ────────────────────────────────────────────────
// Boutons globaux
// ────────────────────────────────────────────────
function openSettings() {
  renderSettings(document.getElementById('settings-main'), {
    profile: state.profile,
    onLangChange: async (newLang) => {
      await routeToHome();
      showScreen('settings');
      openSettings();
    },
    onReset: () => {
      state.profile = null;
      state.currentPlan = null;
      window.location.reload();
    },
    onEditProfile: () => {
      renderOnboarding(document.getElementById('screen-onboarding'), {
        initialProfile: state.profile,
        onComplete: async (updatedProfile) => {
          state.profile = updatedProfile;
          await saveProfile(updatedProfile);
          await routeToHome();
        },
      });
      showScreen('onboarding');
    },
    onAbout: () => {
      renderAbout(document.getElementById('about-main'));
      showScreen('about');
    },
  });
  showScreen('settings');
}

document.getElementById('home-settings-btn')?.addEventListener('click', openSettings);
document.getElementById('settings-back-btn')?.addEventListener('click', () => showScreen('home'));
document.getElementById('about-back-btn')?.addEventListener('click', () => showScreen('settings'));
document.getElementById('session-close-btn')?.addEventListener('click', () => {
  if (confirm(t('session.abort_confirm') ?? 'Abandonner la séance ?')) {
    showScreen('home');
  }
});

// Bottom nav global
document.getElementById('bottom-nav')?.querySelectorAll('.nav-item[data-screen]').forEach((btn) => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.screen));
});

// ────────────────────────────────────────────────
// PWA install prompt
// ────────────────────────────────────────────────
let _installPrompt = null;
let _booted = false;

function showInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  const text   = document.getElementById('pwa-install-text');
  if (!banner) return;
  if (text) text.textContent = t('settings.install_prompt');
  banner.hidden = false;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _installPrompt = e;
  // Affiche la bannière seulement si i18n est prête (boot terminé)
  // sinon boot() appellera showInstallBanner() lui-même à la fin
  if (_booted) showInstallBanner();
});

document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
  if (!_installPrompt) return;
  const banner = document.getElementById('pwa-install-banner');
  _installPrompt.prompt();
  const { outcome } = await _installPrompt.userChoice;
  _installPrompt = null;
  if (banner) banner.hidden = true;
});

document.getElementById('pwa-install-dismiss')?.addEventListener('click', () => {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.hidden = true;
  _installPrompt = null;
});

window.addEventListener('appinstalled', () => {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.hidden = true;
  _installPrompt = null;
});

// ────────────────────────────────────────────────
// Bouton rechargement mise à jour SW
// ────────────────────────────────────────────────
document.getElementById('sw-update-btn')?.addEventListener('click', () => {
  window.location.reload();
});

// ────────────────────────────────────────────────
// Démarrage
// ────────────────────────────────────────────────
boot().catch((err) => {
  console.error('[app] Erreur fatale au démarrage :', err);
  const $msg = document.getElementById('loading-msg');
  if ($msg) {
    $msg.textContent = `Erreur : ${err.message}. Rechargez la page.`;
    $msg.style.color = 'var(--color-error)';
  }
});
