import { fourPathwayConfig } from "../alien-config";
import {
  buildActivations, drawNoiseVariances, drawSketch, reconstructionR2, solveLoadings,
} from "./activations";
import { createRng } from "./rng";

const config = fourPathwayConfig;
const { neuronCount, explainedVarianceTotal } = config.activations;
const ITEMS = 300;

function syntheticScores(seed: number): number[][] {
  const rng = createRng(seed);
  return Array.from({ length: ITEMS }, () =>
    Array.from({ length: config.pathwayCount }, () => rng.normal()));
}

const scores = syntheticScores(1);
const activations = buildActivations(scores, config, createRng(config.seed));

describe("drawNoiseVariances", () => {
  it("averages exactly 1 - explainedVarianceTotal and stays in the scaled range", () => {
    const psi = drawNoiseVariances(config.activations, createRng(5));
    expect(psi).toHaveLength(neuronCount);
    const mean = psi.reduce((s, v) => s + v, 0) / neuronCount;
    expect(mean).toBeCloseTo(1 - explainedVarianceTotal, 12);
    // Scaling preserves the ratio between the largest and smallest draw.
    const [low, high] = config.activations.noiseVarianceRange;
    for (const value of psi) expect(value).toBeGreaterThan(0);
    expect(Math.max(...psi) / Math.min(...psi)).toBeLessThanOrEqual(high / low + 1e-9);
  });
});

describe("drawSketch", () => {
  it("is a pathwayCount x neuronCount matrix of non-zero entries", () => {
    const sketch = drawSketch(3, 5, createRng(2));
    expect(sketch).toHaveLength(3);
    for (const row of sketch) {
      expect(row).toHaveLength(5);
      for (const value of row) expect(value).not.toBe(0);
    }
  });
});

describe("solveLoadings", () => {
  const psi = drawNoiseVariances(config.activations, createRng(5));
  const energies = config.targetVarianceShares.map(share => share * explainedVarianceTotal * neuronCount);
  const { loadings, iterations } = solveLoadings(drawSketch(4, neuronCount, createRng(6)), energies, psi);

  it("converges", () => {
    expect(iterations).toBeLessThan(1000);
  });

  it("gives each row its target energy", () => {
    loadings.forEach((row, p) => {
      expect(row.reduce((s, v) => s + v * v, 0)).toBeCloseTo(energies[p], 8);
    });
  });

  it("gives each neuron communality 1 - psi", () => {
    for (let j = 0; j < neuronCount; j++) {
      const communality = loadings.reduce((s, row) => s + row[j] * row[j], 0);
      expect(communality).toBeCloseTo(1 - psi[j], 8);
    }
  });

  it("makes L Psi^-1 L^T diagonal", () => {
    const weighted = (a: number[], b: number[]) => a.reduce((s, v, j) => s + v * b[j] / psi[j], 0);
    for (let a = 0; a < 4; a++) {
      for (let b = a + 1; b < 4; b++) {
        const cosine = weighted(loadings[a], loadings[b])
          / Math.sqrt(weighted(loadings[a], loadings[a]) * weighted(loadings[b], loadings[b]));
        expect(Math.abs(cosine)).toBeLessThan(1e-8);
      }
    }
  });
});

describe("reconstructionR2", () => {
  it("is 1 for a perfect reconstruction and matches the heatmap's formula otherwise", () => {
    expect(reconstructionR2([1, 2, 3], [1, 2, 3])).toBe(1);
    // original mean 2, ssTot 2, residual [0.5, 0, -0.5] -> ssRes 0.5
    expect(reconstructionR2([1, 2, 3], [0.5, 2, 3.5])).toBeCloseTo(0.75, 12);
  });
});

describe("buildActivations", () => {
  it("is deterministic from the rng", () => {
    const again = buildActivations(scores, config, createRng(config.seed));
    expect(JSON.stringify(again)).toBe(JSON.stringify(activations));
  });

  it("draws the scaler inside its ranges", () => {
    const [meanLow, meanHigh] = config.activations.scalerMeanRange;
    const [scaleLow, scaleHigh] = config.activations.scalerScaleRange;
    expect(activations.scalerMean).toHaveLength(neuronCount);
    for (const value of activations.scalerMean) {
      expect(value).toBeGreaterThanOrEqual(meanLow);
      expect(value).toBeLessThan(meanHigh);
    }
    for (const value of activations.scalerScale) {
      expect(value).toBeGreaterThanOrEqual(scaleLow);
      expect(value).toBeLessThan(scaleHigh);
    }
  });

  it("builds standardized activations as scores x loadings plus noise of the drawn variance", () => {
    expect(activations.standardized).toHaveLength(ITEMS);
    const residualVariance = new Array<number>(neuronCount).fill(0);
    activations.standardized.forEach((row, i) => {
      row.forEach((value, j) => {
        const reconstructed = activations.loadings.reduce((s, l, p) => s + scores[i][p] * l[j], 0);
        residualVariance[j] += (value - reconstructed) ** 2 / ITEMS;
      });
    });
    residualVariance.forEach((variance, j) => {
      expect(variance / activations.noiseVariance[j]).toBeGreaterThan(0.6);
      expect(variance / activations.noiseVariance[j]).toBeLessThan(1.4);
    });
  });

  it("builds raw activations by reversing the scaler exactly", () => {
    activations.raw.forEach((row, i) => row.forEach((value, j) => {
      const standardized = (value - activations.scalerMean[j]) / activations.scalerScale[j];
      expect(standardized).toBeCloseTo(activations.standardized[i][j], 10);
    }));
  });

  it("gives every item an R2 at most 1, mostly high", () => {
    expect(activations.reconstructionR2).toHaveLength(ITEMS);
    for (const r2 of activations.reconstructionR2) expect(r2).toBeLessThanOrEqual(1);
    const mean = activations.reconstructionR2.reduce((s, v) => s + v, 0) / ITEMS;
    expect(mean).toBeGreaterThan(0.7);
  });
});
