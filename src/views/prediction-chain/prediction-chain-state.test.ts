import { fromSnapshot } from "mobx-keystone";
import { Animated, SPEED } from "../../core/state/animation";
import { savedJson } from "../../core/state/test-helpers";
import { PREDICTION_CHAIN_LAST_STEP, PredictionChainState } from "./prediction-chain-state";
import chainFixture from "./__fixtures__/prediction-chain-state.v1.json";

describe("PredictionChainState", () => {
  it("starts with no steps, animation on, at normal speed", () => {
    expect(savedJson(new PredictionChainState({}))).toEqual({
      version: 1, stepByConversation: {}, animate: true, speed: 1, $modelType: "npw/PredictionChainState",
    });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(PredictionChainState, chainFixture as any))).toEqual(chainFixture);
  });

  it("records the step each conversation is on, by id", () => {
    const state = new PredictionChainState({});
    state.setStep("3fa91c2e", PREDICTION_CHAIN_LAST_STEP);
    state.setStep("e41c9f22", 0);
    expect(state.stepByConversation).toEqual({ "3fa91c2e": 4, "e41c9f22": 0 });
  });

  it("rejects a step outside 0 to 4", () => {
    const state = new PredictionChainState({});
    expect(() => state.setStep("3fa91c2e", 5)).toThrow();
    expect(() => state.setStep("3fa91c2e", -1)).toThrow();
    expect(() => fromSnapshot(PredictionChainState, {
      ...chainFixture, stepByConversation: { "3fa91c2e": 5 },
    } as any)).toThrow();
  });

  it("can be driven through the Animated interface", () => {
    const state: Animated = new PredictionChainState({});
    state.setAnimate(false);
    state.setSpeed(SPEED.fast);
    expect(state.animate).toBe(false);
    expect(state.speed).toBe(SPEED.fast);
  });
});
