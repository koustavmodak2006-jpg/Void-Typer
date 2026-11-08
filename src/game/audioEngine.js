/**
 * VOID TYPER — procedural audio engine (Web Audio API).
 *
 * Every sound is synthesized at runtime — zero audio assets, zero network.
 * Handles: master/music/SFX routing, browser autoplay unlock, voice
 * limiting (so overlapping sounds never become unpleasant) and
 * persistence of the player's audio preferences.
 */

import { loadAudioSettings, saveAudioSettings } from '../utils/storage.js';

const PENTATONIC = [220, 246.94, 293.66, 329.63, 392, 440, 493.88];
const MAX_VOICES = 14; // concurrent SFX voices before non-critical drops

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.noiseBuffer = null;
    this.voices = 0;
    this.musicNodes = null;
    this.sparkleTimer = null;
    this.settings = { enabled: true, music: true, volume: 0.7 };
    this.listeners = new Set();
    const stored = loadAudioSettings();
    if (stored) this.settings = { ...this.settings, ...stored };
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                            */
  /* ------------------------------------------------------------------ */

  /** Create the context (must be called from a user gesture). */
  init() {
    if (this.ctx) return;
    const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    this.master = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    // 1s of white noise, reused by every noisy sound.
    const len = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.applySettings(false);
  }

  /** Unlock/resume — safe to call on every pointerdown/keydown. */
  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  get running() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /* ------------------------------------------------------------------ */
  /* Routing / settings                                                   */
  /* ------------------------------------------------------------------ */

  applySettings(persist = true) {
    if (persist) saveAudioSettings(this.settings);
    if (this.master) this.master.gain.value = this.settings.enabled ? 1 : 0;
    if (this.musicBus) this.musicBus.gain.value = this.settings.music ? 0.9 : 0;
    if (this.sfxBus) this.sfxBus.gain.value = this.settings.volume;
    this.listeners.forEach((fn) => {
      try {
        fn(this.settings);
      } catch {
        /* listener errors must never break audio */
      }
    });
  }

  setEnabled(v) {
    this.settings.enabled = !!v;
    if (!v) this.stopMusic();
    this.applySettings();
  }

  setMusic(v) {
    this.settings.music = !!v;
    this.applySettings();
  }

  setVolume(v) {
    this.settings.volume = Math.min(1, Math.max(0, Number(v) || 0));
    this.applySettings();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /* ------------------------------------------------------------------ */
  /* Voice helpers                                                        */
  /* ------------------------------------------------------------------ */

  /** True if an SFX may play right now. */
  canPlay(critical = false) {
    if (!this.settings.enabled || !this.running) return false;
    if (!critical && this.voices >= MAX_VOICES) return false;
    return true;
  }

  /** Oscillator with exponential decay envelope. */
  tone({ type = 'sine', from = 440, to = null, dur = 0.15, gain = 0.2, delay = 0, bus = null }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, from), t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(bus || this.sfxBus);
    this.voices++;
    osc.onended = () => {
      this.voices--;
    };
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Filtered noise burst with decay. */
  noise({ dur = 0.4, gain = 0.4, from = 2400, to = 120, type = 'lowpass', delay = 0, q = 0.8 }) {
    if (!this.ctx || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(30, from), t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    this.voices++;
    src.onended = () => {
      this.voices--;
    };
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /* ------------------------------------------------------------------ */
  /* Game sounds                                                          */
  /* ------------------------------------------------------------------ */

  /** Correct keystroke — soft high blip (pitch drifts slightly). */
  playKeyChar() {
    if (!this.canPlay(false)) return;
    this.tone({ type: 'square', from: 640 + Math.random() * 90, dur: 0.035, gain: 0.06 });
  }

  /** Incorrect keystroke — dull low thud. */
  playKeyError() {
    if (!this.canPlay(false)) return;
    this.tone({ type: 'sawtooth', from: 170, to: 90, dur: 0.09, gain: 0.12 });
  }

  /** Laser bolt. */
  playLaser() {
    if (!this.canPlay(false)) return;
    this.tone({ type: 'sawtooth', from: 920, to: 160, dur: 0.17, gain: 0.16 });
    this.tone({ type: 'sine', from: 1800, to: 300, dur: 0.09, gain: 0.07 });
  }

  /** Enemy explosion. */
  playExplosion() {
    if (!this.canPlay(true)) return;
    this.noise({ dur: 0.5, gain: 0.5, from: 2600, to: 90 });
    this.tone({ type: 'sine', from: 82, to: 36, dur: 0.42, gain: 0.4 });
    this.tone({ type: 'triangle', from: 320, to: 60, dur: 0.22, gain: 0.14 });
  }

  /** Sector cleared. */
  playLevelUp() {
    if (!this.canPlay(true)) return;
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone({ type: 'triangle', from: f, dur: 0.22, gain: 0.16, delay: i * 0.085 });
    });
  }

  /** Countdown blip; final=true for "LAUNCH". */
  playCountdown(final = false) {
    if (final) {
      this.tone({ type: 'triangle', from: 587.33, dur: 0.16, gain: 0.22 });
      this.tone({ type: 'triangle', from: 1174.66, dur: 0.4, gain: 0.22, delay: 0.16 });
    } else {
      this.tone({ type: 'triangle', from: 587.33, dur: 0.11, gain: 0.18 });
    }
  }

  /** Mistake / SYSTEM DAMAGE — two-tone alarm. */
  playMistake() {
    if (!this.canPlay(true)) return;
    for (let i = 0; i < 3; i++) {
      this.tone({ type: 'square', from: i % 2 === 0 ? 233 : 156, dur: 0.1, gain: 0.14, delay: i * 0.11 });
    }
    this.noise({ dur: 0.3, gain: 0.16, from: 900, to: 120 });
  }

  /** Mission terminated. */
  playGameOver() {
    if (!this.canPlay(true)) return;
    [330, 262, 208, 165, 131].forEach((f, i) => {
      this.tone({ type: 'sine', from: f, dur: 0.5, gain: 0.2, delay: i * 0.24 });
    });
    this.noise({ dur: 2.2, gain: 0.22, from: 500, to: 40, delay: 0.2 });
  }

  /** UI click. */
  playUI() {
    if (!this.canPlay(false)) return;
    this.tone({ type: 'square', from: 480, to: 380, dur: 0.05, gain: 0.08 });
  }

  /* ------------------------------------------------------------------ */
  /* Ambient space music                                                  */
  /* ------------------------------------------------------------------ */

  startMusic() {
    if (!this.ctx || !this.settings.enabled || !this.settings.music) return;
    if (this.musicNodes) return; // already playing
    this.stopMusic();

    const t0 = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    filter.Q.value = 0.6;

    // Slow filter sweep LFO — gives the pad its "breathing" motion.
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(t0);

    const padGain = this.ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, t0);
    padGain.gain.linearRampToValueAtTime(0.05, t0 + 2.5);

    const oscs = [];
    [55, 82.41, 110].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = (i - 1) * 6;
      osc.connect(filter);
      osc.start(t0);
      oscs.push(osc);
    });
    filter.connect(padGain);
    padGain.connect(this.musicBus);
    this.musicNodes = { oscs, lfo, padGain, filter };

    // Sparse, dreamy pings on a slow random schedule.
    const sparkle = () => {
      if (!this.musicNodes || !this.settings.enabled || !this.settings.music) return;
      const f = PENTATONIC[(Math.random() * PENTATONIC.length) | 0];
      this.tone({ type: 'sine', from: f, dur: 2.4, gain: 0.045, bus: this.musicBus });
    };
    const schedule = () => {
      sparkle();
      this.sparkleTimer = setTimeout(schedule, 2800 + Math.random() * 4200);
    };
    this.sparkleTimer = setTimeout(schedule, 1200);
  }

  stopMusic() {
    if (this.sparkleTimer) {
      clearTimeout(this.sparkleTimer);
      this.sparkleTimer = null;
    }
    if (!this.musicNodes || !this.ctx) return;
    const { oscs, lfo, padGain } = this.musicNodes;
    const t = this.ctx.currentTime;
    try {
      padGain.gain.cancelScheduledValues(t);
      padGain.gain.setValueAtTime(Math.max(0.0001, padGain.gain.value), t);
      padGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    } catch {
      /* already stopped */
    }
    oscs.forEach((o) => {
      try {
        o.stop(t + 0.7);
      } catch {
        /* noop */
      }
    });
    try {
      lfo.stop(t + 0.7);
    } catch {
      /* noop */
    }
    this.musicNodes = null;
  }
}

export const audio = new AudioEngine();
