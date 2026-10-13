import { emptyScene, fullScene } from "../../core/network-diagram/scene";
import { setOffset } from "./deck-layout";
import { deckStack, hiddenCount, pathwaysRestScene, restScene, stackRestScene } from "./extract-scene";

const SIZES = [10, 8, 6, 2];
const LANDED = 2166;

describe("hiddenCount", () => {
  it("counts the units of every layer but the first and last", () => {
    expect(hiddenCount(SIZES)).toBe(14);
  });
});

describe("restScene", () => {
  it("is the blank network before Setup", () => {
    expect(restScene(SIZES, 0)).toEqual({
      network: emptyScene(SIZES), networkOpacity: 1, shown: undefined, label: undefined,
      lifted: undefined, deck: [], stack: undefined,
    });
  });

  it("adds the landed lifted column once Setup is done", () => {
    expect(restScene(SIZES, 1)).toEqual({
      network: emptyScene(SIZES), networkOpacity: 1, shown: undefined, label: undefined,
      lifted: { flight: LANDED, opacity: 1, labelOpacity: 1 }, deck: [], stack: undefined,
    });
  });

  it("shows the last conversation collected in full, labeled, with the deck, spotlit as its flight left it", () => {
    expect(restScene(SIZES, 4)).toEqual({
      network: { ...fullScene(SIZES), hiddenLayerSpotlight: 0.5 }, networkOpacity: 1,
      shown: 3, label: { n: 3, bounce: 1 },
      lifted: { flight: LANDED, opacity: 0.5, labelOpacity: 1 },
      deck: [1, 2, 3].map(conversation => ({ conversation, flight: LANDED })),
      stack: undefined,
    });
  });
});

describe("stackRestScene", () => {
  it("is the finished deck of 40 sets beside the lifted column at full strength, with no network", () => {
    const scene = stackRestScene(SIZES, 800);
    expect(scene).toMatchObject({
      networkOpacity: 0, shown: undefined, label: undefined, deck: [],
      lifted: { flight: LANDED, opacity: 1, labelOpacity: 1 },
    });
    const stack = scene.stack!;
    expect(stack.sets).toHaveLength(40);
    expect(stack.sets[0]).toEqual({ offset: setOffset(0, 40), shift: 0, opacity: 1, columns: 20, lastOpacity: 1 });
    expect(stack.sets[39].offset).toBe(setOffset(39, 40));
    expect(stack).toMatchObject({
      centered: 1, slide: 0, arriving: [], shade: 39, labels: [], count: { n: 800, opacity: 1 },
      collected: 800, done: true,
    });
  });
});

describe("deckStack", () => {
  it("ends on a partial set", () => {
    expect(deckStack(30).sets.map(s => s.columns)).toEqual([20, 10]);
  });

  it("centers a lone set on its own columns", () => {
    expect(deckStack(7).sets).toEqual([{ offset: 3, shift: 0, opacity: 1, columns: 7, lastOpacity: 1 }]);
    expect(deckStack(7).shade).toBe(0);
  });
});

describe("pathwaysRestScene", () => {
  it("is the deck slid half off the canvas, and the finished pathways", () => {
    const scene = pathwaysRestScene(SIZES, 800);
    expect(scene.stack).toMatchObject({ slide: 1, done: true });
    expect(scene.pathways).toMatchObject({
      slide: 1, particles: undefined, flying: undefined, lines: 1, done: true,
      boxes: [1, 2, 3].map(() => ({ opacity: 1, kick: undefined })),
    });
    expect(scene.pathways!.bars).toHaveLength(42);
    expect(scene.pathways!.bars!.every(bar => bar.grown === 1 && bar.muted === 0)).toBe(true);
  });
});
