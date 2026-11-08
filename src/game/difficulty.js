/**
 * VOID TYPER — scalable difficulty algorithm.
 *
 * Everything is derived from a single `level` integer, so there is NO
 * hardcoded maximum level: level 5, 50 or 500 all produce valid configs.
 */

import { SCOUT_UNLOCK_LEVEL, DREAD_UNLOCK_LEVEL } from './gameConstants.js';

export const LEVEL_NAMES = [
  'INITIAL DEPLOYMENT', // Level 0
  'OUTER SPACE', // Level 1
  'ASTEROID BELT', // Level 2
  'DEEP SPACE', // Level 3
  'GALACTIC WAR', // Level 4
];

export function levelName(level) {
  return level < LEVEL_NAMES.length ? LEVEL_NAMES[level] : 'INFINITE SURVIVAL';
}

/**
 * Word-tier weights as a smooth function of level.
 * Asymptotic — the mix keeps shifting toward harder tiers forever,
 * but never becomes 100% expert, keeping play fair at any depth.
 */
function wordWeightsFor(level) {
  const raw = {
    easy: Math.max(0.06, 1 - level * 0.16),
    medium: Math.min(0.55, 0.22 + level * 0.1),
    hard: Math.min(0.34, level * 0.055),
    expert: Math.min(0.3, Math.max(0, (level - 3) * 0.055)),
  };
  const total = raw.easy + raw.medium + raw.hard + raw.expert;
  const weights = {};
  for (const [tier, w] of Object.entries(raw)) weights[tier] = w / total;
  return weights;
}

/**
 * Full configuration for a level.
 *  - enemySpeed: fraction of canvas height travelled per second
 *  - spawnInterval: average seconds between spawns (±20% jitter)
 *  - killsRequired: destroyed enemies needed to clear the sector
 */
export function levelConfig(level) {
  return {
    level,
    name: levelName(level),
    killsRequired: 8 + level * 3,
    enemySpeed: Math.min(0.155, 0.042 + level * 0.009),
    spawnInterval: Math.max(1.05, 3.3 - level * 0.27),
    maxConcurrent: Math.min(9, 3 + Math.floor(level / 2)),
    wordWeights: wordWeightsFor(level),
    scoutChance: level >= SCOUT_UNLOCK_LEVEL ? Math.min(0.22, 0.06 + (level - SCOUT_UNLOCK_LEVEL) * 0.03) : 0,
    dreadChance: level >= DREAD_UNLOCK_LEVEL ? Math.min(0.16, (level - DREAD_UNLOCK_LEVEL + 1) * 0.035) : 0,
    wobble: level >= 2,
  };
}

/** Speed multiplier curve used by the mistake "SYSTEM DAMAGE" penalty. */
export const PENALTY = {
  DURATION: 2.4, // seconds until full recovery
  FLOOR: 0.35, // deepest gameplay slow-down
};
