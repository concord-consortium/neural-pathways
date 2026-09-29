import { findView, VIEWS } from "./views";

describe("VIEWS", () => {
  it("lists the lesson views in lesson order", () => {
    expect(VIEWS.map(view => view.id)).toEqual([
      "trace-a-case",
      "extract-pathways",
      "investigate-pathways",
      "prediction-chain",
      "correlations",
      "investigate-unknown-pathway",
      "correlations-part-2",
    ]);
  });

  it("has unique ids", () => {
    const ids = VIEWS.map(view => view.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses lowercase, hyphenated ids that are safe in a URL", () => {
    for (const view of VIEWS) {
      expect(view.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("gives every view a title", () => {
    for (const view of VIEWS) {
      expect(view.title.trim()).not.toBe("");
    }
  });
});

describe("findView", () => {
  it("finds a view by id", () => {
    expect(findView("correlations")?.title).toBe("Correlations");
  });

  it("is case-sensitive and returns undefined for unknown ids", () => {
    expect(findView("Correlations")).toBeUndefined();
    expect(findView("")).toBeUndefined();
  });
});
