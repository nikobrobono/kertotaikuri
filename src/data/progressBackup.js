import { initialProgress } from "./progressStore.js";

const FORMAT = "kertotaikuri-progress-backup";
const VERSION = 1;
const MAX_BACKUP_BYTES = 1_000_000;
const MAX_PLAYER_NAME_LENGTH = 80;
const MAX_COLLECTION_ITEMS = 200;
const MAX_COUNTER = 1_000_000_000;
const MAX_RESPONSE_MS = 3_600_000;
const FACT_KEY = /^(?:10|[0-9])x(?:10|[0-9])$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const REWARD_ID = /^[a-z][a-z0-9-]{0,63}$/;

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const nonNegativeInteger = (value, fallback) => Number.isSafeInteger(value) && value >= 0 && value <= MAX_COUNTER
  ? value
  : fallback;

const boundedInteger = (value, minimum, maximum, fallback) => Number.isSafeInteger(value) && value >= minimum && value <= maximum
  ? value
  : fallback;

function integerList(value, minimum, maximum) {
  if (!Array.isArray(value)) return [];
  const result = [];
  for (const item of value) {
    if (result.length === MAX_COLLECTION_ITEMS) break;
    if (Number.isSafeInteger(item) && item >= minimum && item <= maximum && !result.includes(item)) result.push(item);
  }
  return result;
}

function sanitizeFactStats(value) {
  if (!isPlainObject(value)) return {};
  const result = {};
  for (const key of Object.keys(value)) {
    if (!FACT_KEY.test(key) || !isPlainObject(value[key])) continue;
    const source = value[key];
    const seen = nonNegativeInteger(source.seen, 0);
    const correct = Math.min(nonNegativeInteger(source.correct, 0), seen);
    const wrong = Math.min(nonNegativeInteger(source.wrong, Math.max(0, seen - correct)), seen);
    const fact = { seen, correct, wrong, correctStreak: Math.min(nonNegativeInteger(source.correctStreak, 0), seen) };
    if (source.lastResult === "correct" || source.lastResult === "wrong") fact.lastResult = source.lastResult;
    if (Number.isSafeInteger(source.avgResponseMs) && source.avgResponseMs >= 0 && source.avgResponseMs <= MAX_RESPONSE_MS) {
      fact.avgResponseMs = source.avgResponseMs;
    }
    result[key] = fact;
  }
  return result;
}

function isDateKey(value) {
  if (!DATE_KEY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function sanitizeDailyHistory(value) {
  if (!isPlainObject(value)) return {};
  const result = {};
  for (const key of Object.keys(value)) {
    if (Object.keys(result).length === MAX_COLLECTION_ITEMS) break;
    if (isDateKey(key) && Number.isSafeInteger(value[key]) && value[key] >= 0 && value[key] <= MAX_COUNTER) {
      result[key] = value[key];
    }
  }
  return result;
}

/** Returns a new, known-field-only representation of saved game progress. */
export function sanitizeProgress(progress) {
  const defaults = initialProgress();
  if (!isPlainObject(progress)) return defaults;

  const playerName = typeof progress.playerName === "string"
    ? progress.playerName.trim().slice(0, MAX_PLAYER_NAME_LENGTH)
    : defaults.playerName;
  return {
    playerName: playerName || defaults.playerName,
    mode: ["learn", "daily", "tables", "path"].includes(progress.mode) ? progress.mode : defaults.mode,
    selectedTable: boundedInteger(progress.selectedTable, 0, 10, defaults.selectedTable),
    unlockedLevel: boundedInteger(progress.unlockedLevel, 1, 100, defaults.unlockedLevel),
    selectedLevel: boundedInteger(progress.selectedLevel, 1, 100, defaults.selectedLevel),
    stars: nonNegativeInteger(progress.stars, defaults.stars),
    bestStreak: nonNegativeInteger(progress.bestStreak, defaults.bestStreak),
    completedLevels: integerList(progress.completedLevels, 1, 100),
    completedTables: integerList(progress.completedTables, 0, 10),
    factStats: sanitizeFactStats(progress.factStats),
    dailyHistory: sanitizeDailyHistory(progress.dailyHistory),
    selectedRewardId: typeof progress.selectedRewardId === "string" && REWARD_ID.test(progress.selectedRewardId)
      ? progress.selectedRewardId
      : defaults.selectedRewardId,
    practiceDays: nonNegativeInteger(progress.practiceDays, defaults.practiceDays)
  };
}

/** Creates the versioned JSON text that can be downloaded or copied by a caller. */
export function createProgressBackup(progress, now = new Date()) {
  const exportedAt = new Date(now);
  if (Number.isNaN(exportedAt.getTime())) throw new TypeError("Backup timestamp must be a valid date");
  return JSON.stringify({
    format: FORMAT,
    version: VERSION,
    exportedAt: exportedAt.toISOString(),
    progress: sanitizeProgress(progress)
  });
}

/** Parses a current backup or an unversioned legacy progress object. */
export function parseProgressBackup(text) {
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_BACKUP_BYTES) {
    throw new TypeError("Backup must be a non-empty JSON string under 1 MB");
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TypeError("Backup is not valid JSON");
  }
  if (!isPlainObject(parsed)) throw new TypeError("Backup must contain an object");

  if (Object.hasOwn(parsed, "version") || Object.hasOwn(parsed, "format")) {
    if (parsed.format !== FORMAT || parsed.version !== VERSION || !isPlainObject(parsed.progress)) {
      throw new TypeError("Unsupported backup format or version");
    }
    return sanitizeProgress(parsed.progress);
  }
  return sanitizeProgress(parsed);
}
