import { ExtractPathwaysState } from "./extract-pathways-state";
import { extractButtons, extractProgress, MAX_COLLECTED } from "./extract-steps";

describe("extractProgress", () => {
  it.each<[boolean, number, number]>([
    [false, 0, 0],
    [true, 0, 1],
    [true, 4, 5],
  ])("reads Setup %p with %p collected as %p steps done", (setupDone, collected, done) => {
    const state = new ExtractPathwaysState({ setupDone, collected });
    expect(extractProgress(state, MAX_COLLECTED).done).toBe(done);
  });

  it("reads a count without Setup as nothing done", () => {
    expect(extractProgress(new ExtractPathwaysState({ setupDone: false, collected: 3 }), MAX_COLLECTED).done).toBe(0);
  });

  it("reads no more conversations than the limit", () => {
    const state = new ExtractPathwaysState({ setupDone: true, collected: 12 });
    expect(extractProgress(state, MAX_COLLECTED).done).toBe(11);
    expect(extractProgress(state, 3).done).toBe(4);
  });

  it.each<[number, boolean, number]>([
    [0, false, 0],
    [1, true, 0],
    [4, true, 3],
  ])("saves %p steps done as Setup %p with %p collected", (done, setupDone, collected) => {
    const state = new ExtractPathwaysState({ setupDone: true, collected: 7 });
    extractProgress(state, MAX_COLLECTED).setDone(done);
    expect(state.setupDone).toBe(setupDone);
    expect(state.collected).toBe(collected);
  });
});

describe("extractButtons", () => {
  const buttons = extractButtons(MAX_COLLECTED);
  const runs = (done: number) => buttons.map(b => b.run(done));

  it("are Setup, Collect a Conversation and the two steps still to come", () => {
    expect(buttons.map(b => b.label))
      .toEqual(["Setup", "Collect a Conversation", "Collect All Conversations", "Extract Pathways"]);
    expect(buttons.every(b => b.showsDone === undefined)).toBe(true);
  });

  it.each<[number, unknown[]]>([
    [0, [{ from: 0, to: 1 }, { from: 1, to: 2 }, undefined, undefined]],
    [1, [{ from: 0, to: 1 }, { from: 1, to: 2 }, undefined, undefined]],
    [5, [{ from: 0, to: 1 }, { from: 5, to: 6 }, undefined, undefined]],
    [11, [{ from: 0, to: 1 }, undefined, undefined, undefined]],
  ])("at %p steps done play %j", (done, expected) => {
    expect(runs(done)).toEqual(expected);
  });

  it("stop collecting at the limit", () => {
    expect(extractButtons(3)[1].run(3)).toEqual({ from: 3, to: 4 });
    expect(extractButtons(3)[1].run(4)).toBeUndefined();
  });
});
