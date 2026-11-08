/**
 * VOID TYPER — LocalStorage persistence layer.
 *
 * Fully defensive: every read/write is wrapped so private-mode browsers,
 * quota errors, corrupted JSON or shape-drifted records can never crash
 * the game. Records are browser/device specific by design.
 */

import { MAX_RECORDS } from '../game/gameConstants.js';

const RECORDS_KEY = 'voidtyper:records:v1';
const AUDIO_KEY = 'voidtyper:audio:v1';
const PLAYER_KEY = 'voidtyper:player:v1';

function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null; // corrupted entry — treat as absent
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // storage full / private mode — degrade silently
  }
}

function uid() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* noop */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const NUM_FIELDS = [
  'score',
  'wordsDestroyed',
  'correctWords',
  'incorrectSubmissions',
  'wpm',
  'accuracy',
  'level',
  'elapsedMs',
  'mistakes',
];

/** Validate + normalize a stored record; null when unusable. */
function normalizeRecord(raw, i) {
  if (!raw || typeof raw !== 'object') return null;
  const rec = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `r${i}-${uid()}`,
    playerName: String(raw.playerName || 'PILOT').slice(0, 20),
    createdAt: Number(raw.createdAt) || Date.now(),
  };
  for (const f of NUM_FIELDS) {
    rec[f] = Number(raw[f]) || 0;
  }
  return rec;
}

/* ------------------------------------------------------------------ */
/* Mission records                                                      */
/* ------------------------------------------------------------------ */

/** All completed sessions, newest first. Always returns a valid array. */
export function getRecords() {
  const raw = safeGet(RECORDS_KEY);
  if (!Array.isArray(raw)) {
    if (raw !== null) safeSet(RECORDS_KEY, []); // repair corrupted blob
    return [];
  }
  return raw
    .map(normalizeRecord)
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_RECORDS);
}

/** Persist the list (clamped to MAX_RECORDS). */
function saveRecords(records) {
  return safeSet(RECORDS_KEY, records.slice(0, MAX_RECORDS));
}

/**
 * Store one completed session. Returns the stored record (with id) and
 * whether it set a new personal best score.
 */
export function addRecord(input) {
  const rec = normalizeRecord({ ...input, createdAt: Date.now() }, 0);
  rec.id = uid();
  const prevBest = getPersonalBest().bestScore;
  const records = getRecords();
  records.unshift(rec);
  saveRecords(records);
  return { record: rec, isBest: rec.score > prevBest && records.length > 1 };
}

export function deleteRecord(id) {
  const records = getRecords().filter((r) => r.id !== id);
  saveRecords(records);
  return records;
}

export function clearRecords() {
  saveRecords([]);
}

/** Best values across all stored sessions. */
export function getPersonalBest() {
  const records = getRecords();
  const best = {
    bestScore: 0,
    bestWpm: 0,
    bestLevel: 0,
    bestAccuracy: 0,
    missionsCompleted: records.length,
    totalFlightMs: 0,
  };
  for (const r of records) {
    if (r.score > best.bestScore) best.bestScore = r.score;
    if (r.wpm > best.bestWpm) best.bestWpm = r.wpm;
    if (r.level > best.bestLevel) best.bestLevel = r.level;
    if (r.accuracy > best.bestAccuracy) best.bestAccuracy = r.accuracy;
    best.totalFlightMs += r.elapsedMs || 0;
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Smaller persisted preferences                                        */
/* ------------------------------------------------------------------ */

export function loadAudioSettings() {
  const raw = safeGet(AUDIO_KEY);
  if (!raw || typeof raw !== 'object') return null;
  return {
    enabled: !!raw.enabled,
    music: !!raw.music,
    volume: Math.min(1, Math.max(0, Number(raw.volume) || 0)),
  };
}

export function saveAudioSettings(settings) {
  safeSet(AUDIO_KEY, {
    enabled: !!settings.enabled,
    music: !!settings.music,
    volume: Math.min(1, Math.max(0, Number(settings.volume) || 0)),
  });
}

export function saveLastPlayerName(name) {
  safeSet(PLAYER_KEY, String(name || '').slice(0, 20));
}

export function getLastPlayerName() {
  const raw = safeGet(PLAYER_KEY);
  return typeof raw === 'string' ? raw.slice(0, 20) : '';
}
