import { getEmbedViewId, getHashViewId, viewHash } from "./url-state";

describe("getEmbedViewId", () => {
  it("returns null when there is no interactive param", () => {
    expect(getEmbedViewId("")).toBeNull();
    expect(getEmbedViewId("?other=1")).toBeNull();
  });

  it("returns the interactive param", () => {
    expect(getEmbedViewId("?interactive=correlations")).toBe("correlations");
    expect(getEmbedViewId("?a=1&interactive=trace-a-case")).toBe("trace-a-case");
  });

  it("returns an empty string when the param is present but empty", () => {
    expect(getEmbedViewId("?interactive=")).toBe("");
    expect(getEmbedViewId("?interactive")).toBe("");
  });
});

describe("getHashViewId", () => {
  it("returns null when the hash has no view key", () => {
    expect(getHashViewId("")).toBeNull();
    expect(getHashViewId("#")).toBeNull();
    expect(getHashViewId("#correlations")).toBeNull();
  });

  it("returns the view key", () => {
    expect(getHashViewId("#view=correlations")).toBe("correlations");
    expect(getHashViewId("#view=correlations&x=1")).toBe("correlations");
  });
});

describe("viewHash", () => {
  it("builds a hash that getHashViewId reads back", () => {
    expect(viewHash("prediction-chain")).toBe("#view=prediction-chain");
    expect(getHashViewId(viewHash("prediction-chain"))).toBe("prediction-chain");
  });
});
