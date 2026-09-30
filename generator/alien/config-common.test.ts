import { BaseAttribute, BASE_ATTRIBUTES, withPathwayAssignments } from "./config-common";

function base(key: string): BaseAttribute {
  return {
    key,
    label: key,
    description: `the ${key} attribute`,
    type: "binary",
    hidden: false,
    valueShares: [0.5, 0.5],
    minValue: 0,
    notes: { 0: ["no one", "nobody"], 1: ["someone", "somebody"] },
  };
}

const twoAttributes = [base("alpha"), base("beta")];

describe("withPathwayAssignments", () => {
  it("applies each attribute's pathway and target correlation", () => {
    const result = withPathwayAssignments(twoAttributes, {
      alpha: { pathway: 0, targetR: 0.65 },
      beta: { pathway: null, targetR: 0 },
    });
    expect(result.map(a => [a.key, a.pathway, a.targetR]))
      .toEqual([["alpha", 0, 0.65], ["beta", null, 0]]);
  });

  it("keeps the base order", () => {
    // solveAttributes consumes the single PRNG one attribute at a time in list
    // order, so reordering the list changes every value in the dataset. An
    // object literal's key order must not be able to leak into the output.
    const result = withPathwayAssignments(twoAttributes, {
      beta: { pathway: null, targetR: 0 },
      alpha: { pathway: 0, targetR: 0.65 },
    });
    expect(result.map(a => a.key)).toEqual(["alpha", "beta"]);
  });

  it("carries every other field through untouched", () => {
    const result = withPathwayAssignments([base("alpha")], {
      alpha: { pathway: 2, targetR: 0.15 },
    });
    expect(result[0].notes).toEqual({ 0: ["no one", "nobody"], 1: ["someone", "somebody"] });
    expect(result[0].valueShares).toEqual([0.5, 0.5]);
    expect(result[0].hidden).toBe(false);
  });

  it("throws when a base attribute has no assignment", () => {
    expect(() => withPathwayAssignments(twoAttributes, {
      alpha: { pathway: 0, targetR: 0.65 },
    })).toThrow(/"beta" has no pathway assignment/);
  });

  it("throws when an assignment names an attribute that does not exist", () => {
    expect(() => withPathwayAssignments(twoAttributes, {
      alpha: { pathway: 0, targetR: 0.65 },
      beta: { pathway: null, targetR: 0 },
      gamma: { pathway: 1, targetR: 0.3 },
    })).toThrow(/"gamma"/);
  });
});

describe("BASE_ATTRIBUTES", () => {
  it("lists the nine attributes in the order the PRNG consumes them", () => {
    expect(BASE_ATTRIBUTES.map(a => a.key)).toEqual([
      "voices_raised", "engaged_in_task", "group_size", "near_water", "food_present",
      "resource_stressed", "gestures_repeated", "young_present", "carrying_burden",
    ]);
  });
});
