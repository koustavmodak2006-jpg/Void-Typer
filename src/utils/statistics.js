/**
 * VOID TYPER — statistics display helpers shared by HUD & results.
 * (Kept separate from scoring.js so React components import only
 * pure formatting, never game math with side imports.)
 */

export { formatNumber, formatTime, formatTimeLong, formatPercent, formatDate } from '../game/scoring.js';

/** Pad an integer to at least 2 digits ("7" -> "07"). */
export function pad2(n) {
  return String(Math.max(0, Math.floor(Number(n) || 0))).padStart(2, '0');
}

/** Split a live time into m / s parts for segmented HUD display. */
export function timeParts(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  return { m: Math.floor(total / 60), s: total % 60 };
}
