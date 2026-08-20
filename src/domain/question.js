const keyOf = (a, b) => `${a}x${b}`;

export function difficultyWeight(stats = {}) {
  const seen = stats.seen ?? 0;
  if (seen === 0) return 6;
  const correct = stats.correct ?? 0;
  const wrong = stats.wrong ?? Math.max(0, seen - correct);
  const accuracy = correct / seen;
  const recentPenalty = stats.lastResult === "wrong" ? 3 : 0;
  const masteryDiscount = Math.min(2, stats.correctStreak ?? 0);
  return Math.max(1, Math.min(10, 1 + Math.round((1 - accuracy) * 6) + Math.min(3, wrong) + recentPenalty - masteryDiscount));
}

export function createQuestion(level, factStats = {}, random = Math.random, previousKey = "") {
  const candidates = [];
  for (const table of level.tables) {
    for (let multiplier = 0; multiplier <= 10; multiplier += 1) {
      const stats = factStats[keyOf(table, multiplier)] ?? { seen: 0, correct: 0 };
      const weight = difficultyWeight(stats);
      for (let i = 0; i < weight; i += 1) candidates.push({ a: table, b: multiplier });
    }
  }
  let choice = candidates[Math.floor(random() * candidates.length)];
  if (candidates.length > 1 && keyOf(choice.a, choice.b) === previousKey) {
    choice = candidates[(candidates.indexOf(choice) + 1) % candidates.length];
  }
  return { ...choice, answer: choice.a * choice.b, key: keyOf(choice.a, choice.b) };
}

export function createTableQuestion(table, askedKeys = [], factStats = {}, random = Math.random, previousKey = "") {
  const unseen = Array.from({ length: 11 }, (_, multiplier) => multiplier)
    .filter((multiplier) => !askedKeys.includes(keyOf(table, multiplier)));
  if (unseen.length) {
    const b = unseen[Math.floor(random() * unseen.length)];
    return { a: table, b, answer: table * b, key: keyOf(table, b) };
  }
  return createQuestion({ tables: [table] }, factStats, random, previousKey);
}

export function recordFact(stats, question, correct, responseMs) {
  const previous = stats[question.key] ?? { seen: 0, correct: 0, wrong: 0, correctStreak: 0 };
  const previousWrong = previous.wrong ?? Math.max(0, previous.seen - previous.correct);
  const elapsed = Number(responseMs);
  const previousAverage = Number(previous.avgResponseMs);
  const avgResponseMs = Number.isFinite(elapsed) && elapsed >= 0
    ? Math.round(((Number.isFinite(previousAverage) ? previousAverage * previous.seen : 0) + elapsed) / (previous.seen + 1))
    : previous.avgResponseMs;
  return {
    ...stats,
    [question.key]: {
      seen: previous.seen + 1,
      correct: previous.correct + (correct ? 1 : 0),
      wrong: previousWrong + (correct ? 0 : 1),
      correctStreak: correct ? (previous.correctStreak ?? 0) + 1 : 0,
      lastResult: correct ? "correct" : "wrong",
      ...(avgResponseMs == null ? {} : { avgResponseMs })
    }
  };
}

export function difficultFacts(factStats, limit = 5) {
  return Object.entries(factStats)
    .map(([key, stats]) => {
      const wrong = stats.wrong ?? Math.max(0, stats.seen - stats.correct);
      const wrongRate = stats.seen ? wrong / stats.seen : 0;
      const score = wrongRate * 10 + Math.min(3, wrong) + (stats.lastResult === "wrong" ? 3 : 0) - Math.min(2, stats.correctStreak ?? 0);
      return { key, score, wrong };
    })
    .filter((fact) => fact.wrong > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((fact) => fact.key.replace("x", " × "));
}
