import { ExtractPathwaysState } from "./extract-pathways-state";
import { extractButtons, extractProgress, MAX_COLLECTED } from "./extract-steps";

describe("extractProgress", () => {
  it.each<[boolean, number, number]>([
    [false, 0, 0],
    [true, 0, 1],
    [true, 4, 5],
  ])("reads Setup %p with %p collected as marker %p", (setupDone, collected, marker) => {
    const state = new ExtractPathwaysState({ setupDone, collected });
    expect(extractProgress(state, MAX_COLLECTED).marker).toBe(marker);
  });

  it("reads a count without Setup as the start", () => {
    expect(extractProgress(new ExtractPathwaysState({ setupDone: false, collected: 3 }), MAX_COLLECTED).marker).toBe(0);
  });

  it("reads no more conversations than the limit", () => {
    const state = new ExtractPathwaysState({ setupDone: true, collected: 12 });
    expect(extractProgress(state, MAX_COLLECTED).marker).toBe(11);
    expect(extractProgress(state, 3).marker).toBe(4);
  });

  it.each<[number, boolean, number]>([
    [0, false, 0],
    [1, true, 0],
    [4, true, 3],
  ])("stores marker %p as Setup %p with %p collected", (marker, setupDone, collected) => {
    const state = new ExtractPathwaysState({ setupDone: true, collected: 7 });
    extractProgress(state, MAX_COLLECTED).setMarker(marker);
    expect(state.setupDone).toBe(setupDone);
    expect(state.collected).toBe(collected);
  });
});

describe("extractButtons", () => {
  const buttons = extractButtons(MAX_COLLECTED);
  const segments = (marker: number) => buttons.map(b => b.segmentToPlayWhenAt(marker));

  it("are Setup, Collect a Conversation and the two steps still to come", () => {
    expect(buttons.map(b => b.label))
      .toEqual(["Setup", "Collect a Conversation", "Collect All Conversations", "Extract Pathways"]);
    expect(buttons.every(b => b.showAsCurrentWhenAt === undefined)).toBe(true);
  });

  it.each<[number, unknown[]]>([
    [0, [{ from: 0, to: 1 }, { from: 1, to: 2 }, undefined, undefined]],
    [1, [{ from: 0, to: 1 }, { from: 1, to: 2 }, undefined, undefined]],
    [5, [{ from: 0, to: 1 }, { from: 5, to: 6 }, undefined, undefined]],
    [11, [{ from: 0, to: 1 }, undefined, undefined, undefined]],
  ])("at marker %p play %j", (marker, expected) => {
    expect(segments(marker)).toEqual(expected);
  });

  it("stop collecting at the limit", () => {
    expect(extractButtons(3)[1].segmentToPlayWhenAt(3)).toEqual({ from: 3, to: 4 });
    expect(extractButtons(3)[1].segmentToPlayWhenAt(4)).toBeUndefined();
  });
});
