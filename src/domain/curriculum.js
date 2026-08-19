export const LEVELS = [
  { id: 1, name: "Taikurin alku", tables: [0, 1, 2], goal: 8, description: "Nolla, sama luku ja tuplaus" },
  { id: 2, name: "Helppo vitonen", tables: [5, 10], goal: 8, description: "Viitoset ja kympit" },
  { id: 3, name: "Kolmosmetsä", tables: [3, 4], goal: 10, description: "Tuplaa ja lisää" },
  { id: 4, name: "Kuuden ja ysin vuori", tables: [6, 9], goal: 10, description: "Käytä viitosta ja kymppiä apuna" },
  { id: 5, name: "Seitsemän ja kahdeksan", tables: [7, 8], goal: 12, description: "Haastavimmat taulut" },
  { id: 6, name: "Grande finale", tables: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], goal: 20, description: "Kaikki kertotaulut, nopeusbonukset ja vain yksi yritys" }
];

export const levelById = (id) => LEVELS.find((level) => level.id === id) ?? LEVELS[0];

export function canCompleteLevel(session) {
  if (session.total < session.goal) return false;
  return session.correct / session.total >= 0.8;
}
