import { fetchIndex, fetchActivations, fetchShap } from "./data-loader";
import { alien3Dataset } from "./datasets/alien3-dataset";

const webpackGlobal = globalThis as unknown as { __webpack_public_path__?: string };
const FIT = "alien-fa-3";
const ID = "361e65b1002a";

const indexWire = {
  metadata: {
    fa_fits: {
      [FIT]: {
        source_split: "alien3",
        n_pathways: 3,
        explained_variance_per_pathway: [0.5, 0.3, 0.2],
        pathway_importance: [1, -1, 0.5],
        pathway_score_min: [-2, -2, -2],
        pathway_score_max: [2, 2, 2],
      },
    },
    review_sets: { alien3: { count: 1, description: "Alien conversations" } },
    attributes: [],
  },
  reviews: [
    {
      id: ID,
      sources: { alien3: [0] },
      text: "yandor quissa",
      target: 0,
      target_label: "wait",
      pathway_scores: { [FIT]: [-0.73, 0.43, -0.48] },
      reconstruction_r2: { [FIT]: 0.79 },
      pathway_variance_fractions: { [FIT]: [0.56, 0.2, 0.24] },
      has_shap: [FIT],
      classification: 0,
    },
  ],
};

const activationWire = {
  reviews: [
    { id: ID, activations: [0.1, 0.2, 0.3] },
    { id: "36ffffffffff", activations: [1, 2, 3] },
  ],
};

const shapWire = {
  reviews: [
    {
      id: ID,
      base_values: [0.02, 0.08, -0.02],
      unmasked_values: [-0.73, 0.43, -0.48],
      words: [
        { word: "[CLS]", scores: [0, 0, 0] },
        { word: "yandor", scores: [0, 0, -0.21] },
      ],
    },
  ],
};

function mockFetch(body: unknown) {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => body });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

afterEach(() => {
  delete webpackGlobal.__webpack_public_path__;
});

describe("fetchIndex", () => {
  it("fetches index.json from the dataset's base", async () => {
    const fetchMock = mockFetch(indexWire);
    await fetchIndex(alien3Dataset);
    expect(fetchMock).toHaveBeenCalledWith("alien-data-3/index.json");
  });

  it("exposes the wire's reviews array as items", async () => {
    mockFetch(indexWire);
    const index = await fetchIndex(alien3Dataset);
    expect(index.items.map(i => i.id)).toEqual([ID]);
    expect((index as unknown as { reviews?: unknown }).reviews).toBeUndefined();
    expect(index.metadata.fa_fits[FIT].n_pathways).toBe(3);
  });

  it("fetches from the build root when webpack sets a public path", async () => {
    webpackGlobal.__webpack_public_path__ = "https://example.org/neural-pathways/version/v1.0.0/";
    const fetchMock = mockFetch(indexWire);
    await fetchIndex(alien3Dataset);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.org/neural-pathways/version/v1.0.0/alien-data-3/index.json",
    );
  });

  it("leaves an absolute base alone under a public path", async () => {
    webpackGlobal.__webpack_public_path__ = "https://example.org/neural-pathways/version/v1.0.0/";
    const fetchMock = mockFetch(indexWire);
    await fetchIndex({ ...alien3Dataset, baseUrl: "https://data.example.org/v1/" });
    expect(fetchMock).toHaveBeenCalledWith("https://data.example.org/v1/index.json");
  });

  it("throws on a failed response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" }) as
      unknown as typeof fetch;
    await expect(fetchIndex(alien3Dataset)).rejects.toThrow("Failed to fetch alien-data-3/index.json: 404 Not Found");
  });

  it("names the URL when the fetch itself rejects", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Network down")) as unknown as typeof fetch;
    await expect(fetchIndex(alien3Dataset))
      .rejects.toThrow("Failed to fetch alien-data-3/index.json: Network down");
  });

  it("names the URL when the body is not JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => { throw new SyntaxError("Unexpected token <"); },
    }) as unknown as typeof fetch;
    await expect(fetchIndex(alien3Dataset))
      .rejects.toThrow("Failed to fetch alien-data-3/index.json: Unexpected token <");
  });
});

describe("fetchActivations", () => {
  it("fetches the item's two-character bucket and caches it", async () => {
    const fetchMock = mockFetch(activationWire);
    const cache = new Map();
    expect(await fetchActivations(alien3Dataset, ID, cache)).toEqual([0.1, 0.2, 0.3]);
    expect(fetchMock).toHaveBeenCalledWith("alien-data-3/activations/36.json");
    expect(cache.has("36")).toBe(true);
  });

  it("serves a second item in the same bucket from the cache", async () => {
    const fetchMock = mockFetch(activationWire);
    const cache = new Map();
    await fetchActivations(alien3Dataset, ID, cache);
    expect(await fetchActivations(alien3Dataset, "36ffffffffff", cache)).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the item is not in its bucket", async () => {
    mockFetch(activationWire);
    await expect(fetchActivations(alien3Dataset, "36zzzzzzzzzz", new Map()))
      .rejects.toThrow("Review 36zzzzzzzzzz not found in bucket 36");
  });

  it("throws on a failed response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Oops" }) as
      unknown as typeof fetch;
    await expect(fetchActivations(alien3Dataset, ID, new Map()))
      .rejects.toThrow("Failed to fetch alien-data-3/activations/36.json: 500 Oops");
  });

  it("does not cache a bucket that has no reviews array", async () => {
    const fetchMock = mockFetch({});
    const cache = new Map();
    await expect(fetchActivations(alien3Dataset, ID, cache))
      .rejects.toThrow("alien-data-3/activations/36.json has no reviews array");
    expect(cache.has("36")).toBe(false);

    fetchMock.mockResolvedValue({ ok: true, json: async () => activationWire });
    expect(await fetchActivations(alien3Dataset, ID, cache)).toEqual([0.1, 0.2, 0.3]);
  });
});

describe("fetchShap", () => {
  it("fetches the item's bucket for the fit and caches it per fit", async () => {
    const fetchMock = mockFetch(shapWire);
    const cache = new Map();
    const shap = await fetchShap(alien3Dataset, ID, FIT, cache);
    expect(fetchMock).toHaveBeenCalledWith(`alien-data-3/shap/${FIT}/36.json`);
    expect(shap.words.map(w => w.word)).toEqual(["[CLS]", "yandor"]);
    expect(shap.base_values).toEqual([0.02, 0.08, -0.02]);
    expect(shap.unmasked_values).toEqual([-0.73, 0.43, -0.48]);
    expect(cache.has(`${FIT}/36`)).toBe(true);
  });

  it("does not refetch a cached bucket", async () => {
    const fetchMock = mockFetch(shapWire);
    const cache = new Map();
    await fetchShap(alien3Dataset, ID, FIT, cache);
    await fetchShap(alien3Dataset, ID, FIT, cache);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps different fits' buckets apart", async () => {
    const fetchMock = mockFetch(shapWire);
    const cache = new Map();
    await fetchShap(alien3Dataset, ID, FIT, cache);
    await fetchShap(alien3Dataset, ID, "other-fit", cache);
    expect(fetchMock).toHaveBeenCalledWith("alien-data-3/shap/other-fit/36.json");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when the item is not in its bucket", async () => {
    mockFetch(shapWire);
    await expect(fetchShap(alien3Dataset, "36zzzzzzzzzz", FIT, new Map()))
      .rejects.toThrow(`Review 36zzzzzzzzzz not found in SHAP bucket ${FIT}/36`);
  });

  it("does not cache a bucket that has no reviews array", async () => {
    mockFetch({ items: [] });
    const cache = new Map();
    await expect(fetchShap(alien3Dataset, ID, FIT, cache))
      .rejects.toThrow(`alien-data-3/shap/${FIT}/36.json has no reviews array`);
    expect(cache.size).toBe(0);
  });
});
