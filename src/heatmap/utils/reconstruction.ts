/**
 * Multiply each coefficient in a pathway component by its score.
 */
export function computeScoredPathway(component: number[], score: number): number[] {
  return component.map(v => v * score);
}

/**
 * Sum the mean activation plus all scored pathways to reconstruct the activation pattern.
 * result[i] = mean[i] + Σ scoredPathways[j][i]
 */
export function computeSum(mean: number[], scoredPathways: number[][]): number[] {
  const result = [...mean];
  for (const scored of scoredPathways) {
    for (let i = 0; i < result.length; i++) {
      result[i] += scored[i];
    }
  }
  return result;
}
