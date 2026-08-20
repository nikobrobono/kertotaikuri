import test from "node:test";
import assert from "node:assert/strict";
import { classifyMastery, masteryGrid, masterySummary, summary } from "../src/domain/mastery.js";

test("classifyMastery distinguishes unseen, learning, known and fluent facts", () => {
  assert.equal(classifyMastery(), "unseen");
  assert.equal(classifyMastery({ seen: 3, correct: 3, correctStreak: 2 }), "learning");
  assert.equal(classifyMastery({ seen: 4, correct: 4, correctStreak: 3 }), "known");
  assert.equal(classifyMastery({ seen: 8, correct: 8, wrong: 0, correctStreak: 5, avgResponseMs: 4200 }), "fluent");
});

test("legacy stats derive wrong answers and do not require response-time history", () => {
  assert.equal(classifyMastery({ seen: 10, correct: 9, correctStreak: 5 }), "fluent");
  assert.equal(classifyMastery({ seen: 10, correct: 9, wrong: 2, correctStreak: 5 }), "known");
  assert.equal(classifyMastery({ seen: 10, correct: 10, correctStreak: 6, avgResponseMs: 5001 }), "known");
});

test("masteryGrid creates an independent 11 by 11 status grid", () => {
  const stats = { "2x3": { seen: 4, correct: 4, correctStreak: 3 } };
  const grid = masteryGrid(stats);
  assert.equal(grid.length, 11);
  assert.ok(grid.every((row) => row.length === 11));
  assert.equal(grid[2][3], "known");
  assert.equal(grid[3][2], "unseen");
  assert.deepEqual(stats, { "2x3": { seen: 4, correct: 4, correctStreak: 3 } });
});

test("masterySummary aggregates each table and all 121 facts", () => {
  const report = masterySummary({
    "0x0": { seen: 1, correct: 0 },
    "0x1": { seen: 4, correct: 4, correctStreak: 3 },
    "1x0": { seen: 8, correct: 8, wrong: 0, correctStreak: 5, avgResponseMs: 3000 }
  });

  assert.deepEqual(report.tables[0], { table: 0, total: 11, unseen: 9, learning: 1, known: 1, fluent: 0 });
  assert.deepEqual(report.tables[1], { table: 1, total: 11, unseen: 10, learning: 0, known: 0, fluent: 1 });
  assert.deepEqual(report.total, { total: 121, unseen: 118, learning: 1, known: 1, fluent: 1 });
  assert.equal(summary, masterySummary);
});
