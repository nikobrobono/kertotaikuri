export const FINALE_WRONG_POINTS = -2;

export function finalePoints(elapsedMs, correct) {
  if (!correct) return FINALE_WRONG_POINTS;
  if (elapsedMs <= 3000) return 5;
  if (elapsedMs <= 6000) return 4;
  if (elapsedMs <= 10000) return 3;
  return 2;
}
