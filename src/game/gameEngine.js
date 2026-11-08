/**
 * VOID TYPER — canvas game engine.
 *
 * Framework-agnostic ES6 class. Owns the game loop (requestAnimationFrame),
 * all entities (enemies, projectiles, particles, popups), level progression,
 * the mistake/penalty system and typing statistics. React only subscribes
 * to lightweight callbacks — the loop never triggers re-renders.
 *
 * Coordinates: enemies live in FRACTIONAL space (0..1 of canvas size) so a
 * window resize never breaks gameplay; effects use pixel space.
 */

import { levelConfig, PENALTY } from './difficulty.js';
import { pickWord, resetWordHistory } from './wordGenerator.js';
import { computeWpm, computeAccuracy, wordScore, levelBonus } from './scoring.js';
import {
  MAX_MISTAKES,
  STATS_INTERVAL_MS,
  DEFENSE_LINE_FRAC,
  PLAYER_Y_FRAC,
  LASER_SPEED,
  PARTICLE_CAP,
} from './gameConstants.js';
import { audio } from './audioEngine.js';

/* ------------------------------------------------------------------ */
/* Visual definitions                                                   */
/* ------------------------------------------------------------------ */

const VARIANTS = {
  drone: { color: '#2dd4bf', scale: 1.0, speed: 1.0 },
  fighter: { color: '#fbbf24', scale: 1.05, speed: 1.0 },
  raider: { color: '#e879f9', scale: 1.08, speed: 0.92 },
  dreadnought: { color: '#f87171', scale: 1.42, speed: 0.62 },
  scout: { color: '#67e8f9', scale: 0.9, speed: 1.75 },
};

const SHIP_PATHS = {
  drone: [[0, 12], [9, -2], [4, -8], [0, -5], [-4, -8], [-9, -2]],
  fighter: [[0, 16], [5, 6], [17, -1], [10, -9], [3, -6], [-3, -6], [-10, -9], [-17, -1], [-5, 6]],
  raider: [[0, 14], [4, 4], [14, 10], [10, -4], [3, -9], [-3, -9], [-10, -4], [-14, 10], [-4, 4]],
  dreadnought: [[0, 20], [13, 10], [19, -2], [10, -13], [-10, -13], [-19, -2], [-13, 10]],
  scout: [[0, 14], [6, -4], [2, -10], [-2, -10], [-6, -4]],
};

const STAR_LAYERS = [
  { count: 70, speed: 0.004, size: 1.0, alpha: 0.5 },
  { count: 42, speed: 0.011, size: 1.5, alpha: 0.7 },
  { count: 16, speed: 0.024, size: 2.2, alpha: 0.9 },
];

let NEXT_ID = 1;

export class GameEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} callbacks { onStats, onTyping, onLevelStart, onMistake,
   *                             onWarning, onGameOver }
   */
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks;
    this.state = 'idle'; // idle | running | dying | over
    this.paused = false;
    this.reducedMotion = false;

    this.W = 1;
    this.H = 1;
    this.dpr = 1;

    this.clock = 0; // wall animation clock (never pauses)
    this.elapsedMs = 0; // gameplay time — runs during level transitions too
    this.gameTime = 0; // scaled game time (affected by speed penalty)
    this.lastT = 0;
    this.raf = 0;

    // progression
    this.level = 0;
    this.levelKills = 0;
    this.config = levelConfig(0);
    this.spawnPauseUntil = 0;
    this.nextSpawnAt = 0.6;
    this.lastSpawnTime = 0;

    // stats
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.mistakes = 0;
    this.stats = {
      totalKeystrokes: 0,
      correctKeystrokes: 0,
      incorrectKeystrokes: 0,
      correctWords: 0,
      incorrectSubmissions: 0,
      escaped: 0,
    };
    this.peakWpm = 0;

    // entities
    this.enemies = [];
    this.projectiles = [];
    this.beams = [];
    this.particles = [];
    this.rings = [];
    this.popups = [];
    this.flashes = [];
    this.stars = [];
    this.galaxies = [
      { fx: 0.16, fy: 0.22, r: 0.16, hue: '167,139,250' },
      { fx: 0.86, fy: 0.12, r: 0.12, hue: '56,189,248' },
    ];

    // player ship
    this.ship = { xFrac: 0.5, bob: 0, turretAngle: -Math.PI / 2, thrust: 0, muzzleSide: 1, visible: true };

    // combat feedback
    this.activeTargetId = null;
    this.penaltyT = 0;
    this.speedMult = 1;
    this.shake = 0;
    this.warpT = 0;
    this.lineFlash = 0;
    this.dyingT = 0;
    this.errorPulse = 0;
    this.destroyedPulse = 0;
    this._statsTimer = 0;
    this._overFired = false;

    try {
      this.reducedMotion = typeof window !== 'undefined'
        && window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      this.reducedMotion = false;
    }

    this._loop = this._loop.bind(this);
    this.resize();
    this._initStars();

    this.ro = (typeof ResizeObserver !== 'undefined')
      ? new ResizeObserver(() => this.resize())
      : null;
    if (this.ro) this.ro.observe(canvas);

    this.raf = requestAnimationFrame(this._loop);

    // Debug hook: append ?debug=1 to the URL to drive the engine from console.
    try {
      if (typeof window !== 'undefined' && window.URLSearchParams
        && new URLSearchParams(window.location.search).get('debug') === '1') {
        window.__VT__ = this;
      }
    } catch {
      /* noop */
    }
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                            */
  /* ------------------------------------------------------------------ */

  /** Begin the mission (called after the launch countdown). */
  launch(playerName) {
    this.playerName = playerName;
    resetWordHistory();
    this.state = 'running';
    this.elapsedMs = 0;
    this.gameTime = 0;
    this.nextSpawnAt = 0.6;
    this._emitTyping();
    this._emitStats();
  }

  pause() {
    if (this.state !== 'running') return;
    this.paused = true;
    audio.stopMusic();
    this._emitStats();
  }

  resume() {
    if (this.state !== 'running') return;
    this.paused = false;
    this.lastT = performance.now();
    if (audio.settings.enabled && audio.settings.music) audio.startMusic();
    this._emitStats();
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.ro) {
      try {
        this.ro.disconnect();
      } catch {
        /* noop */
      }
    }
    audio.stopMusic();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.W = Math.max(1, rect.width);
    this.H = Math.max(1, rect.height);
    this.dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.wordFont = Math.round(Math.min(19, Math.max(13, this.W * 0.017)));
  }

  _initStars() {
    this.stars = [];
    for (let l = 0; l < STAR_LAYERS.length; l++) {
      const layer = STAR_LAYERS[l];
      for (let i = 0; i < layer.count; i++) {
        this.stars.push({
          fx: Math.random(),
          fy: Math.random(),
          layer: l,
          size: layer.size * (0.7 + Math.random() * 0.6),
          tw: Math.random() * Math.PI * 2,
          hue: Math.random() > 0.88 ? (Math.random() > 0.5 ? '103,232,249' : '196,181,253') : '226,232,240',
        });
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Typing input                                                         */
  /* ------------------------------------------------------------------ */

  /** Process a single character (a–z, or any printable → error). */
  typeChar(c) {
    if (this.state !== 'running' || this.paused) return;
    this.stats.totalKeystrokes++;

    const target = this.enemies.find((e) => e.id === this.activeTargetId && !e.locked);
    if (target) {
      if (target.word[target.progress] === c) {
        this._acceptChar(target);
        return;
      }
      // Try to redirect: resume a partially typed word…
      const resume = this.enemies
        .filter((e) => !e.locked && e.progress > 0 && e.word[e.progress] === c)
        .sort((a, b) => b.yFrac - a.yFrac)[0];
      if (resume) {
        this.activeTargetId = resume.id;
        this._acceptChar(resume);
        return;
      }
      // …or lock onto a fresh enemy starting with this character.
      const fresh = this.enemies
        .filter((e) => !e.locked && e.progress === 0 && e.word[0] === c)
        .sort((a, b) => b.yFrac - a.yFrac)[0];
      if (fresh) {
        this.activeTargetId = fresh.id;
        this._acceptChar(fresh);
        return;
      }
      this._errorChar(target);
      return;
    }

    // No active target — a keystroke matching a word's first letter claims it.
    const fresh = this.enemies
      .filter((e) => !e.locked && e.word[0] === c)
      .sort((a, b) => b.yFrac - a.yFrac)[0];
    if (fresh) {
      this.activeTargetId = fresh.id;
      this._acceptChar(fresh);
    } else {
      this._errorChar(null);
    }
  }

  /** ENTER — submit the buffered word. Incorrect submissions cost a mistake. */
  submit() {
    if (this.state !== 'running' || this.paused) return;
    const target = this.enemies.find((e) => e.id === this.activeTargetId && !e.locked);
    if (target && target.progress > 0 && target.progress < target.word.length) {
      this.stats.incorrectSubmissions++;
      target.progress = 0;
      target.errorFlash = 0.35;
      this.mistake('submission');
    }
    // ENTER on an empty buffer is a no-op (never punishes accidental taps).
  }

  _acceptChar(enemy) {
    enemy.progress++;
    this.stats.correctKeystrokes++;
    this.ship.thrust = 1;
    audio.playKeyChar();
    if (enemy.progress >= enemy.word.length) {
      this._completeWord(enemy);
    } else {
      this._emitTyping('correct');
    }
  }

  _errorChar(target) {
    this.stats.incorrectKeystrokes++;
    this.errorPulse++;
    if (target) target.errorFlash = 0.18;
    audio.playKeyError();
    this._emitTyping('error');
  }

  _completeWord(enemy) {
    // Lock immediately — an enemy can never be destroyed twice.
    enemy.locked = true;
    this.destroyedPulse++;
    if (this.activeTargetId === enemy.id) this.activeTargetId = null;

    const from = this._shipMuzzle();
    const to = this._enemyPos(enemy);
    this.beams.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, life: 0.14, maxLife: 0.14, color: '#67e8f9' });
    this.projectiles.push({
      x: from.x,
      y: from.y,
      targetId: enemy.id,
      tx: to.x,
      ty: to.y,
      color: '#a5f3fc',
      trail: [],
    });
    this.flashes.push({ x: from.x, y: from.y, life: 0.1, maxLife: 0.1, r: 16, color: '#67e8f9' });
    audio.playLaser();
    this._autoTarget();
  }

  _autoTarget() {
    const front = this.enemies
      .filter((e) => !e.locked)
      .sort((a, b) => b.yFrac - a.yFrac)[0];
    this.activeTargetId = front ? front.id : null;
    this._emitTyping();
  }

  /* ------------------------------------------------------------------ */
  /* Mistakes / penalty / game over                                       */
  /* ------------------------------------------------------------------ */

  mistake(reason) {
    if (this.state !== 'running') return;
    this.mistakes++;
    this.streak = 0;
    // Reset (never stack) the speed penalty — predictable recovery.
    this.penaltyT = PENALTY.DURATION;
    if (!this.reducedMotion) this.shake = Math.min(20, this.shake + 14);
    audio.playMistake();
    this.cb.onMistake?.({ count: this.mistakes, reason });
    this.cb.onWarning?.(
      reason === 'breach' ? 'ENEMY BREACHED THE DEFENSE LINE' : 'INCORRECT WORD SUBMISSION',
    );
    if (this.mistakes >= MAX_MISTAKES) {
      this._die();
    } else {
      this._emitStats();
    }
  }

  _die() {
    this.state = 'dying';
    this.dyingT = 1.7;
    this.ship.visible = false;
    const sx = this.ship.xFrac * this.W;
    const sy = PLAYER_Y_FRAC * this.H;
    this._explodeAt(sx, sy, '#22d3ee', 46);
    this._explodeAt(sx, sy, '#f43f5e', 30);
    // Staggered secondary bursts for the death animation.
    this._deathBursts = [
      { at: 0.35, x: sx - 26, y: sy + 12, color: '#fbbf24' },
      { at: 0.75, x: sx + 30, y: sy - 8, color: '#f43f5e' },
    ];
    audio.stopMusic();
    audio.playGameOver();
    this.cb.onWarning?.('CRITICAL DAMAGE — MISSION TERMINATED');
  }

  /* ------------------------------------------------------------------ */
  /* Main loop                                                            */
  /* ------------------------------------------------------------------ */

  _loop(t) {
    this.raf = requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, Math.max(0, (t - this.lastT) / 1000));
    this.lastT = t;
    this.clock += dt;

    if (!this.paused) {
      this._update(dt);
      if (this.state === 'running') {
        this.elapsedMs += dt * 1000;
        this._statsTimer += dt;
        if (this._statsTimer * 1000 >= STATS_INTERVAL_MS) {
          this._statsTimer = 0;
          this._emitStats();
        }
      }
    }
    this._render();
  }

  _update(dt) {
    /* speed penalty (SYSTEM DAMAGE) — affects enemies & spawning only */
    if (this.penaltyT > 0) {
      this.penaltyT = Math.max(0, this.penaltyT - dt);
      const p = 1 - this.penaltyT / PENALTY.DURATION;
      this.speedMult = PENALTY.FLOOR + (1 - PENALTY.FLOOR) * p;
    } else {
      this.speedMult = 1;
    }
    const gameDt = dt * this.speedMult;

    /* player ship */
    const target = this.enemies.find((e) => e.id === this.activeTargetId && !e.locked);
    if (target) {
      this.ship.xFrac += (target.xFrac - this.ship.xFrac) * Math.min(1, dt * 3.2);
      const sp = this._enemyPos(target);
      this.ship.turretAngle = Math.atan2(sp.y - PLAYER_Y_FRAC * this.H, sp.x - this.ship.xFrac * this.W);
    } else {
      this.ship.xFrac += (0.5 - this.ship.xFrac) * Math.min(1, dt * 1.2);
      this.ship.turretAngle = -Math.PI / 2;
    }
    this.ship.xFrac = Math.min(0.92, Math.max(0.08, this.ship.xFrac));
    this.ship.bob += dt * 2.2;
    this.ship.thrust = Math.max(0, this.ship.thrust - dt * 3.5);
    if (this.ship.visible && this.state === 'running' && !this.reducedMotion && this.particles.length < PARTICLE_CAP) {
      const sx = this.ship.xFrac * this.W;
      const sy = PLAYER_Y_FRAC * this.H + 16;
      this.particles.push({
        x: sx + (Math.random() * 8 - 4), y: sy,
        vx: (Math.random() - 0.5) * 14, vy: 60 + Math.random() * 40,
        life: 0.35, maxLife: 0.35, size: 1.6, color: '103,232,249',
      });
    }

    if (this.warpT > 0) this.warpT -= dt;
    if (this.lineFlash > 0) this.lineFlash -= dt;

    /* spawning */
    if (this.state === 'running') {
      const alive = this.enemies.filter((e) => !e.locked).length;
      const due = this.gameTime >= this.nextSpawnAt && this.gameTime >= this.spawnPauseUntil;
      if (due && alive < this.config.maxConcurrent) {
        this._spawnEnemy();
        this.lastSpawnTime = this.gameTime;
        const jitter = 0.8 + Math.random() * 0.4;
        this.nextSpawnAt = this.gameTime + this.config.spawnInterval * jitter;
      } else if (alive === 0 && this.gameTime - this.lastSpawnTime > 1.1 && this.gameTime >= this.spawnPauseUntil) {
        // Never leave the battlefield empty.
        this._spawnEnemy();
        this.lastSpawnTime = this.gameTime;
      }
      this.gameTime += gameDt;
    }

    /* enemies */
    for (const e of this.enemies) {
      if (e.locked) continue;
      e.yFrac += e.vyFrac * gameDt;
      if (this.config.wobble) {
        e.wobblePhase += dt * e.wobbleSpeed;
        e.xFrac += Math.sin(e.wobblePhase) * e.wobbleAmp * dt;
      } else {
        e.xFrac += e.drift * dt;
      }
      e.xFrac = Math.min(0.94, Math.max(0.06, e.xFrac));
      if (e.errorFlash > 0) e.errorFlash -= dt;
      if (e.spawnT < 1) e.spawnT = Math.min(1, e.spawnT + dt * 3.5);
      if (e.yFrac >= DEFENSE_LINE_FRAC && this.state === 'running') {
        // Breach!
        e.breached = true;
        this.stats.escaped++;
        const p = this._enemyPos(e);
        this._explodeAt(p.x, DEFENSE_LINE_FRAC * this.H, '#f43f5e', 22);
        this.lineFlash = 0.6;
        this.mistake('breach');
      }
    }
    this.enemies = this.enemies.filter((e) => !e.breached);

    /* projectiles (homing bolts) */
    for (const p of this.projectiles) {
      const enemy = this.enemies.find((e) => e.id === p.targetId);
      if (enemy) {
        const pos = this._enemyPos(enemy);
        p.tx = pos.x;
        p.ty = pos.y;
      }
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      const step = LASER_SPEED * dt;
      if (dist <= step + 6) {
        p.hit = true;
        this._onProjectileHit(p);
      } else {
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        p.trail.push(p.x, p.y);
        if (p.trail.length > 10) p.trail.splice(0, 2);
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.hit);

    /* beams / flashes / rings / popups */
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter((b) => b.life > 0);
    for (const f of this.flashes) f.life -= dt;
    this.flashes = this.flashes.filter((f) => f.life > 0);
    for (const r of this.rings) {
      r.life -= dt;
      r.r = r.maxR * (1 - (r.life / r.maxLife) ** 2);
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const pu of this.popups) {
      pu.life -= dt;
      pu.y -= 34 * dt;
    }
    this.popups = this.popups.filter((pu) => pu.life > 0);

    /* particles */
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 1 - 2.4 * dt;
      pt.vy *= 1 - 2.4 * dt;
    }
    if (this.particles.length > PARTICLE_CAP) {
      this.particles.splice(0, this.particles.length - PARTICLE_CAP);
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);

    /* stars */
    const warpBoost = this.warpT > 0 ? 11 : 1;
    for (const s of this.stars) {
      s.fy += STAR_LAYERS[s.layer].speed * warpBoost * dt;
      s.tw += dt * (1.5 + s.layer);
      if (s.fy > 1.02) {
        s.fy = -0.02;
        s.fx = Math.random();
      }
    }

    /* dying sequence */
    if (this.state === 'dying') {
      this.dyingT -= dt;
      if (this._deathBursts && this._deathBursts.length) {
        const elapsed = 1.7 - this.dyingT;
        const fire = this._deathBursts.filter((b) => b.at <= elapsed);
        for (const b of fire) {
          this._explodeAt(b.x, b.y, b.color, 26);
        }
        this._deathBursts = this._deathBursts.filter((b) => !fire.includes(b));
      }
      if (this.dyingT <= 0 && !this._overFired) {
        this._overFired = true;
        this.state = 'over';
        this.cb.onGameOver?.(this.getFinalStats());
      }
    }

    this.shake = Math.max(0, this.shake - dt * 26);
  }

  /* ------------------------------------------------------------------ */
  /* Spawning & combat resolution                                         */
  /* ------------------------------------------------------------------ */

  _spawnEnemy() {
    const { word, tier } = pickWord(this.config.wordWeights);
    const c = this.config;

    let variant = 'drone';
    if (tier === 'easy') variant = 'drone';
    else if (tier === 'medium') variant = Math.random() < 0.25 ? 'drone' : 'fighter';
    else if (tier === 'hard') variant = 'raider';
    else variant = 'dreadnought';

    if (c.dreadChance > 0 && (tier === 'hard' || tier === 'expert') && Math.random() < c.dreadChance) {
      variant = 'dreadnought';
    } else if (c.scoutChance > 0 && (tier === 'easy' || tier === 'medium') && Math.random() < c.scoutChance) {
      variant = 'scout';
    }

    const v = VARIANTS[variant];
    // Keep some horizontal separation from live enemies.
    let xFrac = 0.08 + Math.random() * 0.84;
    for (let i = 0; i < 4; i++) {
      const clash = this.enemies.some((e) => Math.abs(e.xFrac - xFrac) < 0.11 && Math.abs(e.yFrac) < 0.2);
      if (!clash) break;
      xFrac = 0.08 + Math.random() * 0.84;
    }

    this.enemies.push({
      id: NEXT_ID++,
      word,
      tier,
      variant,
      color: v.color,
      scale: v.scale,
      xFrac,
      yFrac: -0.06,
      vyFrac: c.enemySpeed * v.speed,
      drift: (Math.random() - 0.5) * 0.012,
      wobbleAmp: this.config.wobble ? 0.02 + Math.random() * 0.03 : 0,
      wobbleSpeed: 1 + Math.random() * 1.6,
      wobblePhase: Math.random() * Math.PI * 2,
      progress: 0,
      locked: false,
      breached: false,
      errorFlash: 0,
      spawnT: 0,
    });

    if (this.activeTargetId === null) this._autoTarget();
  }

  _onProjectileHit(p) {
    const enemy = this.enemies.find((e) => e.id === p.targetId);
    this.rings.push({ x: p.tx, y: p.ty, r: 4, maxR: 44 + Math.random() * 14, life: 0.5, maxLife: 0.5, color: p.color });
    if (!enemy) return;
    this.enemies = this.enemies.filter((e) => e.id !== enemy.id);

    const pos = this._enemyPos(enemy);
    this._explodeAt(pos.x, pos.y, enemy.color, 14 + Math.round(enemy.word.length * 1.6));
    if (!this.reducedMotion) this.shake = Math.min(14, this.shake + 4);

    if (this.state !== 'running') return; // graceful finish, no scoring
    audio.playExplosion();

    this.stats.correctWords++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const gained = wordScore(enemy.word.length, this.level, this.streak);
    this.score += gained;
    this.popups.push({
      x: pos.x, y: pos.y - 18, text: `+${gained}`, life: 0.9, color: enemy.color,
    });
    if (this.streak > 0 && this.streak % 5 === 0) {
      this.popups.push({
        x: pos.x, y: pos.y - 40, text: `STREAK ×${this.streak}`, life: 1.1, color: '#fbbf24',
      });
    }

    // Level progression
    this.levelKills++;
    if (this.levelKills >= this.config.killsRequired) {
      const bonus = levelBonus(this.level);
      this.score += bonus;
      this.level++;
      this.levelKills = 0;
      this.config = levelConfig(this.level);
      this.spawnPauseUntil = this.gameTime + 1.6;
      this.warpT = 1.15;
      audio.playLevelUp();
      this.cb.onLevelStart?.({
        level: this.level,
        name: this.config.name,
        bonus,
        killsRequired: this.config.killsRequired,
      });
    }
    if (this.activeTargetId === enemy.id) this.activeTargetId = null;
    this._autoTarget();
    this._emitStats();
  }

  _explodeAt(x, y, color, count) {
    const rgb = this._rgbOf(color);
    const n = this.reducedMotion ? Math.ceil(count / 3) : count;
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= PARTICLE_CAP) break;
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 230;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.55,
        maxLife: 0.95,
        size: 1.4 + Math.random() * 2.6,
        color: rgb,
      });
    }
    this.rings.push({ x, y, r: 3, maxR: 30 + n * 0.8, life: 0.42, maxLife: 0.42, color });
    this.flashes.push({ x, y, life: 0.12, maxLife: 0.12, r: 26, color: '#ffffff' });
  }

  /* ------------------------------------------------------------------ */
  /* Stats plumbing                                                       */
  /* ------------------------------------------------------------------ */

  getStats() {
    const elapsed = this.elapsedMs;
    const wpm = computeWpm(this.stats.correctKeystrokes, elapsed);
    if (wpm > this.peakWpm) this.peakWpm = wpm;
    return {
      state: this.state,
      score: this.score,
      level: this.level,
      levelName: this.config.name,
      levelKills: this.levelKills,
      killsRequired: this.config.killsRequired,
      wordsDestroyed: this.stats.correctWords,
      wpm,
      accuracy: computeAccuracy(this.stats.correctKeystrokes, this.stats.totalKeystrokes),
      elapsedMs: elapsed,
      mistakes: this.mistakes,
      streak: this.streak,
      bestStreak: this.bestStreak,
      speedMult: this.speedMult,
    };
  }

  getFinalStats() {
    const s = this.getStats();
    return {
      playerName: this.playerName || 'PILOT',
      score: this.score,
      wordsDestroyed: this.stats.correctWords,
      correctWords: this.stats.correctWords,
      incorrectSubmissions: this.stats.incorrectSubmissions,
      escaped: this.stats.escaped,
      wpm: s.wpm,
      peakWpm: this.peakWpm,
      accuracy: s.accuracy,
      elapsedMs: this.elapsedMs,
      level: this.level,
      mistakes: this.mistakes,
      totalKeystrokes: this.stats.totalKeystrokes,
      correctKeystrokes: this.stats.correctKeystrokes,
      incorrectKeystrokes: this.stats.incorrectKeystrokes,
      bestStreak: this.bestStreak,
    };
  }

  _emitStats() {
    this.cb.onStats?.(this.getStats());
  }

  _emitTyping(event = 'none') {
    const t = this.enemies.find((e) => e.id === this.activeTargetId && !e.locked);
    this.cb.onTyping?.({
      hasTarget: !!t,
      word: t ? t.word : null,
      progress: t ? t.progress : 0,
      tier: t ? t.tier : null,
      errorPulse: this.errorPulse,
      destroyedPulse: this.destroyedPulse,
      lastEvent: event,
    });
  }

  /* ------------------------------------------------------------------ */
  /* Geometry helpers                                                     */
  /* ------------------------------------------------------------------ */

  _enemyPos(e) {
    return { x: e.xFrac * this.W, y: e.yFrac * this.H };
  }

  _shipMuzzle() {
    const x = this.ship.xFrac * this.W + this.ship.muzzleSide * 9;
    this.ship.muzzleSide *= -1;
    const y = PLAYER_Y_FRAC * this.H - 6 + Math.sin(this.ship.bob) * 3;
    return { x, y };
  }

  _rgbOf(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '255,255,255';
    const n = parseInt(m[1], 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                            */
  /* ------------------------------------------------------------------ */

  _render() {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    if (this.shake > 0.3) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    this._drawGalaxies();
    this._drawStars();
    this._drawDefenseLine();

    for (const e of this.enemies) this._drawEnemy(e);
    this._drawBeams();
    this._drawProjectiles();
    if (this.ship.visible || this.state === 'idle') this._drawPlayerShip();
    this._drawParticles();
    this._drawRings();
    this._drawFlashes();
    this._drawPopups();

    ctx.restore();
  }

  _drawGalaxies() {
    const { ctx, W, H } = this;
    for (const g of this.galaxies) {
      const r = g.r * W;
      const grad = ctx.createRadialGradient(g.fx * W, g.fy * H, 0, g.fx * W, g.fy * H, r);
      const a = 0.1 + Math.sin(this.clock * 0.24 + g.fx * 9) * 0.035;
      grad.addColorStop(0, `rgba(${g.hue},${Math.max(0.03, a)})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(g.fx * W - r, g.fy * H - r, r * 2, r * 2);
    }
  }

  _drawStars() {
    const { ctx, W, H } = this;
    const warp = this.warpT > 0;
    for (const s of this.stars) {
      const layer = STAR_LAYERS[s.layer];
      const x = s.fx * W;
      const y = s.fy * H;
      const a = layer.alpha * (0.55 + 0.45 * Math.sin(s.tw));
      if (warp) {
        const len = 14 + s.layer * 26;
        ctx.strokeStyle = `rgba(${s.hue},${a})`;
        ctx.lineWidth = s.size * 0.9;
        ctx.beginPath();
        ctx.moveTo(x, y - len);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(${s.hue},${a})`;
        ctx.fillRect(x, y, s.size, s.size);
      }
    }
  }

  _drawDefenseLine() {
    const { ctx, W, H } = this;
    const y = DEFENSE_LINE_FRAC * H;
    const pulse = 0.35 + 0.2 * Math.sin(this.clock * 2.4);
    const red = this.lineFlash > 0 ? Math.min(0.85, this.lineFlash * 1.6) : 0;

    // breach zone gradient
    const grad = ctx.createLinearGradient(0, y, 0, H);
    grad.addColorStop(0, `rgba(244,63,94,${0.05 + red * 0.16})`);
    grad.addColorStop(1, 'rgba(244,63,94,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, H - y);

    ctx.save();
    ctx.strokeStyle = `rgba(${red > 0.1 ? '244,63,94' : '34,211,238'},${pulse + red * 0.4})`;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = red > 0.1 ? '#f43f5e' : '#22d3ee';
    ctx.shadowBlur = 8 + red * 14;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.setLineDash([]);
    // tick marks
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(34,211,238,${0.25 + red * 0.3})`;
    for (let x = 8; x < W; x += 46) {
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawEnemy(e) {
    const { ctx } = this;
    const pos = this._enemyPos(e);
    const path = SHIP_PATHS[e.variant];
    const scale = e.scale * (0.6 + 0.4 * e.spawnT);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);

    // engine exhaust (drawn above the hull — ship flies downward)
    const exhaust = 8 + Math.sin(this.clock * 21 + e.id) * 3;
    ctx.globalCompositeOperation = 'lighter';
    const eg = ctx.createLinearGradient(0, -8, 0, -8 - exhaust);
    eg.addColorStop(0, this._rgba(e.color, 0.75));
    eg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.moveTo(-3.5, -8);
    ctx.lineTo(0, -8 - exhaust);
    ctx.lineTo(3.5, -8);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // hull
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10,16,32,0.92)';
    ctx.strokeStyle = e.errorFlash > 0 ? '#ffffff' : e.color;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = e.locked ? 4 : 12;
    ctx.fill();
    ctx.stroke();

    // cockpit core
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = e.errorFlash > 0 ? '#f43f5e' : e.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();

    if (!e.locked) this._drawEnemyWord(e, pos);
  }

  _drawEnemyWord(e, pos) {
    const { ctx, W } = this;
    const isActive = e.id === this.activeTargetId;
    const baseY = pos.y - 34 * e.scale - 10;
    const y = Math.max(22, baseY);

    ctx.save();
    ctx.font = `600 ${this.wordFont}px "Share Tech Mono","JetBrains Mono",monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const charW = ctx.measureText('M').width;
    const totalW = e.word.length * charW;
    const startX = Math.max(10 + totalW / 2, Math.min(W - 10 - totalW / 2, pos.x));

    // backdrop plate
    ctx.fillStyle = 'rgba(4,6,14,0.66)';
    ctx.fillRect(startX - totalW / 2 - 7, y - this.wordFont * 0.75, totalW + 14, this.wordFont * 1.5);

    for (let i = 0; i < e.word.length; i++) {
      const x = startX - totalW / 2 + charW * (i + 0.5);
      let color;
      let alpha = isActive ? 1 : 0.62;
      if (e.errorFlash > 0) {
        color = '#f43f5e';
      } else if (i < e.progress) {
        color = '#22d3ee'; // correctly typed — subtle highlight
      } else if (isActive && i === e.progress) {
        color = '#ffffff'; // next expected character
      } else {
        color = '#cbd5e1';
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      if (isActive && i === e.progress) {
        ctx.shadowColor = '#67e8f9';
        ctx.shadowBlur = 9;
        // pulsing underline on the next character
        const uw = 0.55 + 0.45 * Math.sin(this.clock * 6);
        ctx.fillRect(x - charW * 0.38, y + this.wordFont * 0.72, charW * 0.76 * uw, 2);
      } else if (i < e.progress) {
        ctx.shadowColor = 'rgba(34,211,238,0.8)';
        ctx.shadowBlur = 6;
      }
      ctx.fillText(e.word[i], x, y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // active target brackets
    if (isActive) {
      const bw = totalW / 2 + 13;
      const bh = this.wordFont * 0.85;
      ctx.strokeStyle = 'rgba(103,232,249,0.9)';
      ctx.lineWidth = 1.4;
      const corners = [
        [-bw, -bh, 1, 1],
        [bw, -bh, -1, 1],
        [-bw, bh, 1, -1],
        [bw, bh, -1, -1],
      ];
      for (const [cx, cy, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(startX + cx + sx * 6, y + cy);
        ctx.lineTo(startX + cx, y + cy);
        ctx.lineTo(startX + cx, y + cy + sy * 6);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawBeams() {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.beams) {
      const a = b.life / b.maxLife;
      ctx.strokeStyle = `rgba(103,232,249,${a * 0.8})`;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawProjectiles() {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.projectiles) {
      // trail
      if (p.trail.length >= 4) {
        ctx.strokeStyle = 'rgba(34,211,238,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.trail[0], p.trail[1]);
        for (let i = 2; i < p.trail.length; i += 2) ctx.lineTo(p.trail[i], p.trail[i + 1]);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      // bolt
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.4, 'rgba(165,243,252,0.9)');
      grad.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawPlayerShip() {
    const { ctx } = this;
    const x = this.ship.xFrac * this.W;
    const y = PLAYER_Y_FRAC * this.H + Math.sin(this.ship.bob) * 3;

    ctx.save();
    ctx.translate(x, y);

    // engine flames (two nozzles)
    ctx.globalCompositeOperation = 'lighter';
    const flame = 11 + Math.sin(this.clock * 26) * 2.4 + this.ship.thrust * 9;
    for (const nx of [-4.5, 4.5]) {
      const fg = ctx.createLinearGradient(0, 15, 0, 15 + flame);
      fg.addColorStop(0, 'rgba(103,232,249,0.9)');
      fg.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(nx - 2.6, 15);
      ctx.lineTo(nx, 15 + flame);
      ctx.lineTo(nx + 2.6, 15);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // hull
    const path = [
      [0, -24], [4, -10], [6, -2], [18, 4], [18, 10], [8, 8],
      [5, 14], [-5, 14], [-8, 8], [-18, 10], [-18, 4], [-6, -2], [-4, -10],
    ];
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
    ctx.closePath();
    ctx.fillStyle = 'rgba(13,22,44,0.96)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.7;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // purple wing accents
    ctx.strokeStyle = 'rgba(167,139,250,0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-16, 5);
    ctx.lineTo(-7, 7);
    ctx.moveTo(16, 5);
    ctx.lineTo(7, 7);
    ctx.stroke();

    // cockpit
    ctx.beginPath();
    ctx.ellipse(0, -8, 3.4, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#67e8f9';
    ctx.shadowColor = '#67e8f9';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // aiming turrets
    for (const tx of [-9, 9]) {
      ctx.save();
      ctx.translate(tx, 4);
      ctx.rotate(this.ship.turretAngle + Math.PI / 2);
      ctx.fillStyle = '#a5f3fc';
      ctx.fillRect(-1.4, -7, 2.8, 9);
      ctx.restore();
    }
    ctx.restore();
  }

  _drawParticles() {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawRings() {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const a = Math.max(0, r.life / r.maxLife);
      ctx.strokeStyle = this._rgba(r.color, a * 0.8);
      ctx.lineWidth = 2 + a * 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, Math.max(1, r.r), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawFlashes() {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flashes) {
      const a = Math.max(0, f.life / f.maxLife);
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      grad.addColorStop(0, this._rgba(f.color, a * 0.85));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawPopups() {
    const { ctx } = this;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 15px "Share Tech Mono","JetBrains Mono",monospace';
    for (const p of this.popups) {
      const a = Math.min(1, p.life / 0.5);
      ctx.fillStyle = this._rgba(p.color, a);
      ctx.shadowColor = this._rgba(p.color, a * 0.8);
      ctx.shadowBlur = 8;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
  }

  _rgba(hex, alpha) {
    return `rgba(${this._rgbOf(hex)},${alpha})`;
  }
}
