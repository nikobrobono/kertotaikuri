const LEVELS = ["unseen", "learning", "known", "fluent"];
const FACTS_PER_TABLE = 11;

const numberOr = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

function normalizedStats(stats = {}) {
  const seen = numberOr(stats.seen);
  const correct = Math.min(seen, numberOr(stats.correct));
  // Older saved progress did not persist `wrong`; derive it when absent.
  const wrong = stats.wrong == null
    ? Math.max(0, seen - correct)
    : numberOr(stats.wrong);

  return {
    seen,
    correct,
    wrong,
    correctStreak: numberOr(stats.correctStreak),
    avgResponseMs: stats.avgResponseMs == null ? null : numberOr(stats.avgResponseMs)
  };
}

/**
 * Classifies one multiplication fact without changing the persisted statistics.
 * Missing newer fields are deliberately treated as neutral so legacy saves remain useful.
 */
export function classifyMastery(stats = {}) {
  const { seen, correct, wrong, correctStreak, avgResponseMs } = normalizedStats(stats);
  if (seen === 0) return "unseen";

  const accuracy = correct / seen;
  const isFastEnough = avgResponseMs === null || avgResponseMs <= 5000;
  if (seen >= 8 && accuracy >= 0.9 && wrong <= 1 && correctStreak >= 5 && isFastEnough) {
    return "fluent";
  }
  if (seen >= 4 && accuracy >= 0.8 && correctStreak >= 3) return "known";
  return "learning";
}

/** Returns rows for tables 0–10 and columns for multipliers 0–10. */
export function masteryGrid(factStats = {}) {
  return Array.from({ length: FACTS_PER_TABLE }, (_, table) => (
    Array.from({ length: FACTS_PER_TABLE }, (_, multiplier) => (
      classifyMastery(factStats[`${table}x${multiplier}`])
    ))
  ));
}

const emptyCounts = () => Object.fromEntries(LEVELS.map((level) => [level, 0]));

/** Aggregates mastery counts for every table and for all 121 facts. */
export function masterySummary(factStats = {}) {
  const grid = masteryGrid(factStats);
  const total = emptyCounts();
  const tables = grid.map((row, table) => {
    const counts = emptyCounts();
    for (const level of row) {
      counts[level] += 1;
      total[level] += 1;
    }
    return { table, total: FACTS_PER_TABLE, ...counts };
  });

  return { tables, total: { total: FACTS_PER_TABLE ** 2, ...total } };
}

// Short alias for callers that prefer a generic reporting name.
export const summary = masterySummary;
