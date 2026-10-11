import "./setup";
import { composeMixins, ExtendedModel, fromSnapshot, model, tProp, types } from "mobx-keystone";
import { Animated, animatedMixin, SPEED } from "./animation";
import { savedJson } from "./test-helpers";

/** A model with a prop of its own, as a view's state has. */
@model("test/AnimatedProbe")
class AnimatedProbe extends ExtendedModel(composeMixins(animatedMixin), {
  name: tProp(types.string, ""),
}) {}

describe("animatedMixin", () => {
  it("starts animating at normal speed, after the model's own props", () => {
    expect(savedJson(new AnimatedProbe({}))).toEqual({
      name: "", animate: true, speed: SPEED.normal, $modelType: "test/AnimatedProbe",
    });
  });

  it("keeps each stop's saved key, with normal at 0 and room between the stops", () => {
    expect(SPEED).toEqual({ slow: -100, normal: 0, fast: 100 });
  });

  it("rejects a saved speed that isn't one of the slider's stops", () => {
    expect(() => fromSnapshot(AnimatedProbe, { animate: true, speed: 50 } as any)).toThrow();
  });

  it("can be driven through the Animated interface", () => {
    const animated: Animated = new AnimatedProbe({});
    animated.setAnimate(false);
    animated.setSpeed(SPEED.fast);
    expect(animated.animate).toBe(false);
    expect(animated.speed).toBe(SPEED.fast);
  });

  it("type-checks a speed set through the action", () => {
    expect(() => new AnimatedProbe({}).setSpeed(50 as any)).toThrow();
  });
});
