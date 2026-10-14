import { collectAllDuration, collectAllPlan, collectAllSceneAt, HANDOVER_MS } from "./collect-all-timeline";
import { collectDuration, collectSceneAt } from "./collect-timeline";
import { columnGap, setOffset } from "./deck-layout";
import { deckRestScene } from "./extract-scene";

const SIZES = [10, 8, 6, 2];
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
/** Set 0's beats in a run that starts with `from` in. */
const beatsFrom = (from: number) => sum(Array.from({ length: 20 - from }, (_, i) => columnGap(from + i, from)));

describe("collectAllPlan", () => {
  it("collects by hand up to three first, and none once three are in", () => {
    expect(collectAllPlan(SIZES, 0, 800).byHand).toEqual([1, 2, 3]);
    expect(collectAllPlan(SIZES, 2, 800).byHand).toEqual([3]);
    expect(collectAllPlan(SIZES, 5, 800).byHand).toEqual([]);
    expect(collectAllPlan(SIZES, 0, 2).byHand).toEqual([1, 2]);
  });

  it("hands over once the collections by hand are done, then starts set 0's beats", () => {
    const plan = collectAllPlan(SIZES, 1, 800);
    expect(plan.handOver).toBe(collectDuration(SIZES, 2) + collectDuration(SIZES, 3));
    expect(plan.from).toBe(3);
    expect(plan.beats[0]).toEqual({ column: 3, start: plan.handOver + HANDOVER_MS, gap: 900 });
  });

  it("shortens set 0's beats across the run, from 900 to 240", () => {
    const gaps = collectAllPlan(SIZES, 10, 800).beats.map(beat => beat.gap);
    expect(gaps[0]).toBe(900);
    expect(gaps[gaps.length - 1]).toBe(240);
    gaps.slice(1).forEach((gap, i) => expect(gap).toBeLessThan(gaps[i]));
  });

  it("brings set 1 in a column every 120 ms, and every later set whole", () => {
    const plan = collectAllPlan(SIZES, 3, 800);
    expect(plan.set1).toHaveLength(20);
    expect(plan.set1[1] - plan.set1[0]).toBe(120);
    expect(plan.entries.map(entry => entry.set)).toEqual(Array.from({ length: 38 }, (_, i) => i + 2));
    expect(plan.closes).toHaveLength(39);
  });

  it("ends after the count with one set, and when set 1 has closed with two", () => {
    expect(collectAllPlan(SIZES, 3, 20).end).toBe(HANDOVER_MS + beatsFrom(3) + 520 + 320 + 340);
    const two = collectAllPlan(SIZES, 3, 30);
    expect(two.set1).toHaveLength(10);
    expect(two.end).toBe(two.closes[0].start + 620);
  });

  it("ends when the last set has faded in, which is after it has closed", () => {
    const plan = collectAllPlan(SIZES, 3, 800);
    const last = plan.entries[plan.entries.length - 1];
    expect(plan.end).toBe(last.at + 160);
    expect(collectAllDuration(SIZES, 3, 800)).toBe(plan.end);
  });
});

describe("collectAllSceneAt", () => {
  it("plays the missing collections first, exactly as Collect a Conversation does", () => {
    expect(collectAllSceneAt(SIZES, 1, 800, 500)).toEqual(collectSceneAt(SIZES, 2, 500));
    expect(collectAllSceneAt(SIZES, 1, 800, collectDuration(SIZES, 2) + 700)).toEqual(collectSceneAt(SIZES, 3, 700));
  });

  it("hands the columns collected by hand to the deck, then fades the network and lifts the column back up", () => {
    const start = collectAllSceneAt(SIZES, 3, 800, 0);
    expect(start.networkOpacity).toBe(1);
    expect(start.lifted!.opacity).toBe(0.5);
    expect(start.collections).toEqual([]);
    expect(start.deck!.sets).toEqual([{ offset: 0, shift: 0, opacity: 1, columns: 3, lastOpacity: 1 }]);
    const hidden = collectAllSceneAt(SIZES, 3, 800, 900);
    expect(hidden.networkOpacity).toBe(0);
    expect(hidden.lifted!.opacity).toBe(1);
    expect(hidden.label).toBeUndefined();
  });

  it("centers the deck for one more column by the end of the hand-over", () => {
    const deck = collectAllSceneAt(SIZES, 3, 800, HANDOVER_MS).deck!;
    expect(deck.centered).toBe(1);
    expect(deck.sets[0].offset).toBe(1.5);
  });

  it("slides each column of set 0 in from the left, labels it, and settles it", () => {
    const beat = collectAllPlan(SIZES, 3, 800).beats[2];
    expect(beat.column).toBe(5);
    const sliding = collectAllSceneAt(SIZES, 3, 800, beat.start + 100).deck!;
    expect(sliding.arriving).toHaveLength(1);
    expect(sliding.arriving[0].column).toBe(5);
    expect(sliding.arriving[0].dx).toBeLessThan(0);
    expect(sliding.arriving[0].opacity).toBeGreaterThan(0);
    expect(sliding.labels.map(label => label.column)).toContain(5);
    expect(sliding.sets[0].columns).toBe(5);
    const settled = collectAllSceneAt(SIZES, 3, 800, beat.start + 700).deck!;
    expect(settled.arriving).toEqual([]);
    expect(settled.sets[0].columns).toBe(6);
  });

  it("counts set 0, then each set as it closes", () => {
    const plan = collectAllPlan(SIZES, 3, 800);
    expect(collectAllSceneAt(SIZES, 3, 800, plan.countAt - 1).deck!.count).toBeUndefined();
    expect(collectAllSceneAt(SIZES, 3, 800, plan.countAt + 320).deck!.count).toEqual({ n: 20, opacity: 1 });
    expect(collectAllSceneAt(SIZES, 3, 800, plan.closes[0].start + 620).deck!.count).toEqual({ n: 40, opacity: 1 });
    const close = plan.closes[1];
    expect(collectAllSceneAt(SIZES, 3, 800, close.start + close.duration).deck!.count!.n).toBe(60);
  });

  it("brings each later set in short of its place, and closes every set up for the deck it makes", () => {
    const plan = collectAllPlan(SIZES, 3, 800);
    const entry = plan.entries[0];
    const arriving = collectAllSceneAt(SIZES, 3, 800, entry.at).deck!;
    expect(arriving.sets[2]).toMatchObject({ offset: setOffset(2, 60), shift: -50, opacity: 0, columns: 20 });
    expect(arriving.shade).toBe(2);
    const close = plan.closes[1];
    const closed = collectAllSceneAt(SIZES, 3, 800, close.start + close.duration).deck!;
    expect(closed.sets.map(set => set.offset)).toEqual([0, 1, 2].map(set => setOffset(set, 60)));
    expect(closed.sets[2].shift).toBe(0);
  });

  it("describes the deck by the conversations collected by hand until it is done", () => {
    const plan = collectAllPlan(SIZES, 3, 800);
    expect(collectAllSceneAt(SIZES, 3, 800, plan.end - 1).deck).toMatchObject({ collected: 3, done: false });
  });

  it.each<[number, number]>([[0, 800], [3, 800], [10, 800], [3, 20], [3, 30], [2, 3]])(
    "ends from %p collected of %p on the deck at rest",
    (collected, size) => {
      expect(collectAllSceneAt(SIZES, collected, size, collectAllDuration(SIZES, collected, size)))
        .toEqual(deckRestScene(SIZES, size));
    },
  );
});
