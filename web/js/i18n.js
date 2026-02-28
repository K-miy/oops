/**
 * i18n.js — Internationalisation FR/EN minimaliste
 * Utilisation : await initI18n('fr'); puis t('key.nested')
 */

let _translations = {};
let _lang = 'fr';

/**
 * Charge les traductions pour la langue donnée.
 * Doit être appelé avant tout appel à t().
 */
export async function initI18n(lang = 'fr') {
  _lang = lang;
  try {
    const res = await fetch(`/locales/${lang}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _translations = await res.json();
  } catch (err) {
    console.warn(`[i18n] Impossible de charger ${lang}.json, fallback sur fr`, err);
    if (lang !== 'fr') {
      await initI18n('fr');
    }
  }
  // Applique les traductions sur tous les éléments [data-i18n] dans le DOM
  applyToDOM();
}

/** Retourne la traduction pour une clé "section.sous_cle.profond" */
export function t(key, replacements = {}) {
  const parts = key.split('.');
  let value = _translations;
  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) {
      console.warn(`[i18n] Clé manquante : "${key}" (lang: ${_lang})`);
      return key;
    }
  }
  if (typeof value !== 'string') {
    console.warn(`[i18n] La clé "${key}" n'est pas une chaîne`);
    return key;
  }
  // Remplacement de {{variable}} dans la chaîne
  return value.replace(/\{\{(\w+)\}\}/g, (_, k) => replacements[k] ?? `{{${k}}}`);
}

export function getLang() {
  return _lang;
}

/**
 * Applique les traductions sur tous les [data-i18n] dans le DOM.
 * Appelé automatiquement après initI18n(), et peut être rappelé
 * après un changement de contenu dynamique.
 */
export function applyToDOM(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const translated = t(key);
    if (translated !== key) {
      el.textContent = translated;
    }
  });
}
