/**
 * about.js — Écran "À propos du programme"
 *
 * Explique la méthodologie kynésiologique de OOPS à l'utilisateur.
 */
import { t } from '../i18n.js';

/**
 * @param {HTMLElement} container - #about-main
 */
export function renderAbout(container) {
  container.innerHTML = `
    <div class="about-body">

      <section class="about-section">
        <h2 class="about-section-title">${t('about.what.title')}</h2>
        <p>${t('about.what.body')}</p>
      </section>

      <section class="about-section">
        <h2 class="about-section-title">${t('about.method.title')}</h2>
        <p>${t('about.method.body')}</p>
        <ul class="about-list">
          <li><strong>${t('about.method.patterns_label')}</strong> ${t('about.method.patterns_body')}</li>
          <li><strong>${t('about.method.overload_label')}</strong> ${t('about.method.overload_body')}</li>
          <li><strong>${t('about.method.rpe_label')}</strong> ${t('about.method.rpe_body')}</li>
          <li><strong>${t('about.method.recovery_label')}</strong> ${t('about.method.recovery_body')}</li>
        </ul>
      </section>

      <section class="about-section">
        <h2 class="about-section-title">${t('about.postpartum.title')}</h2>
        <p>${t('about.postpartum.body')}</p>
      </section>

      <section class="about-section">
        <h2 class="about-section-title">${t('about.privacy.title')}</h2>
        <p>${t('about.privacy.body')}</p>
      </section>

    </div>
  `;
}
