import "./setup";
import { fromSnapshot, Model, model, modelAction } from "mobx-keystone";
import { Animated, animationProps, Speed, SPEED } from "./animation";
import { savedJson } from "./test-helpers";

@model("test/AnimatedProbe")
class AnimatedProbe extends Model({ ...animationProps }) implements Animated {
  @modelAction
  setAnimate(animate: boolean) {
    this.animate = animate;
  }

  @modelAction
  setSpeed(speed: Speed) {
    this.speed = speed;
  }
}

describe("animationProps", () => {
  it("starts animating at normal speed", () => {
    expect(savedJson(new AnimatedProbe({}))).toEqual({
      animate: true, speed: SPEED.normal, $modelType: "test/AnimatedProbe",
    });
  });

  it("rejects a saved speed that isn't one of the slider's three stops", () => {
    expect(() => fromSnapshot(AnimatedProbe, { animate: true, speed: 3 } as any)).toThrow();
  });

  it("can be driven through the Animated interface", () => {
    const animated: Animated = new AnimatedProbe({});
    animated.setAnimate(false);
    animated.setSpeed(SPEED.fast);
    expect(animated.animate).toBe(false);
    expect(animated.speed).toBe(SPEED.fast);
  });
});
