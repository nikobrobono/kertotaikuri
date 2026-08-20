import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS, canCompleteLevel } from "../src/domain/curriculum.js";
import { createQuestion, createTableQuestion, difficultFacts, difficultyWeight, recordFact } from "../src/domain/question.js";
import { hintFor, hintsFor } from "../src/domain/hints.js";
import { finalePoints } from "../src/domain/finaleScoring.js";
import { initialProgress, loadProgress, resetProgress, saveProgress } from "../src/data/progressStore.js";

test("loppupelissä kysytään kaikkia 0–10 kertotauluja", () => {
  assert.deepEqual(LEVELS.at(-1).tables, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("kysymys pysyy valitun tason alueella", () => {
  const question = createQuestion(LEVELS[1], {}, () => 0.99);
  assert.ok([5, 10].includes(question.a));
  assert.ok(question.b >= 0 && question.b <= 10);
  assert.equal(question.answer, question.a * question.b);
});

test("yhden kertotaulun harjoitus ei sekoita muita tauluja", () => {
  const asked = [];
  const questions = Array.from({ length: 11 }, () => {
    const question = createTableQuestion(7, asked, {}, () => 0);
    asked.push(question.key);
    return question;
  });
  assert.ok(questions.every((question) => question.a === 7));
  assert.deepEqual(questions.map((question) => question.b).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("heikosti osattu lasku saa suuremman painon", () => {
  const stats = { "2x3": { seen: 4, correct: 0 } };
  const updated = recordFact(stats, { key: "2x3" }, true);
  assert.deepEqual(updated["2x3"], { seen: 5, correct: 1, wrong: 4, correctStreak: 1, lastResult: "correct" });
  assert.deepEqual(stats["2x3"], { seen: 4, correct: 0 });
  assert.ok(difficultyWeight({ seen: 3, correct: 0, wrong: 3, lastResult: "wrong" }) > difficultyWeight({ seen: 3, correct: 3, wrong: 0, correctStreak: 3 }));
});

test("vastausajasta kertyy keskiarvo taitoluokitusta varten", () => {
  let stats = recordFact({}, { key: "7x8" }, true, 4000);
  stats = recordFact(stats, { key: "7x8" }, true, 2000);
  assert.equal(stats["7x8"].avgResponseMs, 3000);
});

test("vaikeimmat laskut voidaan näyttää harjoitteluraportissa", () => {
  const facts = {
    "7x8": { seen: 4, correct: 1, wrong: 3, lastResult: "wrong" },
    "2x3": { seen: 5, correct: 5, wrong: 0, correctStreak: 5 },
    "6x9": { seen: 4, correct: 2, wrong: 2, lastResult: "correct" }
  };
  assert.deepEqual(difficultFacts(facts), ["7 × 8", "6 × 9"]);
});

test("taso vaatii tavoitemäärän ja 80 prosentin tarkkuuden", () => {
  assert.equal(canCompleteLevel({ total: 10, correct: 8, goal: 10 }), true);
  assert.equal(canCompleteLevel({ total: 10, correct: 7, goal: 10 }), false);
  assert.equal(canCompleteLevel({ total: 9, correct: 9, goal: 10 }), false);
});

test("vinkit opettavat laskustrategioita", () => {
  assert.match(hintFor(9, 7), /7 × 10 = 70/);
  assert.match(hintFor(7, 8), /7 × 4 = 28/);
  assert.match(hintFor(0, 9), /0 pussia/);
  assert.match(hintFor(3, 6), /5 × 3 = 15/);
  assert.match(hintFor(4, 4), /4 \+ 4 = 8/);
});

test("vaikeaan laskuun tarjotaan useita erilaisia ajattelutapoja", () => {
  const hints = hintsFor(7, 8);
  assert.equal(hints.length, 3);
  assert.match(hints[0], /40 \+ 16 = 56/);
  assert.match(hints[1], /28 \+ 28 = 56/);
  assert.match(hints[2], /64 − 8 = 56/);
  assert.deepEqual(hintsFor(8, 7), hints);
});

test("tallennus ja nollaus koskevat vain pelin omaa avainta", () => {
  const values = new Map([["toinen-sovellus", "säilytä"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  saveProgress({ unlockedLevel: 3, stars: 42 }, storage);
  assert.equal(loadProgress(storage).stars, 42);
  resetProgress(storage);
  assert.equal(values.get("toinen-sovellus"), "säilytä");
});

test("oletusprofiili on Eelin", () => {
  assert.equal(initialProgress().playerName, "Eelin");
});

test("Grande finalen pisteet palkitsevat nopeudesta ja vähentävät virheestä", () => {
  assert.equal(finalePoints(2500, true), 5);
  assert.equal(finalePoints(5000, true), 4);
  assert.equal(finalePoints(9000, true), 3);
  assert.equal(finalePoints(12000, true), 2);
  assert.equal(finalePoints(1000, false), -2);
});
