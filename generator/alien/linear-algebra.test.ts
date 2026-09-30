import { identity, inverseSqrt, invert, multiply, symmetricEigen, transpose } from "./linear-algebra";

function expectMatrixClose(actual: number[][], expected: number[][], digits = 10): void {
  expect(actual.length).toBe(expected.length);
  actual.forEach((row, i) => {
    expect(row.length).toBe(expected[i].length);
    row.forEach((value, j) => expect(value).toBeCloseTo(expected[i][j], digits));
  });
}

describe("multiply and transpose", () => {
  it("multiplies and transposes small matrices", () => {
    expect(multiply([[1, 2], [3, 4]], [[5], [6]])).toEqual([[17], [39]]);
    expect(transpose([[1, 2, 3], [4, 5, 6]])).toEqual([[1, 4], [2, 5], [3, 6]]);
    expect(identity(2)).toEqual([[1, 0], [0, 1]]);
  });
});

describe("symmetricEigen", () => {
  it("returns the known eigenpairs of [[2,1],[1,2]] in descending order", () => {
    const { values, vectors } = symmetricEigen([[2, 1], [1, 2]]);
    expect(values[0]).toBeCloseTo(3, 10);
    expect(values[1]).toBeCloseTo(1, 10);
    const s = Math.SQRT1_2;
    expect(Math.abs(vectors[0][0])).toBeCloseTo(s, 10);
    expect(vectors[0][0] * vectors[0][1]).toBeGreaterThan(0);
    expect(vectors[1][0] * vectors[1][1]).toBeLessThan(0);
  });

  it("reconstructs a 4x4 symmetric matrix from orthonormal eigenvectors", () => {
    const a = [
      [4, 1, 0.5, 0.2],
      [1, 3, 0.3, 0.1],
      [0.5, 0.3, 2, 0.4],
      [0.2, 0.1, 0.4, 1],
    ];
    const { values, vectors } = symmetricEigen(a);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    // orthonormal
    vectors.forEach((u, i) => vectors.forEach((v, j) => {
      const dot = u.reduce((sum, value, k) => sum + value * v[k], 0);
      expect(dot).toBeCloseTo(i === j ? 1 : 0, 10);
    }));
    // A = sum(lambda v v^T)
    const rebuilt = a.map((row, i) => row.map((_, j) =>
      values.reduce((sum, lambda, k) => sum + lambda * vectors[k][i] * vectors[k][j], 0)));
    expectMatrixClose(rebuilt, a);
  });

  it("handles an already diagonal matrix", () => {
    const { values } = symmetricEigen([[1, 0], [0, 5]]);
    expect(values).toEqual([5, 1]);
  });
});

describe("invert", () => {
  it("inverts a 2x2 matrix", () => {
    expectMatrixClose(invert([[4, 7], [2, 6]]), [[0.6, -0.7], [-0.2, 0.4]]);
  });

  it("gives the identity when multiplied back", () => {
    const a = [[2, 0.5, 0.1], [0.5, 3, 0.2], [0.1, 0.2, 1.5]];
    expectMatrixClose(multiply(invert(a), a), identity(3));
  });

  it("throws on a singular matrix", () => {
    expect(() => invert([[1, 2], [2, 4]])).toThrow(/singular/i);
  });
});

describe("inverseSqrt", () => {
  it("satisfies S A S = I for a positive-definite matrix", () => {
    const a = [[2, 0.5], [0.5, 1]];
    const s = inverseSqrt(a);
    expectMatrixClose(multiply(multiply(s, a), s), identity(2));
  });
});
