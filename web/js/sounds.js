/**
 * sounds.js — Sons de séance via Web Audio API
 *
 * Zéro fichier, fonctionne offline. Synthèse pure.
 *
 * Palette :
 *   playClave()  — clave / wood block, countdown 3-2-1
 *   playTick()   — tick léger, chaque rep
 *   playSnare()  — caisse claire, fin de série → repos
 *   playKick()   — grosse caisse, fin de séance
 */

let _ctx = null;
let _enabled = true;

function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

export function setSoundsEnabled(val) {
  _enabled = !!val;
}

/** Clave (wood block) — countdown 3-2-1 avant une série */
export function playClave() {
  if (!_enabled) return;
  try {
    const c = ac(), t = c.currentTime;
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.04);
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.start(t); osc.stop(t + 0.08);
  } catch (_) { /* pas de Web Audio */ }
}

/** Tick léger — chaque nouvelle rep */
export function playTick() {
  if (!_enabled) return;
  try {
    const c = ac(), t = c.currentTime;
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.start(t); osc.stop(t + 0.04);
  } catch (_) { /* pas de Web Audio */ }
}

/** Caisse claire synthétique — fin de série, début du repos */
export function playSnare() {
  if (!_enabled) return;
  try {
    const c = ac(), t = c.currentTime;

    // Bruit blanc filtré
    const len = Math.ceil(c.sampleRate * 0.14);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src    = c.createBufferSource(); src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = 1200;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.4, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(filter); filter.connect(ng); ng.connect(c.destination);
    src.start(t); src.stop(t + 0.15);

    // Corps tonique court
    const osc = c.createOscillator();
    const og  = c.createGain();
    osc.connect(og); og.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.06);
    og.gain.setValueAtTime(0.55, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t); osc.stop(t + 0.09);
  } catch (_) { /* pas de Web Audio */ }
}

/** Grosse caisse — fin de séance (récompense) */
export function playKick() {
  if (!_enabled) return;
  try {
    const c = ac(), t = c.currentTime;
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.28);
    g.gain.setValueAtTime(1.0, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc.start(t); osc.stop(t + 0.43);
  } catch (_) { /* pas de Web Audio */ }
}
