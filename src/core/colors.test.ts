import { readFileSync } from "fs";
import { join } from "path";
import { NEGATIVE_COLOR, POSITIVE_COLOR, RULE_COLOR, signColor } from "./colors";

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

describe("colors.scss", () => {
  it("holds the same values as the colors here that stylesheets also use", () => {
    const scss = readFileSync(join(__dirname, "colors.scss"), "utf8");
    const value = (name: string) => new RegExp(`^\\$${name}: (#[0-9A-Fa-f]{6});`, "m").exec(scss)?.[1];
    expect([value("positive"), value("negative"), value("rule")]).toEqual([POSITIVE_COLOR, NEGATIVE_COLOR, RULE_COLOR]);
  });
});
