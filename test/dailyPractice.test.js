import test from "node:test";
import assert from "node:assert/strict";
import { COSMETIC_REWARDS, createDailyPractice, unlockedRewards } from "../src/domain/dailyPractice.js";

test("päiväharjoitus sisältää aina kymmenen kelvollista tehtävää", () => {
  const practice = createDailyPractice({ "2x3": { seen: 2, correct: 1, wrong: 1 } }, () => 0);
  assert.equal(practice.length, 10);
  assert.ok(practice.every(({ a, b, answer, key }) => a >= 0 && a <= 10 && b >= 0 && b <= 10 && answer === a * b && key === `${a}x${b}`));
});

test("päiväharjoitus ottaa mukaan opitun kertauksen", () => {
  const practice = createDailyPractice({
    "4x5": { seen: 5, correct: 5, wrong: 0, correctStreak: 5 },
    "7x8": { seen: 3, correct: 0, wrong: 3, lastResult: "wrong" }
  }, () => 0);
  assert.ok(practice.some((question) => question.key === "4x5"));
});

test("virheellinen fakta valitaan ennen vahvaa faktaa samalla satunnaisluvulla", () => {
  const stats = {
    "1x1": { seen: 5, correct: 5, wrong: 0 },
    "9x9": { seen: 5, correct: 0, wrong: 5, lastResult: "wrong" }
  };
  const practice = createDailyPractice(stats, () => 0.5);
  assert.equal(practice[0].key, "1x1"); // varattu opittu kertaus
  assert.equal(practice[1].key, "9x9");
});

test("harjoitus tuo korkeintaan yhden uuden faktan", () => {
  const stats = Object.fromEntries(
    Array.from({ length: 10 }, (_, b) => [`2x${b}`, { seen: 1, correct: 1, wrong: 0 }])
  );
  const practice = createDailyPractice(stats, () => 0.4);
  const newKeys = new Set(practice.filter((question) => !stats[question.key]).map((question) => question.key));
  assert.ok(newKeys.size <= 1);
});

test("kosmeettiset palkinnot avautuvat tähdillä ja suoritetuilla tauluilla", () => {
  assert.deepEqual(unlockedRewards(0, []).map(({ id }) => id), ["classic"]);
  assert.deepEqual(unlockedRewards(30, [0, 1, 2, 3, 4, 5]).map(({ id }) => id), ["classic", "sparkles", "forest", "golden-wand"]);
  assert.equal(unlockedRewards(60, 11).length, COSMETIC_REWARDS.length);
});
