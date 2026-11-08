/**
 * VOID TYPER — global game constants
 * Pure ES module, no dependencies.
 */

/** Maximum mistakes before MISSION TERMINATED */
export const MAX_MISTAKES = 3;

/** HUD statistics push interval (ms) — keeps React re-renders cheap */
export const STATS_INTERVAL_MS = 150;

/** Countdown sequence shown before launch */
export const COUNTDOWN_SEQUENCE = ['3', '2', '1', 'LAUNCH'];
export const COUNTDOWN_STEP_MS = 800;
export const LAUNCH_HOLD_MS = 700;

/** Vertical layout of the battlefield (fractions of canvas height) */
export const DEFENSE_LINE_FRAC = 0.82; // enemies below this line have breached
export const PLAYER_Y_FRAC = 0.9;

/** Projectile speed (px/sec, absolute — short travel distance) */
export const LASER_SPEED = 2400;

/** Global particle budget — protects low-end devices */
export const PARTICLE_CAP = 380;

/** Scoring tuning */
export const STREAK_BONUS_STEP = 0.04; // +4% per consecutive kill
export const STREAK_BONUS_MAX = 0.5; // capped at +50%
export const LEVEL_BONUS_BASE = 100; // sector-clear bonus = base * (level+1)
export const POINTS_PER_CHAR = 12;

/** Enemy variants unlocked per level */
export const SCOUT_UNLOCK_LEVEL = 3;
export const DREAD_UNLOCK_LEVEL = 4;

/** Recent-word memory (avoids repeats) */
export const RECENT_WORD_LIMIT = 40;

/** Records cap in localStorage */
export const MAX_RECORDS = 200;
