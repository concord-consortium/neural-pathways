import { fromSnapshot } from "mobx-keystone";
import { NORMAL_SPEED } from "../../core/state/animation";
import { savedJson, speedNamed } from "../../core/state/test-helpers";
import { PREDICTION_CHAIN_LAST_STEP, PredictionChainState } from "./prediction-chain-state";
import chainFixture from "./__fixtures__/prediction-chain-state.v1.json";

const empty = {
  version: 1, stepByConversation: {}, animate: true, speed: NORMAL_SPEED, $modelType: "npw/PredictionChainState",
};

describe("PredictionChainState", () => {
  it("starts with no steps, animation on, at normal speed", () => {
    expect(savedJson(new PredictionChainState({}))).toEqual(empty);
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

  it("stores Animate and the speed", () => {
    const state = new PredictionChainState({});
    state.setAnimate(false);
    state.setSpeed(speedNamed("Fast"));
    expect(savedJson(state)).toEqual({ ...empty, animate: false, speed: speedNamed("Fast") });
  });
});
