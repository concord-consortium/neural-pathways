import { emptyScene, fullScene } from "./scene";

describe("scenes", () => {
  const sizes = [10, 8, 6, 2];

  it("sizes an empty scene to the columns and gaps", () => {
    const scene = emptyScene(sizes);
    expect(scene.nodeFill.map(column => column.length)).toEqual(sizes);
    expect(scene.edgeDraw.map(gap => gap.length)).toEqual([10, 8, 6]);
    expect(scene.nodeFill.every(column => column.every(x => x === 0))).toBe(true);
    expect(scene.edgeDraw.every(gap => gap.every(x => x === 0))).toBe(true);
    expect(scene.weightLabel).toEqual([false, false, false]);
    expect(scene.answer).toBe(0);
  });

  it("fills a full scene", () => {
    const scene = fullScene(sizes);
    expect(scene.nodeFill.every(column => column.every(x => x === 1))).toBe(true);
    expect(scene.edgeDraw.every(gap => gap.every(x => x === 1))).toBe(true);
    expect(scene.weightLabel).toEqual([true, true, true]);
    expect(scene.answer).toBe(1);
  });

  it("draws both scenes at full strength", () => {
    expect(emptyScene(sizes).dim).toEqual({ rest: 1, hidden: 1 });
    expect(fullScene(sizes).dim).toEqual({ rest: 1, hidden: 1 });
  });
});
