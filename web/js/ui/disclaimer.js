/**
 * disclaimer.js — Écran d'avertissement médical (obligatoire au 1er lancement)
 */
import { t, applyToDOM } from '../i18n.js';

/**
 * @param {HTMLElement} container - #screen-disclaimer
 * @param {{ onAccept: () => void }} callbacks
 */
export function renderDisclaimer(container, { onAccept }) {
  // Contenu traduit
  container.querySelector('[data-i18n="disclaimer.body"]').textContent =
    t('disclaimer.body');
  container.querySelector('[data-i18n="disclaimer.checkbox"]').textContent =
    t('disclaimer.checkbox');
  container.querySelector('[data-i18n="disclaimer.accept"]').textContent =
    t('disclaimer.accept');
  container.querySelector('[data-i18n="disclaimer.title"]').textContent =
    t('disclaimer.title');

  const checkbox = container.querySelector('#disclaimer-checkbox');
  const acceptBtn = container.querySelector('#disclaimer-accept-btn');

  // Active le bouton uniquement si la case est cochée
  checkbox.addEventListener('change', () => {
    acceptBtn.disabled = !checkbox.checked;
  });

  acceptBtn.addEventListener('click', () => {
    if (!checkbox.checked) return;
    onAccept();
  });
}
