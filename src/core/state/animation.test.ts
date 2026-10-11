import "./setup";
import { composeMixins, ExtendedModel, fromSnapshot, model, tProp, types } from "mobx-keystone";
import { Animated, animatedMixin, SPEED_STOPS, SPEEDS } from "./animation";
import { savedJson } from "./test-helpers";

/** A model with a prop of its own, as a view's state has. */
@model("test/AnimatedProbe")
class AnimatedProbe extends ExtendedModel(composeMixins(animatedMixin), {
  name: tProp(types.string, ""),
}) {}

describe("the speed stops", () => {
  it("keeps each stop's saved key, with normal at 0 and room between the stops", () => {
    expect(SPEED_STOPS.map(stop => stop.key)).toEqual([-100, 0, 100]);
    expect(SPEEDS.normal.key).toBe(0);
  });

  it("lists the stops in slider order, which is the order of their keys", () => {
    const keys = SPEED_STOPS.map(stop => stop.key);
    expect(keys.every((key, i) => i === 0 || key > keys[i - 1])).toBe(true);
  });
});

describe("animatedMixin", () => {
  it("starts animating at normal speed, after the model's own props", () => {
    expect(savedJson(new AnimatedProbe({}))).toEqual({
      name: "", animate: true, speed: SPEEDS.normal.key, $modelType: "test/AnimatedProbe",
    });
  });

  it("rejects a saved speed that isn't one of the slider's stops", () => {
    expect(() => fromSnapshot(AnimatedProbe, { animate: true, speed: 50 } as any)).toThrow();
  });

  it("can be driven through the Animated interface", () => {
    const animated: Animated = new AnimatedProbe({});
    animated.setAnimate(false);
    animated.setSpeed(SPEEDS.fast.key);
    expect(animated.animate).toBe(false);
    expect(animated.speed).toBe(SPEEDS.fast.key);
  });

  it("type-checks a speed set through the action", () => {
    expect(() => new AnimatedProbe({}).setSpeed(50 as any)).toThrow();
  });
});
