// Dosyasız ses efektleri (WebAudio sentezi)
import { Settings } from './Run.js';

let ctx = null;
function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.12, slide = null, delay = 0 } = {}) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur, { vol = 0.12, freq = 1800, q = 1, delay = 0 } = {}) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

const SOUNDS = {
  click: () => tone(660, 0.06, { type: 'triangle', vol: 0.08 }),
  pick: () => tone(520, 0.08, { type: 'triangle', slide: 780, vol: 0.1 }),
  place: () => tone(400, 0.08, { type: 'triangle', slide: 300, vol: 0.1 }),
  chop: () => noise(0.07, { vol: 0.25, freq: 2500, q: 2 }),
  sizzle: () => noise(0.35, { vol: 0.08, freq: 5000, q: 0.7 }),
  flip: () => { noise(0.12, { vol: 0.15, freq: 3500 }); tone(500, 0.1, { slide: 900, vol: 0.06 }); },
  ding: () => { tone(1320, 0.4, { vol: 0.1 }); tone(1760, 0.5, { vol: 0.06, delay: 0.05 }); },
  bell: () => { tone(988, 0.25, { type: 'triangle', vol: 0.1 }); tone(1319, 0.35, { type: 'triangle', vol: 0.08, delay: 0.12 }); },
  coin: () => { tone(988, 0.08, { type: 'square', vol: 0.05 }); tone(1319, 0.25, { type: 'square', vol: 0.05, delay: 0.08 }); },
  success: () => [523, 659, 784].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.1, delay: i * 0.08 })),
  fail: () => tone(300, 0.3, { type: 'sawtooth', slide: 150, vol: 0.06 }),
  angry: () => { tone(220, 0.2, { type: 'sawtooth', vol: 0.07 }); tone(180, 0.3, { type: 'sawtooth', vol: 0.07, delay: 0.15 }); },
  trash: () => noise(0.25, { vol: 0.15, freq: 600, q: 0.8 }),
  pour: () => noise(0.25, { vol: 0.06, freq: 900, q: 0.5 }),
  splash: () => noise(0.3, { vol: 0.15, freq: 1400, q: 0.6 }),
  stir: () => noise(0.12, { vol: 0.05, freq: 700, q: 1 }),
  pop: () => tone(700, 0.08, { slide: 1200, vol: 0.1 }),
  whoosh: () => noise(0.16, { vol: 0.12, freq: 2200, q: 0.7 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.1, delay: i * 0.12 })),
};

export function sfx(name) {
  if (!Settings.sound) return;
  try {
    SOUNDS[name]?.();
  } catch (e) {
    /* ses kullanılamıyor */
  }
}
