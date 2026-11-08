/**
 * VOID TYPER — share + PNG export of mission results.
 *
 * Pure client-side: Web Share API when available, clipboard fallback,
 * and a canvas-rendered "mission report" downloaded as PNG.
 */

import { formatTimeLong, formatPercent, formatNumber } from '../game/scoring.js';
import { getPersonalBest } from './storage.js';

/**
 * Build the plain-text share payload.
 */
export function buildShareText(stats) {
  return [
    '🚀 I just played VOID TYPER!',
    '',
    `Pilot: ${stats.playerName}`,
    `Score: ${formatNumber(stats.score)}`,
    `Words Destroyed: ${stats.wordsDestroyed}`,
    `WPM: ${Math.round(stats.wpm)}`,
    `Accuracy: ${formatPercent(stats.accuracy)}`,
    `Highest Level: ${stats.level}`,
    '',
    'Can you beat my score?',
  ].join('\n');
}

/**
 * Share via the Web Share API; falls back to clipboard copy.
 * @returns {'shared'|'copied'|'manual'|'cancelled'}
 */
export async function shareResults(stats) {
  const text = buildShareText(stats);
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'VOID TYPER — Mission Report', text });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
      // fall through to clipboard
    }
  }
  return copyToClipboard(text);
}

/**
 * Clipboard copy with a legacy execCommand fallback.
 * @returns {'copied'|'manual'}
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    /* try legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) return 'copied';
  } catch {
    /* noop */
  }
  return 'manual';
}

/* ------------------------------------------------------------------ */
/* PNG mission report                                                   */
/* ------------------------------------------------------------------ */

const W = 900;
const H = 1200;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Deterministic pseudo-random for the star backdrop. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Render the mission report card to a canvas and download it as PNG.
 * @param {Object} stats final game stats
 * @param {Object} opts { isBest: boolean }
 */
export async function downloadResultsPNG(stats, opts = {}) {
  // Wait for webfonts so the canvas text uses Orbitron / Share Tech Mono.
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch {
    /* fonts are optional — fallbacks still render */
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const cyan = '#22d3ee';
  const dim = '#94a3b8';
  const text = '#e2e8f0';
  const mono = '"Share Tech Mono", "Courier New", monospace';
  const display = 'Orbitron, "Arial Black", sans-serif';

  /* background -------------------------------------------------- */
  ctx.fillStyle = '#04060e';
  ctx.fillRect(0, 0, W, H);

  const rand = mulberry32((stats.score || 1) + stats.wordsDestroyed * 31);
  for (let i = 0; i < 170; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = rand() * 1.5 + 0.3;
    ctx.globalAlpha = 0.14 + rand() * 0.5;
    ctx.fillStyle = rand() > 0.85 ? '#67e8f9' : '#cbd5e1';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // faint grid
  ctx.strokeStyle = 'rgba(34,211,238,0.05)';
  ctx.lineWidth = 1;
  for (let x = 60; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 60; y < H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  /* frame ------------------------------------------------------- */
  ctx.strokeStyle = 'rgba(34,211,238,0.55)';
  ctx.lineWidth = 2;
  roundRect(ctx, 28, 28, W - 56, H - 56, 10);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(34,211,238,0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, 40, 40, W - 80, H - 80, 6);
  ctx.stroke();
  // corner accents
  ctx.strokeStyle = cyan;
  ctx.lineWidth = 4;
  const corners = [
    [28, 28, 1, 1],
    [W - 28, 28, -1, 1],
    [28, H - 28, 1, -1],
    [W - 28, H - 28, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * 46, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * 46);
    ctx.stroke();
  }

  /* header ------------------------------------------------------ */
  ctx.textAlign = 'center';
  ctx.fillStyle = cyan;
  ctx.font = `600 26px ${display}`;
  ctx.fillText('VOID TYPER', W / 2, 118);
  ctx.fillStyle = dim;
  ctx.font = `16px ${mono}`;
  ctx.fillText('— MISSION REPORT —', W / 2, 148);

  ctx.fillStyle = text;
  ctx.font = `700 58px ${display}`;
  ctx.fillText('MISSION TERMINATED', W / 2, 225);
  ctx.fillStyle = dim;
  ctx.font = `18px ${mono}`;
  ctx.fillText('YOUR JOURNEY THROUGH THE GALAXY HAS ENDED', W / 2, 258);

  ctx.strokeStyle = 'rgba(34,211,238,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(90, 288);
  ctx.lineTo(W - 90, 288);
  ctx.stroke();

  if (opts.isBest) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = `700 20px ${display}`;
    ctx.fillText('★ NEW PERSONAL BEST ★', W / 2, 322);
  }

  /* stat rows --------------------------------------------------- */
  const best = getPersonalBest();
  const rows = [
    ['PILOT', stats.playerName.toUpperCase(), text],
    ['FINAL SCORE', formatNumber(stats.score), cyan],
    ['WORDS DESTROYED', String(stats.wordsDestroyed), text],
    ['CORRECT WORDS', String(stats.correctWords), text],
    ['INCORRECT SUBMISSIONS', String(stats.incorrectSubmissions), text],
    ['WORDS PER MINUTE', String(Math.round(stats.wpm)), text],
    ['TYPING ACCURACY', formatPercent(stats.accuracy), text],
    ['TOTAL TIME', formatTimeLong(stats.elapsedMs), text],
    ['HIGHEST LEVEL REACHED', String(stats.level), text],
    ['TOTAL MISTAKES', `${stats.mistakes}/${3}`, '#f43f5e'],
    ['PERSONAL BEST', formatNumber(best.bestScore), '#fbbf24'],
  ];

  let y = opts.isBest ? 380 : 356;
  const step = 68;
  for (const [label, value, color] of rows) {
    ctx.textAlign = 'left';
    ctx.fillStyle = dim;
    ctx.font = `17px ${mono}`;
    ctx.fillText(label, 110, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.font = `26px ${mono}`;
    ctx.fillText(value, W - 110, y);
    ctx.strokeStyle = 'rgba(148,163,184,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(110, y + 18);
    ctx.lineTo(W - 110, y + 18);
    ctx.stroke();
    y += step;
  }

  /* footer ------------------------------------------------------ */
  ctx.textAlign = 'center';
  ctx.fillStyle = dim;
  ctx.font = `15px ${mono}`;
  const date = new Date();
  const stamp = date
    .toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .toUpperCase();
  ctx.fillText(stamp, W / 2, H - 108);
  ctx.fillStyle = 'rgba(34,211,238,0.6)';
  ctx.font = `14px ${mono}`;
  ctx.fillText('GENERATED LOCALLY • NO DATA LEAVES YOUR DEVICE', W / 2, H - 80);

  /* download ---------------------------------------------------- */
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safe = String(stats.playerName || 'pilot').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20) || 'pilot';
      a.href = url;
      a.download = `void-typer-mission-report-${safe}.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 400);
      resolve(true);
    }, 'image/png');
  });
}
