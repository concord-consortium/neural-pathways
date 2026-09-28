import { AttributeDefinition } from "../../../core/types/attributes";
import { S3Index } from "../../../core/types/s3-data";
import {
  activateDataset, capitalize, applyCommissions, codeableAttributes, NO_COMMISSIONS, LoadedDataset,
} from "./dataset-config";
import { yelpDataset } from "./yelp-dataset";

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
