import "./setup";
import { composeMixins, ExtendedModel, fromSnapshot, model, tProp, types } from "mobx-keystone";
import { Animated, animatedMixin, NORMAL_SPEED, SPEED_STOPS } from "./animation";
import { savedJson, speedNamed } from "./test-helpers";

/** A model with a prop of its own, as a view's state has. */
@model("test/AnimatedProbe")
class AnimatedProbe extends ExtendedModel(composeMixins(animatedMixin), {
  name: tProp(types.string, ""),
}) {}

describe("the speed stops", () => {
  it("keeps each stop's saved key, with normal at 0 and room between the stops", () => {
    expect(SPEED_STOPS.map(stop => stop.key)).toEqual([-100, 0, 100]);
    expect(NORMAL_SPEED).toBe(0);
  });

  it("has normal speed as the stop whose runs take their timeline's own durations", () => {
    expect(SPEED_STOPS.find(stop => stop.key === NORMAL_SPEED)?.durationScale).toBe(1);
  });

  it("finds a stop's key by the name the slider shows, for tests", () => {
    expect(speedNamed("Slow")).toBe(-100);
    expect(speedNamed("Fast")).toBe(100);
  });

  it("lists the stops in slider order, which is the order of their keys", () => {
    const keys = SPEED_STOPS.map(stop => stop.key);
    expect(keys.every((key, i) => i === 0 || key > keys[i - 1])).toBe(true);
  });
});

describe("animatedMixin", () => {
  it("starts animating at normal speed, after the model's own props", () => {
    expect(savedJson(new AnimatedProbe({}))).toEqual({
      name: "", animate: true, speed: NORMAL_SPEED, $modelType: "test/AnimatedProbe",
    });
  });

  it("rejects a saved speed that isn't one of the slider's stops", () => {
    expect(() => fromSnapshot(AnimatedProbe, { animate: true, speed: 50 } as any)).toThrow();
  });

  it("can be driven through the Animated interface", () => {
    const animated: Animated = new AnimatedProbe({});
    animated.setAnimate(false);
    animated.setSpeed(speedNamed("Fast"));
    expect(animated.animate).toBe(false);
    expect(animated.speed).toBe(speedNamed("Fast"));
  });

  it("type-checks a speed set through the action", () => {
    expect(() => new AnimatedProbe({}).setSpeed(50 as any)).toThrow();
  });
});
