import { emptyScene, fullScene } from "../../core/network-diagram/scene";
import { hiddenCount, restScene } from "./extract-scene";

const SIZES = [10, 8, 6, 2];
const LANDED = 2166;

describe("hiddenCount", () => {
  it("counts the units of every column but the first and last", () => {
    expect(hiddenCount(SIZES)).toBe(14);
  });
});

describe("restScene", () => {
  it("is the blank network before Setup", () => {
    expect(restScene(SIZES, 0)).toEqual({
      network: emptyScene(SIZES), shown: undefined, label: undefined, lifted: undefined, deck: [],
    });
  });

  it("adds the landed lifted column once Setup is done", () => {
    expect(restScene(SIZES, 1)).toEqual({
      network: emptyScene(SIZES), shown: undefined, label: undefined,
      lifted: { flight: LANDED, opacity: 1, labelOpacity: 1 }, deck: [],
    });
  });

  it("shows the last conversation collected in full, labeled, with the deck, dimmed as its flight left it", () => {
    expect(restScene(SIZES, 4)).toEqual({
      network: { ...fullScene(SIZES), dim: 0.5 }, shown: 3, label: { n: 3, bounce: 1 },
      lifted: { flight: LANDED, opacity: 0.5, labelOpacity: 1 },
      deck: [1, 2, 3].map(conversation => ({ conversation, flight: LANDED })),
    });
  });
});
