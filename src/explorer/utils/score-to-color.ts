export function scoreToColor(score: number, maxAbsScore: number): string {
  if (score === 0 || maxAbsScore === 0) return "transparent";

  const alpha = Math.min(Math.abs(score) / maxAbsScore, 1.0);

  if (score > 0) {
    return `rgba(231, 76, 60, ${alpha.toFixed(2)})`;
  } else {
    return `rgba(52, 152, 219, ${alpha.toFixed(2)})`;
  }
}
