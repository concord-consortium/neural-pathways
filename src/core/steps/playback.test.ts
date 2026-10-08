import { SPEED } from "../state/animation";
import { durationScale } from "./playback";

describe("durationScale", () => {
  it("takes the prototype's Med timings as they are at normal speed", () => {
    expect(durationScale(SPEED.normal)).toBe(1);
  });

  it("plays 1.7 times as long at slow speed and 0.6 times as long at fast, as the prototype does", () => {
    expect(durationScale(SPEED.slow)).toBe(1.7);
    expect(durationScale(SPEED.fast)).toBe(0.6);
  });
});
