/**
 * VOID TYPER — word generator.
 *
 * Draws words from the tiered dictionary using the level's tier weights,
 * avoiding recently used words (FIFO memory) so repeats stay rare.
 */

import { WORD_POOLS } from '../data/words.js';
import { RECENT_WORD_LIMIT } from './gameConstants.js';

const recent = [];

function weightedTier(weights) {
  let r = Math.random();
  for (const [tier, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return tier;
  }
  // Numerical-safety fallback: last non-zero tier.
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  return entries.length ? entries[entries.length - 1][0] : 'easy';
}

/**
 * @param {Object} weights tier weights, e.g. { easy: .8, medium: .2, hard: 0, expert: 0 }
 * @returns {{ word: string, tier: string }}
 */
export function pickWord(weights) {
  const tier = weightedTier(weights);
  const pool = WORD_POOLS[tier];
  if (!pool || pool.length === 0) {
    return { word: WORD_POOLS.easy[0], tier: 'easy' };
  }
  // Try up to 10 draws to dodge recently used words.
  let word = pool[(Math.random() * pool.length) | 0];
  for (let i = 0; i < 10 && recent.includes(word); i++) {
    word = pool[(Math.random() * pool.length) | 0];
  }
  recent.push(word);
  if (recent.length > RECENT_WORD_LIMIT) recent.shift();
  return { word, tier };
}

/** Clear history (called on mission start). */
export function resetWordHistory() {
  recent.length = 0;
}
