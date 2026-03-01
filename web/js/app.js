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

  const weekPreview = generateWeekPreview(state.profile, state.exercises);
  const todayEntry = weekPreview[0];

  if (todayEntry.isWorkout) {
    // Réutilise le plan déjà calculé dans weekPreview[0] si pas de séance sauvegardée
    state.currentPlan = todaySession ? todaySession.plan : todayEntry.plan;
  } else {
    state.currentPlan = null; // jour de repos
  }

  renderHome(document.getElementById('home-main'), {
    profile: state.profile,
    plan: state.currentPlan,
    todaySession,
    streak,
    lang: getLang(),
    exercises: state.exercises,
    weekPreview,
    onStartSession: () => startSession(),
    onOpenSettings: () => openSettings(),
  });

  showScreen('home');
}

async function routeToHistory() {
  const sessions = await getRecentSessions(50);
  renderHistory(document.getElementById('history-main'), {
    sessions,
    exercises: state.exercises,
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

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _installPrompt = e;
  const banner = document.getElementById('pwa-install-banner');
  const text   = document.getElementById('pwa-install-text');
  if (banner) {
    // Texte localisé si i18n déjà chargée, sinon fallback
    if (text) text.textContent = t('settings.install_prompt') ?? 'Installer OOPS sur votre écran d\'accueil ?';
    banner.hidden = false;
  }
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
