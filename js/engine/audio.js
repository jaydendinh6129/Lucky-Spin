/* ============================================================
 *  Sound (Web Audio synth — no asset files)
 * ============================================================ */

let _ctx = null;
let _master = null;
const getCtx = () => {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = _ctx.createDynamicsCompressor();
      _master = _ctx.createGain();
      _master.gain.value = 0.9;
      _master.connect(comp).connect(_ctx.destination);
    } catch (e) { _ctx = null; }
  }
  if (_ctx && _ctx.state === 'suspended') _ctx.resume();
  return _ctx;
};
const tone = (freq, dur, type = 'sine', vol = 0.18, when = 0, glideTo = null) => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(_master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
};
const sweep = (f1, f2, dur, vol = 0.12) => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, t);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(f1, t);
  osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(filter).connect(gain).connect(_master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
};
let _noiseBuf = null;
const noise = ({ dur = 0.3, vol = 0.2, type = 'lowpass', f1 = 800, f2 = f1, q = 0.8, when = 0 } = {}) => {
  const ctx = getCtx();
  if (!ctx) return;
  if (!_noiseBuf) {
    _noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = _noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + when;
  const src = ctx.createBufferSource();
  src.buffer = _noiseBuf;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(f1, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(_master);
  src.start(t);
  src.stop(t + dur + 0.05);
};
const SFX = {
  click: () => tone(660, 0.05, 'sine', 0.08),
  tick: () => tone(1500 + rand() * 250, 0.028, 'square', 0.045),
  whoosh: () => sweep(320, 70, 0.7, 0.1),
  land: () => tone(520, 0.14, 'sine', 0.12, 0, 440),
  win: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.24, 'triangle', 0.2, i * 0.09));
    tone(1046.5, 0.7, 'sine', 0.14, 0.38);
    tone(1318.5, 0.6, 'sine', 0.08, 0.44);
    tone(1568, 0.5, 'sine', 0.05, 0.5);
  },
  /* dating — cupid */
  flutter: () => [0, 0.09, 0.18, 0.27].forEach((w) => noise({ dur: 0.07, vol: 0.05, type: 'bandpass', f1: 900, f2: 1400, q: 2, when: w })),
  creak: () => tone(140, 0.4, 'sawtooth', 0.035, 0, 215),
  twang: () => {
    tone(330, 0.16, 'triangle', 0.18, 0, 150);
    noise({ dur: 0.28, vol: 0.12, type: 'bandpass', f1: 2200, f2: 500, q: 1.5, when: 0.03 });
  },
  heartHit: () => {
    tone(160, 0.22, 'sine', 0.3, 0, 55);
    [1318.5, 1760, 2093, 2637].forEach((f, i) => tone(f, 0.3, 'sine', 0.1, 0.05 + i * 0.07));
  },
  /* drinking — cheers */
  slide: () => noise({ dur: 0.4, vol: 0.08, type: 'bandpass', f1: 400, f2: 1600, q: 1 }),
  clink: () => {
    [2637, 3951, 5274].forEach((f, i) => tone(f, 0.65 - i * 0.12, 'sine', 0.15 - i * 0.03));
    tone(1319, 0.08, 'square', 0.05);
    tone(3956, 0.5, 'triangle', 0.05, 0.08);
  },
  /* lucky — slot machine */
  slotTick: () => tone(900 + rand() * 300, 0.035, 'square', 0.05),
  jackpot: () => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.07));
    [1046.5, 1318.5, 1568].forEach((f) => tone(f, 1.1, 'sine', 0.08, 0.55));
  },
  coin: () => { tone(2093, 0.08, 'square', 0.04); tone(2794, 0.25, 'square', 0.04, 0.06); },
  /* truth or dare — devil */
  giggle: () => [640, 560, 620, 520, 450].forEach((f, i) => tone(f, 0.1, 'triangle', 0.1, i * 0.1, f * 0.82)),
  charge: () => {
    noise({ dur: 0.45, vol: 0.1, type: 'lowpass', f1: 200, f2: 2600 });
    tone(90, 0.45, 'sawtooth', 0.06, 0, 420);
  },
  fireHit: () => {
    noise({ dur: 0.6, vol: 0.3, type: 'lowpass', f1: 900, f2: 120 });
    tone(90, 0.45, 'sine', 0.3, 0, 40);
  },
  /* office — stamp */
  thud: () => {
    tone(130, 0.2, 'sine', 0.4, 0, 38);
    noise({ dur: 0.08, vol: 0.2, type: 'highpass', f1: 1200 });
  },
  bell: () => { tone(2093, 0.9, 'sine', 0.16); tone(4186, 0.5, 'sine', 0.05); tone(2793, 0.4, 'sine', 0.04, 0.01); },
  /* hardcore — fireworks */
  whistle: () => {
    tone(500, 0.65, 'sine', 0.07, 0, 1700);
    noise({ dur: 0.6, vol: 0.05, type: 'highpass', f1: 2000, f2: 5000 });
  },
  boom: () => {
    noise({ dur: 0.8, vol: 0.38, type: 'lowpass', f1: 600, f2: 60 });
    tone(70, 0.6, 'sine', 0.3, 0, 30);
  },
};
