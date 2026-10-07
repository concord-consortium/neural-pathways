import { invertSymmetric, solveSymmetric } from "./matrix";

function multiply(a: number[][], b: number[][]): number[][] {
  return a.map(row => b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0)));
}

describe("invertSymmetric", () => {
  it("inverts the identity to itself", () => {
    const result = invertSymmetric([[1, 0], [0, 1]]) as number[][];
    expect(result[0][0]).toBeCloseTo(1, 10);
    expect(result[0][1]).toBeCloseTo(0, 10);
  });

  it("inverts a 2x2 matrix", () => {
    const result = invertSymmetric([[4, 3], [3, 4]]) as number[][];
    // inverse of [[4,3],[3,4]] is [[4,-3],[-3,4]] / 7
    expect(result[0][0]).toBeCloseTo(4 / 7, 10);
    expect(result[0][1]).toBeCloseTo(-3 / 7, 10);
  });

  it("produces an inverse whose product with the original is the identity", () => {
    const m = [[2, 0.5, 0.1], [0.5, 1.5, 0.3], [0.1, 0.3, 1.0]];
    const inverse = invertSymmetric(m) as number[][];
    const product = multiply(m, inverse);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(product[i][j]).toBeCloseTo(i === j ? 1 : 0, 8);
      }
    }
  });

  it("inverts a 1x1 matrix", () => {
    expect((invertSymmetric([[4]]) as number[][])[0][0]).toBeCloseTo(0.25, 10);
  });

  it("returns null for a singular matrix", () => {
    expect(invertSymmetric([[1, 1], [1, 1]])).toBeNull();
  });

  it("returns null for an all-zero matrix", () => {
    expect(invertSymmetric([[0, 0], [0, 0]])).toBeNull();
  });

  it("returns null for an empty matrix", () => {
    expect(invertSymmetric([])).toBeNull();
  });

  it("does not mutate its input", () => {
    const m = [[4, 3], [3, 4]];
    invertSymmetric(m);
    expect(m).toEqual([[4, 3], [3, 4]]);
  });

  it("succeeds where naive elimination would divide by a zero pivot", () => {
    // A zero leading entry forces a row swap; without pivoting this returns null.
    const m = [[0, 1], [1, 0]];
    const inverse = invertSymmetric(m) as number[][];
    expect(inverse).not.toBeNull();
    expect(inverse[0][1]).toBeCloseTo(1, 10);
  });
});

describe("solveSymmetric", () => {
  it("solves a 2x2 system", () => {
    const result = solveSymmetric([[2, 0], [0, 4]], [2, 8]) as number[];
    expect(result[0]).toBeCloseTo(1, 10);
    expect(result[1]).toBeCloseTo(2, 10);
  });

  it("solves a system requiring elimination", () => {
    // 4x + 3y = 10 ; 3x + 4y = 11  ->  x = 1, y = 2
    const result = solveSymmetric([[4, 3], [3, 4]], [10, 11]) as number[];
    expect(result[0]).toBeCloseTo(1, 8);
    expect(result[1]).toBeCloseTo(2, 8);
  });

  it("returns null for a singular system", () => {
    expect(solveSymmetric([[1, 1], [1, 1]], [1, 2])).toBeNull();
  });

  it("returns null when the right-hand side length does not match", () => {
    expect(solveSymmetric([[1, 0], [0, 1]], [1])).toBeNull();
  });

  it("does not mutate its inputs", () => {
    const m = [[4, 3], [3, 4]];
    const rhs = [10, 11];
    solveSymmetric(m, rhs);
    expect(m).toEqual([[4, 3], [3, 4]]);
    expect(rhs).toEqual([10, 11]);
  });
});
