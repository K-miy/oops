/**
 * disclaimer.js — Écran d'avertissement médical (obligatoire au 1er lancement)
 */
import { t } from '../i18n.js';

/** Lit/écrit l'échelle de police (localStorage + CSS var). */
function applyFontScale(scale) {
  document.documentElement.style.setProperty('--font-scale', scale);
  localStorage.setItem('oops_font_scale', scale);
}

/**
 * @param {HTMLElement} container - #screen-disclaimer
 * @param {{ onAccept: () => void }} callbacks
 */
export function renderDisclaimer(container, { onAccept }) {
  container.querySelector('[data-i18n="disclaimer.title"]').textContent = t('disclaimer.title');
  container.querySelector('[data-i18n="disclaimer.body"]').textContent = t('disclaimer.body');
  container.querySelector('[data-i18n="disclaimer.accept"]').textContent = t('disclaimer.accept');

  // Injecte le slider de taille de police dans le corps du disclaimer
  const $main = container.querySelector('.disclaimer-body');
  const savedScale = parseFloat(localStorage.getItem('oops_font_scale') || '1');
  const $slider = document.createElement('div');
  $slider.className = 'font-size-control';
  $slider.innerHTML = `
    <span class="font-label-sm">Aa</span>
    <input type="range" id="font-scale-slider"
           min="0.8" max="1.4" step="0.05"
           value="${savedScale}"
           aria-label="Taille du texte">
    <span class="font-label-lg">Aa</span>`;
  $main.appendChild($slider);

  $slider.querySelector('#font-scale-slider').addEventListener('input', (e) => {
    applyFontScale(parseFloat(e.target.value));
  });

  container.querySelector('#disclaimer-accept-btn').addEventListener('click', onAccept);
}

export { applyFontScale };
