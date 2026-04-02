import { scoreToColor } from "./score-to-color";

describe("scoreToColor", () => {
  it("returns red with alpha for positive scores", () => {
    const color = scoreToColor(0.5, 1.0);
    expect(color).toBe("rgba(231, 76, 60, 0.50)");
  });

  it("returns blue with alpha for negative scores", () => {
    const color = scoreToColor(-0.3, 1.0);
    expect(color).toBe("rgba(52, 152, 219, 0.30)");
  });

  it("returns transparent for zero score", () => {
    const color = scoreToColor(0, 1.0);
    expect(color).toBe("transparent");
  });

  it("clamps alpha to 1.0 when score exceeds maxAbsScore", () => {
    const color = scoreToColor(2.0, 1.0);
    expect(color).toBe("rgba(231, 76, 60, 1.00)");
  });

  it("returns transparent when maxAbsScore is zero", () => {
    const color = scoreToColor(0.5, 0);
    expect(color).toBe("transparent");
  });

  it("handles full negative magnitude", () => {
    const color = scoreToColor(-1.0, 1.0);
    expect(color).toBe("rgba(52, 152, 219, 1.00)");
  });
});
