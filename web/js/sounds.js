/**
 * sounds.js — Sons de séance via Web Audio API
 *
 * Zéro fichier, fonctionne offline. Synthèse pure.
 *
 * Palette :
 *   scheduleCountdown()  — accélération 60→120→240 BPM avant un exercice
 *   cancelCountdown()    — annule les beats non encore joués
 *   playTick()           — tick léger, chaque rep (20 BPM = toutes les 3s)
 *   playSnare()          — caisse claire, fin de série → repos
 *   playClave()          — clave, countdown repos 3-2-1
 *   playKick()           — grosse caisse, fin de séance
 */

let _ctx = null;
let _enabled = true;
let _pendingNodes = [];  // nœuds audio schedulés pour le countdown

function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

export function setSoundsEnabled(val) {
  _enabled = !!val;
}

// ── Helpers internes ──

function schedBeat(c, beatTime, freq, dur, vol = 0.22) {
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.connect(g); g.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, beatTime);
  g.gain.setValueAtTime(vol, beatTime);
  g.gain.exponentialRampToValueAtTime(0.001, beatTime + dur);
  osc.start(beatTime);
  osc.stop(beatTime + dur + 0.005);
  _pendingNodes.push(osc);
}

// ── API publique ──

/**
 * Countdown d'accélération sur 10s.
 * 60 BPM × 4s → 120 BPM × 4s → 240 BPM × 2s
 * Beats schedulés au microseconde près via AudioContext.
 */
export function scheduleCountdown() {
  if (!_enabled) return;
  cancelCountdown();
  try {
    const c   = ac();
    const now = c.currentTime;

    // Section 1 : 60 BPM (interval = 1s) pendant 4s → 4 beats — 440 Hz (La)
    for (let i = 0; i < 4; i++) {
      schedBeat(c, now + i * 1.0, 440, 0.07);
    }

    // Section 2 : 120 BPM (interval = 0.5s) pendant 4s → 8 beats — 660 Hz (Mi)
    for (let i = 0; i < 8; i++) {
      schedBeat(c, now + 4 + i * 0.5, 660, 0.045);
    }

    // Section 3 : 240 BPM (interval = 0.25s) pendant 2s → 8 beats — 880 Hz (La)
    for (let i = 0; i < 8; i++) {
      schedBeat(c, now + 8 + i * 0.25, 880, 0.025);
    }
  } catch (_) { /* pas de Web Audio */ }
}

/** Annule les beats du countdown pas encore joués. */
export function cancelCountdown() {
  for (const node of _pendingNodes) {
    try { node.stop(0); } catch (_) {}
  }
  _pendingNodes = [];
}

/** Tick léger — chaque nouvelle rep (20 BPM = toutes les 3s) */
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

/** Clave — countdown repos 3-2-1 */
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
