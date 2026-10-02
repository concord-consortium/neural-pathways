import { fromSnapshot } from "mobx-keystone";
import { TraceACaseState } from "./trace-a-case-state";
import { ExtractPathwaysState } from "./extract-pathways-state";
import { PREDICTION_CHAIN_LAST_STEP, PredictionChainState } from "./prediction-chain-state";
import { Animated, SPEED } from "./animation";
import { savedJson } from "./test-helpers";
import traceFixture from "./__fixtures__/trace-a-case-state.v1.json";
import extractFixture from "./__fixtures__/extract-pathways-state.v1.json";
import chainFixture from "./__fixtures__/prediction-chain-state.v1.json";

describe("TraceACaseState", () => {
  it("starts with no steps, animation on, at normal speed", () => {
    expect(savedJson(new TraceACaseState({}))).toEqual({
      version: 1, stepsByConversation: {}, animate: true, speed: 1, $modelType: "npw/TraceACaseState",
    });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(TraceACaseState, traceFixture as any))).toEqual(traceFixture);
  });

  it("rejects a speed that is not 0, 1 or 2", () => {
    expect(() => fromSnapshot(TraceACaseState, { ...traceFixture, speed: 3 } as any)).toThrow();
  });

  it("records the steps done for each conversation by id", () => {
    const state = new TraceACaseState({});
    state.setStep("3fa91c2e", 2);
    state.setStep("a07b5d10", 5);
    state.setStep("3fa91c2e", 3);
    expect(state.stepsByConversation).toEqual({ "3fa91c2e": 3, "a07b5d10": 5 });
  });

  it("rejects a negative or fractional step count", () => {
    const state = new TraceACaseState({});
    expect(() => state.setStep("3fa91c2e", -1)).toThrow();
    expect(() => state.setStep("3fa91c2e", 1.5)).toThrow();
  });

  it("sets animation and speed", () => {
    const state = new TraceACaseState({});
    state.setAnimate(false);
    state.setSpeed(0);
    expect(state.animate).toBe(false);
    expect(state.speed).toBe(0);
  });
});

describe("ExtractPathwaysState", () => {
  it("starts unextracted, animation on, at normal speed", () => {
    expect(savedJson(new ExtractPathwaysState({}))).toEqual({
      version: 1, animate: true, speed: 1, extracted: false, collected: 0, cubeDone: false,
      pathwaysDone: false, $modelType: "npw/ExtractPathwaysState",
    });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(ExtractPathwaysState, extractFixture as any))).toEqual(extractFixture);
  });

  it("records each completed stage", () => {
    const state = new ExtractPathwaysState({});
    state.setExtracted(true);
    state.setCollected(10);
    state.setCubeDone(true);
    state.setPathwaysDone(true);
    state.setAnimate(false);
    state.setSpeed(2);
    expect(savedJson(state)).toEqual({
      version: 1, animate: false, speed: 2, extracted: true, collected: 10, cubeDone: true,
      pathwaysDone: true, $modelType: "npw/ExtractPathwaysState",
    });
  });

  it("rejects a saved form with a wrong-typed field", () => {
    expect(() => fromSnapshot(ExtractPathwaysState, { ...extractFixture, extracted: "yes" } as any)).toThrow();
  });

  it("rejects a negative collected count", () => {
    expect(() => new ExtractPathwaysState({}).setCollected(-1)).toThrow();
  });
});

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
});

describe("Animated", () => {
  const animatedViews: [string, () => Animated][] = [
    ["TraceACaseState", () => new TraceACaseState({})],
    ["ExtractPathwaysState", () => new ExtractPathwaysState({})],
    ["PredictionChainState", () => new PredictionChainState({})],
  ];

  it.each(animatedViews)("%s can be driven through the Animated interface", (_name, create) => {
    const state = create();
    state.setAnimate(false);
    state.setSpeed(SPEED.fast);
    expect(state.animate).toBe(false);
    expect(state.speed).toBe(SPEED.fast);
  });
});
