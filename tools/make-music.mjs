// Original French-house style track (filtered chord stabs, sidechain pump, 4/4 kick).
// 122 BPM-ish feel locked to 120 BPM so beats land on 0.5 s for the visuals.
import { writeFileSync } from "node:fs";

const SR = 44100;
const DUR = 30;
const N = SR * DUR;
const BEAT = 0.5;
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 7;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Arrangement (seconds)
const KICK_IN = 4, HAT_IN = 8, BREAK_START = 13, DROP = 15, OUTRO = 27;

// Progression, 2 s (one bar) per chord: Dm9, G13, Cmaj9, Am9
const chords = [
  [50, 53, 57, 60, 64],
  [43, 53, 59, 64, 69],
  [48, 52, 55, 59, 62],
  [45, 52, 55, 60, 59 + 12],
];
const roots = [38, 43, 36, 33];

// Sidechain envelope: duck right after every kick
function pump(t) {
  if (t < KICK_IN || (t >= BREAK_START && t < DROP)) return 1;
  const ph = (t % BEAT) / BEAT;
  return 0.25 + 0.75 * Math.min(1, ph / 0.55);
}

// Chord stabs through a sweeping resonant low-pass (state-variable)
{
  let lp = 0, bp = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const bar = Math.floor(t / 2) % 4;
    const notes = chords[bar];
    let s = 0;
    for (let k = 0; k < notes.length; k++) {
      const f = mtof(notes[k] + 12);
      for (const det of [-0.08, 0.08]) {
        const ph = (t * f * (1 + det / 100 * 12)) % 1;
        s += (ph * 2 - 1) * 0.06;
      }
    }
    // filter sweep: closed in intro, opening into the drop, wide open after
    let cut;
    if (t < BREAK_START) cut = 300 + (t / BREAK_START) * 1800;
    else if (t < DROP) cut = 2100 + ((t - BREAK_START) / 2) * 3500;
    else cut = 2600 + 1800 * (0.5 + 0.5 * Math.sin((t - DROP) * 0.9));
    const fc = 2 * Math.sin(Math.PI * Math.min(cut, 8000) / SR);
    const q = 0.35;
    lp += fc * bp;
    const hp = s - lp - q * bp;
    bp += fc * hp;
    // 8th-note stab gating gives the "chopped sample" feel
    const eighth = (t % 0.25) / 0.25;
    const gate = t < KICK_IN ? 0.9 : eighth < 0.7 ? 1 : 0.35;
    const v = lp * gate * pump(t) * (t > OUTRO ? Math.max(0, 1 - (t - OUTRO) / 3) : 1);
    const pan = 0.5 + 0.2 * Math.sin(t * 1.3);
    L[i] += v * (1 - pan) * 1.4;
    R[i] += v * pan * 1.4;
  }
}

// Kick: pitched sine drop
for (let b = 0; b * BEAT < DUR; b++) {
  const t0 = b * BEAT;
  if (t0 < KICK_IN || (t0 >= BREAK_START && t0 < DROP) || t0 >= OUTRO + 2) continue;
  const start = Math.floor(t0 * SR);
  let ph = 0;
  for (let j = 0; j < SR * 0.35 && start + j < N; j++) {
    const tt = j / SR;
    const f = 45 + 110 * Math.exp(-tt * 28);
    ph += f / SR;
    const v = Math.sin(2 * Math.PI * ph) * Math.exp(-tt * 7) * 0.9;
    L[start + j] += v;
    R[start + j] += v;
  }
}

// Off-beat open hat + 16th closed hats after the drop
{
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const n = rand();
    const hpN = n - prev;
    prev = n;
    let v = 0;
    if (t >= HAT_IN && !(t >= BREAK_START && t < DROP) && t < OUTRO + 1) {
      const off = (t + BEAT / 2) % BEAT;
      v += hpN * Math.exp(-off * 18) * 0.18;
      if (t >= DROP) {
        const s16 = t % 0.125;
        v += hpN * Math.exp(-s16 * 90) * 0.07;
      }
    }
    L[i] += v * 0.9;
    R[i] += v * 1.1;
  }
}

// Bass: octave-jumping saw on 8ths, low-passed
{
  let lp = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    if (t < HAT_IN || (t >= BREAK_START && t < DROP) || t >= OUTRO + 1) continue;
    const bar = Math.floor(t / 2) % 4;
    const step = Math.floor(t / 0.25) % 2;
    const f = mtof(roots[bar] + (step ? 12 : 0));
    const ph = (t * f) % 1;
    const s = ph * 2 - 1;
    lp += 0.06 * (s - lp);
    const env = Math.exp(-((t % 0.25)) * 6);
    const v = lp * env * 0.55 * pump(t);
    L[i] += v;
    R[i] += v;
  }
}

// Riser into the drop: noise with rising band
{
  let lp = 0;
  for (let i = Math.floor(11 * SR); i < DROP * SR; i++) {
    const t = i / SR;
    const k = (t - 11) / (DROP - 11);
    lp += (0.02 + k * 0.5) * (rand() - lp);
    const v = lp * k * k * 0.35;
    L[i] += v;
    R[i] += v;
  }
}

// Master: soft clip + fade in/out
const data = Buffer.alloc(44 + N * 4);
data.write("RIFF", 0); data.writeUInt32LE(36 + N * 4, 4); data.write("WAVE", 8);
data.write("fmt ", 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write("data", 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.5, (DUR - t) / 1.5);
  const l = Math.tanh(L[i] * 1.1) * fade * 0.9;
  const r = Math.tanh(R[i] * 1.1) * fade * 0.9;
  data.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
}
writeFileSync(new URL("../assets/music.wav", import.meta.url), data);
console.log("wrote assets/music.wav");
