/**
 * settings.js — Écran des paramètres
 */
import { t, initI18n, getLang } from '../i18n.js';
import { getSetting, setSetting, resetAll, exportData, importData } from '../db.js';
import { applyFontScale } from './disclaimer.js';
import { APP_VERSION } from '../version.js';

/**
 * @param {HTMLElement} container - #settings-main
 * @param {{
 *   profile: object,
 *   onLangChange: (lang: string) => void,
 *   onReset: () => void,
 * }} opts
 */
export function renderSettings(container, { profile, soundEnabled, onLangChange, onSoundChange, onReset, onEditProfile, onAbout }) {
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

    <!-- ── Export / Import ── -->
    <div class="settings-section">
      <div class="settings-row" id="settings-export-row">
        <span class="settings-row-label" style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.1rem">💾</span>
          <span>${t('settings.export')}</span>
        </span>
        <span class="settings-row-value">›</span>
      </div>
      <div class="settings-row" id="settings-import-row">
        <span class="settings-row-label" style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.1rem">📂</span>
          <span>${t('settings.import')}</span>
        </span>
        <span class="settings-row-value">›</span>
      </div>
      <input type="file" id="settings-import-file" accept=".json" style="display:none">
      <div id="settings-import-status" style="font-size:.8rem;padding:4px 16px 8px;display:none"></div>
    </div>

    <!-- ── Sons ── -->
    <div class="settings-section">
      <label class="profile-toggle-row" style="padding:4px 0" id="settings-sound-row">
        <span class="settings-row-label">${t('settings.sounds')}</span>
        <div class="toggle-switch">
          <input type="checkbox" id="settings-sound-toggle" ${soundEnabled ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </div>
      </label>
    </div>

    <!-- ── Taille du texte ── -->
    <div class="settings-section">
      <div class="settings-row-font">
        <span class="settings-row-label">${t('settings.font_size')}</span>
        <div class="font-size-control" style="padding:8px 0 0">
          <span class="font-label-sm">Aa</span>
          <input type="range" id="settings-font-slider"
                 min="0.8" max="1.4" step="0.05"
                 value="${parseFloat(localStorage.getItem('oops_font_scale') || '1')}"
                 aria-label="${t('settings.font_size')}">
          <span class="font-label-lg">Aa</span>
        </div>
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
      OOPS v${APP_VERSION} — ${t('settings.privacy_note')}<br/>
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

  // ── Import ──
  container.querySelector('#settings-import-row').addEventListener('click', () => {
    container.querySelector('#settings-import-file').click();
  });
  container.querySelector('#settings-import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const $status = container.querySelector('#settings-import-status');
    $status.style.display = 'block';
    $status.style.color   = 'var(--color-text-muted)';
    $status.textContent   = t('settings.import_loading');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      $status.style.color = 'var(--color-success)';
      $status.textContent = t('settings.import_success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      $status.style.color = 'var(--color-error)';
      $status.textContent = t('settings.import_error');
    }
    e.target.value = '';
  });

  // ── Sons ──
  container.querySelector('#settings-sound-toggle')?.addEventListener('change', (e) => {
    if (onSoundChange) onSoundChange(e.target.checked);
  });

  // ── Taille du texte ──
  container.querySelector('#settings-font-slider')?.addEventListener('input', (e) => {
    applyFontScale(parseFloat(e.target.value));
  });

  // ── Reset ──
  container.querySelector('#settings-reset-row').addEventListener('click', async () => {
    if (confirm(t('settings.reset_confirm'))) {
      await resetAll();
      onReset();
    }
  });
}
