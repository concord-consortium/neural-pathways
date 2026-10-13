import { ExtractPathwaysState } from "./extract-pathways-state";
import { DECK_MARKER, extractButtons, extractProgress, MAX_COLLECTED, PATHWAYS_MARKER } from "./extract-steps";

describe("extractProgress", () => {
  const SIZE = 800;
  const markerOf = (fields: ConstructorParameters<typeof ExtractPathwaysState>[0], limit = MAX_COLLECTED) =>
    extractProgress(new ExtractPathwaysState(fields), limit, SIZE).marker;

  it.each<[string, ConstructorParameters<typeof ExtractPathwaysState>[0], number]>([
    ["nothing", {}, 0],
    ["Setup", { setupDone: true }, 1],
    ["four collected", { setupDone: true, collected: 4 }, 5],
    ["the deck", { setupDone: true, collected: 800, deckDone: true }, DECK_MARKER],
    ["the pathways", { setupDone: true, collected: 800, deckDone: true, pathwaysDone: true }, PATHWAYS_MARKER],
    ["the pathways without the deck", { setupDone: true, collected: 3, pathwaysDone: true }, PATHWAYS_MARKER],
    ["a deck without Setup", { collected: 800, deckDone: true }, 0],
  ])("reads %s as marker %p", (_, fields, marker) => {
    expect(markerOf(fields)).toBe(marker);
  });

  it("reads no more conversations by hand than the limit", () => {
    expect(markerOf({ setupDone: true, collected: 12 })).toBe(11);
    expect(markerOf({ setupDone: true, collected: 12 }, 3)).toBe(4);
  });

  it.each<[number, object]>([
    [0, { setupDone: false, collected: 0, deckDone: false, pathwaysDone: false }],
    [1, { setupDone: true, collected: 0, deckDone: false, pathwaysDone: false }],
    [4, { setupDone: true, collected: 3, deckDone: false, pathwaysDone: false }],
    [DECK_MARKER, { setupDone: true, collected: SIZE, deckDone: true, pathwaysDone: false }],
    [PATHWAYS_MARKER, { setupDone: true, collected: SIZE, deckDone: true, pathwaysDone: true }],
  ])("stores marker %p as %j", (marker, stored) => {
    const state = new ExtractPathwaysState({ setupDone: true, collected: 7, deckDone: true, pathwaysDone: true });
    extractProgress(state, MAX_COLLECTED, SIZE).setMarker(marker);
    expect(state).toMatchObject(stored);
  });
});

describe("extractButtons", () => {
  const buttons = extractButtons(MAX_COLLECTED);
  const segments = (marker: number) => buttons.map(b => b.segmentToPlayWhenAt(marker));

  it("are Setup, Collect a Conversation, Collect All Conversations and Extract Pathways", () => {
    expect(buttons.map(b => b.label))
      .toEqual(["Setup", "Collect a Conversation", "Collect All Conversations", "Extract Pathways"]);
    expect(buttons.every(b => b.showAsCurrentWhenAt === undefined)).toBe(true);
  });

  it.each<[number, unknown[]]>([
    [0, [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 1, to: DECK_MARKER }, { from: DECK_MARKER, to: PATHWAYS_MARKER }]],
    [1, [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 1, to: DECK_MARKER }, { from: DECK_MARKER, to: PATHWAYS_MARKER }]],
    [5, [{ from: 0, to: 1 }, { from: 5, to: 6 }, { from: 5, to: DECK_MARKER }, { from: DECK_MARKER, to: PATHWAYS_MARKER }]],
    [11, [{ from: 0, to: 1 }, undefined, { from: 11, to: DECK_MARKER }, { from: DECK_MARKER, to: PATHWAYS_MARKER }]],
    [DECK_MARKER, [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 1, to: DECK_MARKER }, { from: DECK_MARKER, to: PATHWAYS_MARKER }]],
    [PATHWAYS_MARKER, [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 1, to: DECK_MARKER }, { from: DECK_MARKER, to: PATHWAYS_MARKER }]],
  ])("at marker %p play %j", (marker, expected) => {
    expect(segments(marker)).toEqual(expected);
  });

  it("stop collecting at the limit", () => {
    expect(extractButtons(3)[1].segmentToPlayWhenAt(3)).toEqual({ from: 3, to: 4 });
    expect(extractButtons(3)[1].segmentToPlayWhenAt(4)).toBeUndefined();
  });
});
