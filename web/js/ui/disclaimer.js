/**
 * disclaimer.js — Écran d'avertissement médical (obligatoire au 1er lancement)
 */
import { t } from '../i18n.js';

/**
 * @param {HTMLElement} container - #screen-disclaimer
 * @param {{ onAccept: () => void }} callbacks
 */
export function renderDisclaimer(container, { onAccept }) {
  container.querySelector('[data-i18n="disclaimer.title"]').textContent = t('disclaimer.title');
  container.querySelector('[data-i18n="disclaimer.body"]').textContent = t('disclaimer.body');
  container.querySelector('[data-i18n="disclaimer.accept"]').textContent = t('disclaimer.accept');

  container.querySelector('#disclaimer-accept-btn').addEventListener('click', onAccept);
}
