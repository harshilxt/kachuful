/**
 * Lightweight sound engine — no audio files. Uses the Web Audio API to
 * synthesize short effects and the SpeechSynthesis API to literally say
 * "UNO!". Everything is created lazily on first use (browsers require a
 * user gesture before audio can start).
 */

let ctx: AudioContext | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}
export function isSoundEnabled() {
  return enabled;
}

/** Call once from a user gesture (e.g. first click) to unlock audio. */
export function primeAudio() {
  ac();
  // Some browsers need a near-silent blip to fully unlock.
  try {
    const c = ac();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.02);
  } catch {
    /* ignore */
  }
}

type Wave = "sine" | "square" | "triangle" | "sawtooth";

function tone(
  freq: number,
  dur: number,
  opts: {
    type?: Wave;
    gain?: number;
    delay?: number;
    sweepTo?: number;
  } = {}
) {
  const c = ac();
  if (!c || !enabled) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, t0);
  if (opts.sweepTo) o.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + dur);
  const peak = opts.gain ?? 0.12;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain = 0.08, hp = 1200) {
  const c = ac();
  if (!c || !enabled) return;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start();
}

export const sfx = {
  /** A card sliding onto the pile. */
  play() {
    noise(0.16, 0.06, 1600);
    tone(520, 0.12, { type: "triangle", gain: 0.05, sweepTo: 300 });
  },
  /** Drawing a card from the deck. */
  draw() {
    noise(0.12, 0.05, 2000);
  },
  /** Soft click for selecting your turn / button. */
  click() {
    tone(660, 0.06, { type: "square", gain: 0.05 });
  },
  /** Your turn ping. */
  yourTurn() {
    tone(880, 0.12, { type: "sine", gain: 0.1 });
    tone(1320, 0.12, { type: "sine", gain: 0.07, delay: 0.08 });
  },
  skip() {
    tone(400, 0.18, { type: "sawtooth", gain: 0.08, sweepTo: 160 });
  },
  reverse() {
    tone(300, 0.14, { type: "triangle", gain: 0.08, sweepTo: 600 });
    tone(600, 0.14, { type: "triangle", gain: 0.06, sweepTo: 300, delay: 0.1 });
  },
  draw2() {
    tone(240, 0.1, { type: "square", gain: 0.09 });
    tone(200, 0.14, { type: "square", gain: 0.09, delay: 0.1 });
  },
  draw4() {
    [0, 0.09, 0.18, 0.27].forEach((d) =>
      tone(220, 0.1, { type: "square", gain: 0.09, delay: d })
    );
  },
  color() {
    tone(700, 0.1, { type: "sine", gain: 0.07 });
    tone(1050, 0.12, { type: "sine", gain: 0.06, delay: 0.07 });
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.22, { type: "triangle", gain: 0.11, delay: i * 0.12 })
    );
  },
  lose() {
    tone(330, 0.3, { type: "sine", gain: 0.09, sweepTo: 160 });
  },
  penalty() {
    tone(200, 0.25, { type: "sawtooth", gain: 0.09, sweepTo: 110 });
  },
};

/** Speak "UNO!" out loud (with a synth fallback chime). */
export function shoutUno() {
  // Chime first for punch.
  tone(784, 0.18, { type: "triangle", gain: 0.12 });
  tone(1175, 0.22, { type: "triangle", gain: 0.1, delay: 0.12 });
  try {
    if (!enabled) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance("UNO!");
    u.rate = 0.95;
    u.pitch = 1.1;
    u.volume = 1;
    synth.cancel();
    synth.speak(u);
  } catch {
    /* ignore */
  }
}
