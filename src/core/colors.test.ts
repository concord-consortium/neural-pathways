import { readFileSync } from "fs";
import { join } from "path";
import {
  FILL_NEG, FILL_POS, INK_COLOR, NEGATIVE_COLOR, POSITIVE_COLOR, RAMP_STOPS, RULE_COLOR, rampLevel, signColor, wordFill
} from "./colors";

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

describe("rampLevel", () => {
  it.each([
    [0, 0], [0.1199, 0], [0.12, 1], [0.2999, 1], [0.3, 2],
    [0.4999, 2], [0.5, 3], [0.7499, 3], [0.75, 4], [1, 4],
  ])("puts %p on step %p", (t, level) => {
    expect(rampLevel(t)).toBe(level);
  });
});

describe("wordFill", () => {
  it("takes each step of the orange ramp for positive values and of the blue for negative ones", () => {
    const ts = [0.05, 0.2, 0.4, 0.6, 0.9];
    expect(ts.map(t => wordFill(t, 1).background)).toEqual(FILL_POS);
    expect(ts.map(t => wordFill(-t, 1).background)).toEqual(FILL_NEG);
  });

  it("scales by the maximum and treats values past it as the darkest step", () => {
    expect(wordFill(0.13, 0.26).background).toBe(FILL_POS[3]);
    expect(wordFill(0.5, 0.26).background).toBe("#A84A2C");
    expect(wordFill(-0.5, 0.26).background).toBe("#1F4E8F");
  });

  it("puts white text on the darkest step only, and ink on the rest", () => {
    expect([0.05, 0.2, 0.4, 0.6].map(t => wordFill(t, 1).text)).toEqual(Array(4).fill(INK_COLOR));
    expect(wordFill(0.9, 1).text).toBe("#FFFFFF");
    expect(wordFill(-0.9, 1).text).toBe("#FFFFFF");
  });

  it("ends the ramps on the signed-value colors", () => {
    expect(FILL_POS[4]).toBe(POSITIVE_COLOR);
    expect(FILL_NEG[4]).toBe(NEGATIVE_COLOR);
  });
});

describe("colors.scss", () => {
  const scss = readFileSync(join(__dirname, "colors.scss"), "utf8");

  it("holds the same values as the colors here that stylesheets also use", () => {
    const value = (name: string) => new RegExp(`^\\$${name}: (#[0-9A-Fa-f]{6});`, "m").exec(scss)?.[1];
    expect([value("positive"), value("negative"), value("rule"), value("ink")])
      .toEqual([POSITIVE_COLOR, NEGATIVE_COLOR, RULE_COLOR, INK_COLOR]);
  });

  it("holds the ramp stops in the same order as RAMP_STOPS", () => {
    const stops = /^\$ramp-stops: (.*);$/m.exec(scss)?.[1].split(", ");
    expect(stops).toEqual(RAMP_STOPS);
  });
});
