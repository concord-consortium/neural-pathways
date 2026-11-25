import { isLit, PathwaysPick, samePick, togglePick } from "./pick";

describe("isLit", () => {
  it("lights everything when nothing is picked", () => {
    expect(isLit(undefined, 3, 1)).toBe(true);
  });

  it("lights a picked neuron's three loadings and no other", () => {
    const pick: PathwaysPick = { kind: "neuron", index: 3 };
    [0, 1, 2].forEach(pathway => expect(isLit(pick, 3, pathway)).toBe(true));
    expect(isLit(pick, 4, 0)).toBe(false);
  });

  it("lights a picked pathway's 14 loadings and no other", () => {
    const pick: PathwaysPick = { kind: "pathway", index: 1 };
    for (let neuron = 0; neuron < 14; neuron++) {
      expect(isLit(pick, neuron, 1)).toBe(true);
    }
    expect(isLit(pick, 3, 0)).toBe(false);
  });
});

describe("togglePick", () => {
  it("picks, clears on the same pick again, and switches to a different one", () => {
    const neuron: NonNullable<PathwaysPick> = { kind: "neuron", index: 2 };
    const picked = togglePick(undefined, neuron);
    expect(picked).toEqual(neuron);
    expect(togglePick(picked, { ...neuron })).toBeUndefined();
    expect(togglePick(picked, { kind: "pathway", index: 2 })).toEqual({ kind: "pathway", index: 2 });
    expect(togglePick(picked, { kind: "neuron", index: 3 })).toEqual({ kind: "neuron", index: 3 });
  });
});

describe("samePick", () => {
  it("compares kind and index, and treats two empty picks as the same", () => {
    expect(samePick(undefined, undefined)).toBe(true);
    expect(samePick({ kind: "neuron", index: 1 }, { kind: "neuron", index: 1 })).toBe(true);
    expect(samePick({ kind: "neuron", index: 1 }, { kind: "pathway", index: 1 })).toBe(false);
    expect(samePick({ kind: "neuron", index: 1 }, undefined)).toBe(false);
  });
});
