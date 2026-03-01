/**
 * settings.js — Écran des paramètres
 */
import { t, initI18n, getLang } from '../i18n.js';
import { getSetting, setSetting, resetAll, exportData } from '../db.js';

/**
 * @param {HTMLElement} container - #settings-main
 * @param {{
 *   profile: object,
 *   onLangChange: (lang: string) => void,
 *   onReset: () => void,
 * }} opts
 */
export function renderSettings(container, { profile, onLangChange, onReset, onEditProfile, onAbout }) {
  const lang = getLang();

  container.innerHTML = `
    <!-- ── Langue ── -->
    <div class="settings-section">
      <div class="settings-row" id="settings-lang-row">
        <span class="settings-row-label">${t('settings.lang')}</span>
        <span class="settings-row-value">${lang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'} ›</span>
      </div>
    </div>

    <!-- ── Profil ── -->
    <div class="settings-section">
      <div class="settings-row" id="settings-profile-row">
        <span class="settings-row-label">${t('settings.profile')}</span>
        <span class="settings-row-value">›</span>
      </div>
      <div class="settings-row" id="settings-about-row">
        <span class="settings-row-label">${t('settings.about')}</span>
        <span class="settings-row-value">›</span>
      </div>
    </div>

    <!-- ── Soutenir le projet ── -->
    <div class="settings-section">
      <a href="https://buymeacoffee.com/cbesse"
         target="_blank"
         rel="noopener noreferrer"
         class="settings-row"
         style="text-decoration:none;display:flex;align-items:center;justify-content:space-between;padding:16px">
        <span class="settings-row-label" style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.25rem">☕</span>
          <span>${t('settings.buy_coffee')}</span>
        </span>
        <span class="settings-row-value" style="color:var(--color-accent);font-weight:600">buymeacoffee.com ›</span>
      </a>
    </div>

    <!-- ── Export ── -->
    <div class="settings-section">
      <div class="settings-row" id="settings-export-row">
        <span class="settings-row-label" style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.1rem">💾</span>
          <span>${t('settings.export')}</span>
        </span>
        <span class="settings-row-value">›</span>
      </div>
    </div>

    <!-- ── Zone danger ── -->
    <div class="settings-section settings-danger">
      <div class="settings-row" id="settings-reset-row">
        <span class="settings-row-label">${t('settings.reset')}</span>
      </div>
    </div>

    <!-- ── Infos ── -->
    <p style="text-align:center;font-size:.75rem;color:var(--color-text-muted);margin-top:24px;line-height:1.6">
      OOPS v0.1.0 — ${t('settings.privacy_note')}<br/>
      <a href="https://github.com/K-miy/oops" target="_blank" rel="noopener"
         style="color:var(--color-primary);text-decoration:none">GitHub ↗</a>
    </p>
  `;

  // ── Langue ──
  container.querySelector('#settings-lang-row').addEventListener('click', async () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    await setSetting('lang', newLang);
    await initI18n(newLang);
    onLangChange(newLang);
  });

  // ── Modifier le profil ──
  container.querySelector('#settings-profile-row').addEventListener('click', () => {
    if (onEditProfile) onEditProfile();
  });

  // ── À propos ──
  container.querySelector('#settings-about-row').addEventListener('click', () => {
    if (onAbout) onAbout();
  });

  // ── Export ──
  container.querySelector('#settings-export-row').addEventListener('click', async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `oops-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // ── Reset ──
  container.querySelector('#settings-reset-row').addEventListener('click', async () => {
    if (confirm(t('settings.reset_confirm'))) {
      await resetAll();
      onReset();
    }
  });
}
