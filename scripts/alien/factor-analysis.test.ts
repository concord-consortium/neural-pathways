import { createRng } from "./rng";
import { factorScores, fitFactorAnalysis } from "./factor-analysis";

/** Two factors on six variables with disjoint support, so L Psi^-1 L^T is diagonal. */
const PLANTED = [
  [0.9, 0.8, 0.7, 0, 0, 0],
  [0, 0, 0, 0.8, 0.7, 0.6],
];
const NOISE = 0.2;
const N = 3000;

function cosine(a: number[], b: number[]): number {
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    ab += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return ab / Math.sqrt(aa * bb);
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    sab += (a[i] - ma) * (b[i] - mb);
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  }
  return sab / Math.sqrt(saa * sbb);
}

const rng = createRng(99);
const planted = Array.from({ length: N }, () => [rng.normal(), rng.normal()]);
const data = planted.map(z => PLANTED[0].map((_, j) =>
  z[0] * PLANTED[0][j] + z[1] * PLANTED[1][j] + rng.normal() * Math.sqrt(NOISE)));

describe("fitFactorAnalysis", () => {
  const fit = fitFactorAnalysis(data, 2);

  it("converges", () => {
    expect(fit.converged).toBe(true);
    expect(fit.iterations).toBeGreaterThan(1);
  });

  it("recovers each planted loading row up to sign, in energy order", () => {
    expect(fit.loadings).toHaveLength(2);
    expect(Math.abs(cosine(fit.loadings[0], PLANTED[0]))).toBeGreaterThan(0.98);
    expect(Math.abs(cosine(fit.loadings[1], PLANTED[1]))).toBeGreaterThan(0.98);
  });

  it("recovers the noise variance", () => {
    for (const psi of fit.noiseVariance) expect(Math.abs(psi - NOISE)).toBeLessThan(0.05);
  });

  it("reports explained variance as summed squared loadings over the variable count", () => {
    const expected = PLANTED.map(row => row.reduce((s, v) => s + v * v, 0) / 6);
    expect(fit.explainedVariancePerFactor[0]).toBeCloseTo(expected[0], 1);
    expect(fit.explainedVariancePerFactor[1]).toBeCloseTo(expected[1], 1);
    expect(fit.explainedVarianceTotal).toBeCloseTo(expected[0] + expected[1], 1);
  });

  it("leaves a near-empty extra factor when asked for one more than planted", () => {
    const three = fitFactorAnalysis(data, 3);
    expect(three.explainedVariancePerFactor[2]).toBeLessThan(0.02);
  });
});

describe("factorScores", () => {
  it("correlate strongly with the planted scores, up to sign", () => {
    const fit = fitFactorAnalysis(data, 2);
    const scores = factorScores(data, fit);
    expect(scores).toHaveLength(N);
    expect(scores[0]).toHaveLength(2);
    for (let p = 0; p < 2; p++) {
      const r = pearson(planted.map(z => z[p]), scores.map(s => s[p]));
      expect(Math.abs(r)).toBeGreaterThan(0.9);
    }
  });
});
