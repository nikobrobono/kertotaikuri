import test from "node:test";
import assert from "node:assert/strict";
import { createProgressBackup, parseProgressBackup } from "../src/data/progressBackup.js";

test("versioned backup contains only sanitized progress fields", () => {
  const text = createProgressBackup({
    playerName: "  Aada  ", mode: "path", selectedTable: 7, unlockedLevel: 4, selectedLevel: 3,
    stars: 12, bestStreak: 5, completedLevels: [1, 1, 3], completedTables: [7],
    factStats: { "7x8": { seen: 4, correct: 1, wrong: 3, lastResult: "wrong" } },
    password: "do-not-export", sessionToken: "do-not-export"
  }, "2026-08-20T10:00:00.000Z");
  const backup = JSON.parse(text);
  assert.deepEqual(Object.keys(backup).sort(), ["exportedAt", "format", "progress", "version"]);
  assert.equal(backup.format, "kertotaikuri-progress-backup");
  assert.equal(backup.version, 1);
  assert.equal(backup.exportedAt, "2026-08-20T10:00:00.000Z");
  assert.equal("password" in backup.progress, false);
  assert.equal("sessionToken" in backup.progress, false);
  assert.deepEqual(parseProgressBackup(text).completedLevels, [1, 3]);
});

test("parser accepts legacy raw progress and fills backward-compatible fact values", () => {
  const progress = parseProgressBackup(JSON.stringify({
    playerName: "Mira", factStats: { "2x3": { seen: 5, correct: 2 } }
  }));
  assert.equal(progress.playerName, "Mira");
  assert.deepEqual(progress.factStats["2x3"], { seen: 5, correct: 2, wrong: 3, correctStreak: 0 });
  assert.equal(progress.stars, 0);
});

test("new progress fields retain only bounded daily and response-time data", () => {
  const progress = parseProgressBackup(JSON.stringify({
    mode: "daily", selectedRewardId: "golden-wand", practiceDays: 9,
    dailyHistory: { "2026-08-20": 10, "2026-02-29": 4, "not-a-date": 7, "2026-08-21": -1 },
    factStats: { "7x8": { seen: 4, correct: 3, avgResponseMs: 2840 }, "6x9": { seen: 1, avgResponseMs: 3_600_001 } }
  }));
  assert.equal(progress.mode, "daily");
  assert.equal(progress.selectedRewardId, "golden-wand");
  assert.equal(progress.practiceDays, 9);
  assert.deepEqual(progress.dailyHistory, { "2026-08-20": 10 });
  assert.equal(progress.factStats["7x8"].avgResponseMs, 2840);
  assert.equal("avgResponseMs" in progress.factStats["6x9"], false);
});

test("learn mode is accepted and unsafe reward identifiers fall back", () => {
  const progress = parseProgressBackup(JSON.stringify({ mode: "learn", selectedRewardId: "__proto__" }));
  assert.equal(progress.mode, "learn");
  assert.equal(progress.selectedRewardId, "classic");
});

test("parser rejects malformed, oversized, and unsupported backups", () => {
  assert.throws(() => parseProgressBackup("{"), TypeError);
  assert.throws(() => parseProgressBackup("x".repeat(1_000_001)), TypeError);
  assert.throws(() => parseProgressBackup(JSON.stringify({ format: "kertotaikuri-progress-backup", version: 2, progress: {} })), TypeError);
});

test("untrusted fields cannot pollute prototypes and invalid values are discarded", () => {
  const progress = parseProgressBackup('{"__proto__":{"polluted":true},"stars":-1,"factStats":{"__proto__":{"polluted":true},"7x8":{"seen":4,"correct":99},"bad":{"seen":1}}}');
  assert.equal({}.polluted, undefined);
  assert.equal(progress.stars, 0);
  assert.deepEqual(progress.factStats, { "7x8": { seen: 4, correct: 4, wrong: 0, correctStreak: 0 } });
});
