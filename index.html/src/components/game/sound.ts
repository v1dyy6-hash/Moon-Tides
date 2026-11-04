// Tiny dependency-free synth so the game has audio feedback without
// shipping binary assets. Created lazily on first user gesture (required by
// iOS Safari autoplay policies).

let ctx: AudioContext | null = null;
let muted = false;
let ambientNodes: { stop: () => void } | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
  if (muted) stopAmbient();
}

export function isMuted() {
  return muted;
}

function tone(freq: number, duration: number, type: OscillatorType, gain: number, delay = 0) {
  const audio = getCtx();
  if (!audio || muted) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = audio.currentTime + delay;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playPearl(comboMultiplier: number) {
  const base = 660 + Math.min(comboMultiplier, 5) * 90;
  tone(base, 0.16, "sine", 0.12);
  tone(base * 1.5, 0.18, "sine", 0.07, 0.03);
}

export function playCombo() {
  tone(880, 0.12, "triangle", 0.08);
  tone(1320, 0.14, "triangle", 0.06, 0.04);
}

export function playHit() {
  const audio = getCtx();
  if (!audio || muted) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, audio.currentTime + 0.4);
  g.gain.setValueAtTime(0.18, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.45);
  osc.connect(g).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.5);
}

export function playClick() {
  tone(520, 0.08, "square", 0.05);
}

export function playChest() {
  [0, 0.08, 0.16, 0.26].forEach((d, i) => tone(520 + i * 160, 0.2, "sine", 0.09, d));
}

export function startAmbient() {
  const audio = getCtx();
  if (!audio || muted || ambientNodes) return;
  const master = audio.createGain();
  master.gain.value = 0.035;
  master.connect(audio.destination);

  const osc1 = audio.createOscillator();
  const osc2 = audio.createOscillator();
  osc1.type = "sine";
  osc2.type = "sine";
  osc1.frequency.value = 110;
  osc2.frequency.value = 164.8;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 500;
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(master);
  osc1.start();
  osc2.start();

  ambientNodes = {
    stop: () => {
      osc1.stop();
      osc2.stop();
      master.disconnect();
    },
  };
}

export function stopAmbient() {
  ambientNodes?.stop();
  ambientNodes = null;
}
