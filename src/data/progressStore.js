const STORAGE_KEY = "kertotaikuri-progress-v1";

export const initialProgress = () => ({
  playerName: "Eelin",
  mode: "tables",
  selectedTable: 0,
  unlockedLevel: 1,
  selectedLevel: 1,
  stars: 0,
  bestStreak: 0,
  completedLevels: [],
  completedTables: [],
  factStats: {},
  dailyHistory: {},
  selectedRewardId: "classic",
  practiceDays: 0
});

export function loadProgress(storage = globalThis.localStorage) {
  try {
    return { ...initialProgress(), ...JSON.parse(storage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return initialProgress();
  }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function resetProgress(storage = globalThis.localStorage) {
  storage.removeItem(STORAGE_KEY);
}
