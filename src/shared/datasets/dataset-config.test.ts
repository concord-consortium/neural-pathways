import { AttributeDefinition } from "../types/attributes";
import { S3Index } from "../types/s3-data";
import {
  validateAttributeKeys, RESERVED_FIELD_NAMES, activateDataset, capitalize,
  applyCommissions, codeableAttributes, NO_COMMISSIONS, LoadedDataset,
} from "./dataset-config";
import { yelpDataset } from "./yelp-dataset";

const def = (key: string): AttributeDefinition => ({
  key,
  label: "Label",
  description: "Description",
  type: "binary",
});

describe("validateAttributeKeys", () => {
  it("accepts non-colliding keys", () => {
    expect(() => validateAttributeKeys([def("voices_raised"), def("food_present")])).not.toThrow();
  });

  it("rejects a key that collides with a reserved field name", () => {
    expect(() => validateAttributeKeys([def("text")])).toThrow(/reserved search field/);
  });

  it("rejects a key matching the pathway_<n> pattern", () => {
    expect(() => validateAttributeKeys([def("pathway_3")])).toThrow(/pathway_<n>/);
  });

  it("rejects duplicate keys", () => {
    expect(() => validateAttributeKeys([def("food_present"), def("food_present")]))
      .toThrow(/Duplicate attribute key/);
  });

  it("allows aliasing the numeric star fields", () => {
    // Attributes may alias an existing numeric search field when the value is identical.
    expect(() => validateAttributeKeys([def("stars"), def("review_stars")])).not.toThrow();
  });

  it("does not list the aliasable star fields as reserved", () => {
    expect(RESERVED_FIELD_NAMES).not.toContain("stars");
    expect(RESERVED_FIELD_NAMES).not.toContain("review_stars");
  });
});

const visible: AttributeDefinition = {
  key: "voices_raised", label: "Voices raised", description: "d", type: "binary",
};
const hiddenA: AttributeDefinition = {
  key: "resource_stressed", label: "Resource stressed", description: "d",
  type: "binary", hidden: true,
};
const hiddenB: AttributeDefinition = {
  key: "young_present", label: "Young present", description: "d", type: "binary", hidden: true,
};

function makeLoaded(): LoadedDataset {
  return {
    config: yelpDataset,
    allAttributes: [visible, hiddenA, hiddenB],
    getAttributeValue: () => null,
  };
}

describe("applyCommissions", () => {
  it("hides attributes marked hidden", () => {
    const active = applyCommissions(makeLoaded(), NO_COMMISSIONS);
    expect(active.attributes.map(a => a.key)).toEqual(["voices_raised"]);
  });

  it("reveals a commissioned attribute in its declared position", () => {
    const active = applyCommissions(makeLoaded(), new Set(["young_present"]));
    expect(active.attributes.map(a => a.key)).toEqual(["voices_raised", "young_present"]);
  });

  it("always exposes everything through allAttributes", () => {
    const active = applyCommissions(makeLoaded(), NO_COMMISSIONS);
    expect(active.allAttributes.map(a => a.key))
      .toEqual(["voices_raised", "resource_stressed", "young_present"]);
  });

  it("ignores a commissioned key that names no attribute", () => {
    const active = applyCommissions(makeLoaded(), new Set(["gone_away"]));
    expect(active.attributes.map(a => a.key)).toEqual(["voices_raised"]);
  });

  it("leaves a dataset with nothing hidden untouched", () => {
    const loaded = { ...makeLoaded(), allAttributes: [visible] };
    expect(applyCommissions(loaded, NO_COMMISSIONS).attributes).toEqual([visible]);
  });
});

describe("codeableAttributes", () => {
  it("returns the hidden ones, commissioned or not", () => {
    expect(codeableAttributes([visible, hiddenA, hiddenB]).map(a => a.key))
      .toEqual(["resource_stressed", "young_present"]);
  });

  it("returns nothing for a dataset that hides nothing", () => {
    expect(codeableAttributes([visible])).toEqual([]);
  });
});

describe("activateDataset", () => {
  it("returns every declared attribute, hidden included", () => {
    const index = { metadata: { fa_fits: {}, review_sets: {} }, items: [] } as unknown as S3Index;
    expect(activateDataset(yelpDataset, index).allAttributes)
      .toEqual(yelpDataset.resolveAttributes(index));
  });
});

describe("capitalize", () => {
  it("raises only the first letter", () => {
    expect(capitalize("conversation")).toBe("Conversation");
    expect(capitalize("")).toBe("");
  });
});
