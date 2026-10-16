import { forward } from "../../core/network/forward";
import { toyNetwork } from "../../core/network/toy-network";
import fixture from "../../core/network/__fixtures__/alien3-conversations.json";
import {
  centerShift, columnGap, columnsInSet, columnsWithSets, columnValues, deckMid, deckSize, deckWidth, setCount,
  setEnter, setGap, setHold, setMove, setOffset,
} from "./deck-layout";
import { extractGeometry } from "./extract-geometry";

const SIZES = [10, 8, 6, 2];

describe("the deck's size", () => {
  it("holds every conversation loaded, up to 800, in sets of 20", () => {
    expect(deckSize(800)).toBe(800);
    expect(deckSize(1200)).toBe(800);
    expect(deckSize(20)).toBe(20);
    expect(setCount(800)).toBe(40);
    expect(setCount(30)).toBe(2);
    expect(setCount(7)).toBe(1);
  });

  it("fills every set but the last, which holds the rest", () => {
    expect(columnsInSet(0, 30)).toBe(20);
    expect(columnsInSet(1, 30)).toBe(10);
    expect(columnsInSet(1, 40)).toBe(20);
    expect(columnsInSet(0, 7)).toBe(7);
  });

  it("counts the columns once the first sets are in", () => {
    expect(columnsWithSets(2, 800)).toBe(40);
    expect(columnsWithSets(2, 30)).toBe(30);
  });

  it("is 21 radii wide for a full set, 2 more per full set behind, and one more than its columns alone", () => {
    expect(deckWidth(20)).toBe(21);
    expect(deckWidth(40)).toBe(23);
    expect(deckWidth(800)).toBe(99);
    expect(deckWidth(7)).toBe(8);
  });

  it("adds nothing for a last set of 18 columns or fewer, which ends inside the set in front", () => {
    expect(deckWidth(30)).toBe(21);
    expect(deckWidth(38)).toBe(21);
    expect(deckWidth(39)).toBe(22);
    expect(deckWidth(790)).toBe(97);
  });
});

describe("columnValues", () => {
  it("reads a column's hidden activations from its own conversation", () => {
    const passes = fixture.conversations.map(c => forward(toyNetwork, c.text));
    expect(columnValues(passes, 0, 3)).toEqual([...passes[3].layers[1], ...passes[3].layers[2]]);
  });
});

describe("setOffset", () => {
  it.each([1, 7, 20, 30, 38, 39, 40, 790, 799, 800])("centers what a deck of %p draws on the room's middle", size => {
    // Set 0's first column's right edge, and the left edge of the column furthest left: a set's last
    // column sits as many radii left of the set's offset as the set has columns, less one.
    const right = setOffset(0, size) + 1;
    const lefts = Array.from({ length: setCount(size) }, (_, set) => setOffset(set, size) - columnsInSet(set, size));
    const left = Math.min(...lefts);
    expect(right).toBeCloseTo(-left);
    expect(right - left).toBe(deckWidth(size));
  });

  it("puts each set a neuron's width left of the one in front of it", () => {
    expect(setOffset(0, 100) - setOffset(1, 100)).toBe(2);
  });

  it("centers set 0 on its own columns while it fills", () => {
    expect(setOffset(0, 7)).toBe(3);
    expect(setOffset(0, 20)).toBe(9.5);
  });
});

describe("deckMid and centerShift", () => {
  it("put the room's middle halfway between the canvas's left edge and the lifted column's", () => {
    const g = extractGeometry(SIZES, 995);
    expect(deckMid(g)).toBe((881 - 12) / 2);
    expect(centerShift(g)).toBe((881 - 12) / 2 - 115);
  });
});

describe("the deck's timings", () => {
  it("eases set 0's beats from 900 to 240 ms across the columns a run adds", () => {
    expect(columnGap(3, 3)).toBe(900);
    expect(columnGap(11, 3)).toBe(570);
    expect(columnGap(19, 3)).toBe(240);
    expect(columnGap(10, 10)).toBe(900);
    expect(columnGap(19, 10)).toBe(240);
  });

  it("brings set 2 in 50 px short of its place, down to 8 by set 9", () => {
    expect(setEnter(2)).toBe(50);
    expect(setEnter(5)).toBe(32);
    expect(setEnter(9)).toBe(8);
    expect(setEnter(30)).toBe(8);
  });

  it("shortens the beat after each set from 440 to 80 ms", () => {
    expect(setGap(2, 40)).toBe(440);
    expect(setGap(39, 40)).toBe(80);
  });

  it("fits each close in its beat, between 90 and 300 ms", () => {
    expect(setMove(440)).toBe(300);
    expect(setMove(80)).toBe(92);
    expect(setMove(60)).toBe(90);
  });

  it("holds sets 2 and 3 before they close", () => {
    expect(setHold(2)).toBe(340);
    expect(setHold(3)).toBe(170);
    expect(setHold(4)).toBe(0);
  });
});
