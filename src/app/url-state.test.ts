import { getInteractiveViewId, getHashViewId, viewHash } from "./url-state";

describe("getInteractiveViewId", () => {
  it("returns null when there is no interactive param", () => {
    expect(getInteractiveViewId("")).toBeNull();
    expect(getInteractiveViewId("?other=1")).toBeNull();
  });

  it("returns the interactive param", () => {
    expect(getInteractiveViewId("?interactive=correlations")).toBe("correlations");
    expect(getInteractiveViewId("?a=1&interactive=trace-a-case")).toBe("trace-a-case");
  });

  it("returns an empty string when the param is present but empty", () => {
    expect(getInteractiveViewId("?interactive=")).toBe("");
    expect(getInteractiveViewId("?interactive")).toBe("");
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
