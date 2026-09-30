import { dataUrl } from "./data-url";

// Webpack defines this in the bundle. Jest has no webpack, so the tests stand in for it.
const webpackGlobal = globalThis as unknown as { __webpack_public_path__?: string };

const RELEASE_ROOT = "https://example.org/neural-pathways/version/v1.0.0/";
const YELP_BASE = "https://models-resources.s3.amazonaws.com/neural-pathways/data/v1/";

afterEach(() => {
  delete webpackGlobal.__webpack_public_path__;
});

describe("dataUrl", () => {
  it("stays page-relative when there is no webpack public path", () => {
    expect(dataUrl("alien-data-3/", "index.json")).toBe("alien-data-3/index.json");
  });

  it("resolves a relative base against the build root, not the page", () => {
    webpackGlobal.__webpack_public_path__ = RELEASE_ROOT;
    expect(dataUrl("alien-data-3/", "activations/36.json"))
      .toBe(`${RELEASE_ROOT}alien-data-3/activations/36.json`);
  });

  it("normalizes the auto public path's step back out of assets/", () => {
    // webpack's "auto" public path is the script's folder plus "../" when the
    // output filename lives in a subfolder, as ours does (assets/[name].js).
    webpackGlobal.__webpack_public_path__ = `${RELEASE_ROOT}assets/../`;
    expect(dataUrl("alien-data-3/", "index.json")).toBe(`${RELEASE_ROOT}alien-data-3/index.json`);
  });

  it("leaves an absolute base alone", () => {
    webpackGlobal.__webpack_public_path__ = RELEASE_ROOT;
    expect(dataUrl(YELP_BASE, "index.json")).toBe(`${YELP_BASE}index.json`);
  });
});
