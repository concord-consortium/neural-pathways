import { ease } from "../../core/network-diagram/easing";
import { lerp, transitionAt } from "./transitions";

describe("lerp", () => {
  it("lands exactly on each end", () => {
    expect(lerp(0.1, 0.3, 1)).toBe(0.3);
    expect(lerp(0.1, 0.3, 0)).toBe(0.1);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });
});

describe("transitionAt", () => {
  it("holds its initial value until a transition starts", () => {
    expect(transitionAt(3, [{ start: 100, duration: 50, to: 5 }], 99)).toBe(3);
  });

  it("eases to each transition's value over its duration", () => {
    const moves = [{ start: 100, duration: 200, to: 5 }];
    expect(transitionAt(3, moves, 200)).toBeCloseTo(3 + 2 * ease(0.5));
    expect(transitionAt(3, moves, 300)).toBe(5);
  });

  it("starts a transition from wherever the last one had got to, as a CSS transition retargets", () => {
    const moves = [{ start: 0, duration: 100, to: 10 }, { start: 50, duration: 100, to: 0 }];
    const halfway = 10 * ease(0.5);
    expect(transitionAt(0, moves, 50)).toBeCloseTo(halfway);
    expect(transitionAt(0, moves, 100)).toBeCloseTo(halfway * (1 - ease(0.5)));
    expect(transitionAt(0, moves, 150)).toBe(0);
  });

  it("jumps for a transition that takes no time", () => {
    expect(transitionAt(1, [{ start: 10, duration: 0, to: 4 }], 10)).toBe(4);
  });
});
