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
import { initI18n, t, applyToDOM, getLang } from './i18n.js';
import { getProfile, saveProfile, getSetting, setSetting, resetAll, saveSession, getTodaySession, getCurrentStreak } from './db.js';
import { renderDisclaimer } from './ui/disclaimer.js';
import { renderOnboarding } from './ui/onboarding.js';
import { renderHome } from './ui/home.js';
import { renderSession } from './ui/session.js';
import { renderSettings } from './ui/settings.js';

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
}

// ────────────────────────────────────────────────
// Chargement catalogue d'exercices
// ────────────────────────────────────────────────
async function loadExercises() {
  const categories = ['push', 'squat', 'hinge', 'core', 'mobility'];
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
// Génération de la séance du jour
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
}

async function route() {
  if (!state.profile) {
    // Première utilisation → disclaimer puis onboarding
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

  // Profil existant → accueil
  await routeToHome();
}

async function routeToHome() {
  const today = new Date().toISOString().slice(0, 10);
  let todaySession = await getTodaySession(today);
  const streak = await getCurrentStreak();

  if (!todaySession) {
    // Générer la séance du jour
    state.currentPlan = generateTodayPlan(state.profile, state.exercises);
  } else {
    state.currentPlan = todaySession.plan;
  }

  renderHome(document.getElementById('home-main'), {
    profile: state.profile,
    plan: state.currentPlan,
    todaySession,
    streak,
    lang: getLang(),
    exercises: state.exercises,
    onStartSession: () => startSession(),
    onOpenSettings: () => showScreen('settings'),
  });

  showScreen('home');
}

function startSession() {
  renderSession(document.getElementById('screen-session'), {
    plan: state.currentPlan,
    exercises: state.exercises,
    lang: getLang(),
    onComplete: async (result) => {
      // result = { completed_exercise_ids, rpe, duration_actual_s }
      const today = new Date().toISOString().slice(0, 10);
      await saveSession({
        date: today,
        plan: state.currentPlan,
        ...result,
      });
      await routeToHome();
      showScreen('home');
    },
    onAbort: () => showScreen('home'),
  });
  showScreen('session');
}

// ────────────────────────────────────────────────
// Boutons globaux
// ────────────────────────────────────────────────
function openSettings() {
  renderSettings(document.getElementById('settings-main'), {
    profile: state.profile,
    onLangChange: async (newLang) => {
      // Relance le rendu de l'écran actif avec la nouvelle langue
      await routeToHome();
      showScreen('settings');
      openSettings();
    },
    onReset: () => {
      state.profile = null;
      state.currentPlan = null;
      window.location.reload();
    },
  });
  showScreen('settings');
}

document.getElementById('home-settings-btn')?.addEventListener('click', openSettings);
document.getElementById('settings-back-btn')?.addEventListener('click', () => showScreen('home'));
document.getElementById('session-close-btn')?.addEventListener('click', () => {
  if (confirm(t('session.abort_confirm') ?? 'Abandonner la séance ?')) {
    showScreen('home');
  }
});

// Bottom nav
document.querySelectorAll('.nav-item[data-screen]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.screen;
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    showScreen(target);
  });
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
