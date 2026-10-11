import { SPEEDS } from "../state/animation";
import { durationScale } from "./playback";

describe("durationScale", () => {
  it("takes the prototype's Med timings as they are at normal speed", () => {
    expect(durationScale(SPEEDS.normal.key)).toBe(1);
  });

  it("plays 1.7 times as long at slow speed and 0.6 times as long at fast, as the prototype does", () => {
    expect(durationScale(SPEEDS.slow.key)).toBe(1.7);
    expect(durationScale(SPEEDS.fast.key)).toBe(0.6);
  });

  it("refuses a speed that isn't a stop, rather than playing at some other speed", () => {
    expect(() => durationScale(50 as any)).toThrow(RangeError);
  });
});
