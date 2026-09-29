import { NEGATIVE_COLOR, POSITIVE_COLOR, signColor } from "./colors";

describe("signColor", () => {
  it("is orange for positive values and blue for negative ones", () => {
    expect(POSITIVE_COLOR).toBe("#A84A2C");
    expect(NEGATIVE_COLOR).toBe("#1F4E8F");
    expect(signColor(0.3)).toBe(POSITIVE_COLOR);
    expect(signColor(-0.3)).toBe(NEGATIVE_COLOR);
  });

  it("counts zero as positive, as the prototype does", () => {
    expect(signColor(0)).toBe(POSITIVE_COLOR);
  });
});
