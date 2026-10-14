import { NORMAL_SPEED } from "../state/animation";
import { speedNamed } from "../state/test-helpers";
import { durationScale } from "./playback";

describe("durationScale", () => {
  it("takes the prototype's Med timings as they are at normal speed", () => {
    expect(durationScale(NORMAL_SPEED)).toBe(1);
  });

  it("plays 1.7 times as long at slow speed and 0.6 times as long at fast, as the prototype does", () => {
    expect(durationScale(speedNamed("Slow"))).toBe(1.7);
    expect(durationScale(speedNamed("Fast"))).toBe(0.6);
  });

  it("refuses a speed that isn't a stop, rather than playing at some other speed", () => {
    expect(() => durationScale(50 as any)).toThrow(RangeError);
  });
});
