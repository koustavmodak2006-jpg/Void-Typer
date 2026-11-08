/**
 * VOID TYPER — scoring & statistics math.
 *
 *   WPM      = correctly typed characters / 5 / elapsed minutes
 *   ACCURACY = correct characters / total submitted characters × 100
 *
 * Every function guards against division by zero.
 */

import {
  POINTS_PER_CHAR,
  STREAK_BONUS_MAX,
  STREAK_BONUS_STEP,
  LEVEL_BONUS_BASE,
} from './gameConstants.js';

/** Live WPM from keystroke counts. Settles after ~2s of play. */
export function computeWpm(correctChars, elapsedMs) {
  if (elapsedMs < 2000 || correctChars <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return correctChars / 5 / minutes;
}

/** Accuracy in percent. Nothing typed yet counts as a clean 100. */
export function computeAccuracy(correctChars, totalChars) {
  if (totalChars <= 0) return 100;
  return (correctChars / totalChars) * 100;
}

/**
 * Points for destroying a word: length × base × level multiplier
 * × streak bonus (capped).
 */
export function wordScore(wordLength, level, streak) {
  const levelMult = 1 + level * 0.18;
  const streakMult = 1 + Math.min(STREAK_BONUS_MAX, streak * STREAK_BONUS_STEP);
  return Math.round(wordLength * POINTS_PER_CHAR * levelMult * streakMult);
}

/** Bonus awarded when a sector is cleared. */
export function levelBonus(levelCleared) {
  return LEVEL_BONUS_BASE * (levelCleared + 1);
}

/** 65_400 -> "65,400" */
export function formatNumber(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('en-US');
}

/** 83_452 ms -> "1:23" */
export function formatTime(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 83_452 ms -> "1m 23s" */
export function formatTimeLong(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** 96.42 -> "96%" (never "100%" unless exact). */
export function formatPercent(p) {
  return `${Math.round(Number(p) || 0)}%`;
}

/** Epoch ms -> "NOV 08 2026 14:05" */
export function formatDate(ts) {
  const d = new Date(Number(ts) || 0);
  if (Number.isNaN(d.getTime())) return '—';
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = String(d.getDate()).padStart(2, '0');
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${month} ${day} ${d.getFullYear()} ${time}`;
}
