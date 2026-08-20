const FACTORS = Array.from({ length: 11 }, (_, value) => value);
const factKey = (a, b) => `${a}x${b}`;

function statsFor(factStats, fact) {
  return factStats[fact.key] ?? { seen: 0, correct: 0, wrong: 0 };
}

function accuracy(stats) {
  return stats.seen > 0 ? (stats.correct ?? 0) / stats.seen : 0;
}

function isLearned(stats) {
  return stats.seen >= 3 && accuracy(stats) >= 0.8;
}

function practiceWeight(stats) {
  const seen = stats.seen ?? 0;
  const wrong = stats.wrong ?? Math.max(0, seen - (stats.correct ?? 0));
  const weakAccuracy = seen ? 1 - accuracy(stats) : 0;
  return 1 + wrong * 4 + Math.round(weakAccuracy * 6) + (stats.lastResult === "wrong" ? 3 : 0);
}

function chooseWeighted(candidates, factStats, random) {
  const total = candidates.reduce((sum, fact) => sum + practiceWeight(statsFor(factStats, fact)), 0);
  let target = random() * total;
  for (const fact of candidates) {
    target -= practiceWeight(statsFor(factStats, fact));
    if (target < 0) return fact;
  }
  return candidates.at(-1);
}

function questionFor(fact) {
  return { ...fact, answer: fact.a * fact.b };
}

/**
 * Creates ten questions from the complete 0–10 multiplication-fact set.
 * Existing facts are weighted toward recent mistakes and low accuracy. One
 * already learned fact is reserved for recall, and no more than one distinct
 * unseen fact is introduced. If there are too few known facts, a fact may be
 * repeated so the practice is always ten questions long.
 */
export function createDailyPractice(factStats = {}, random = Math.random) {
  const facts = FACTORS.flatMap((a) => FACTORS.map((b) => ({ a, b, key: factKey(a, b) })));
  const known = facts.filter((fact) => (statsFor(factStats, fact).seen ?? 0) > 0);
  const learned = known.filter((fact) => isLearned(statsFor(factStats, fact)));
  const selected = [];
  const add = (fact) => selected.push(questionFor(fact));

  // Reserve a familiar, mastered fact before choosing the error-focused work.
  if (learned.length) add(chooseWeighted(learned, factStats, random));

  const newFact = facts.find((fact) => (statsFor(factStats, fact).seen ?? 0) === 0);
  const eligible = newFact ? [...known, newFact] : known;
  const pool = eligible.length ? eligible : [facts[0]];
  const unused = [...pool];

  while (selected.length < 10) {
    const candidates = unused.length ? unused : pool;
    const choice = chooseWeighted(candidates, factStats, random);
    add(choice);
    const index = unused.indexOf(choice);
    if (index >= 0) unused.splice(index, 1);
  }

  return selected;
}

export const selectDailyPractice = createDailyPractice;

export const COSMETIC_REWARDS = [
  { id: "classic", name: "Taikurin viitta", description: "Aloitusviitta", stars: 0, tables: 0 },
  { id: "sparkles", name: "Tähtisuihku", description: "Kimallus oikeisiin vastauksiin", stars: 10, tables: 0 },
  { id: "forest", name: "Metsätausta", description: "Sammaleinen harjoittelumaisema", stars: 0, tables: 3 },
  { id: "golden-wand", name: "Kultasauva", description: "Kultainen taikasauva", stars: 30, tables: 6 },
  { id: "rainbow", name: "Sateenkaarijälki", description: "Värikäs jälki vastauksiin", stars: 60, tables: 11 }
];

export function unlockedRewards(stars = 0, completedTables = []) {
  const tableCount = Array.isArray(completedTables) ? new Set(completedTables).size : completedTables;
  return COSMETIC_REWARDS.filter((reward) => stars >= reward.stars && tableCount >= reward.tables);
}
