import {
  fetchIndex,
  fetchActivations,
  fetchShap,
  fitToPathways,
  fitToScaler,
  fitToMetadata,
  standardizeActivations,
  BASE_URL,
} from "./data-loader";
import { S3FaFit, S3Index } from "./types/s3-data";

const mockFit: S3FaFit = {
  source_split: "train",
  n_pathways: 2,
  explained_variance_total: 0.85,
  explained_variance_per_pathway: [0.7, 0.15],
  pathway_importance: [1.2, -0.3],
  loadings: [
    [1.0, 2.0, 3.0],
    [4.0, 5.0, 6.0],
  ],
  noise_variance: [0.1, 0.2, 0.3],
  scaler_mean: [10.0, 20.0, 30.0],
  scaler_scale: [2.0, 4.0, 5.0],
  pathway_score_min: [-2.0, -1.5],
  pathway_score_max: [3.0, 2.0],
};

const mockIndex: S3Index = {
  metadata: {
    fa_fits: { "train-fa-2": mockFit },
    review_sets: { train: { count: 1, description: "Train" } },
  },
  reviews: [
    {
      id: "a3f7c2d81e09",
      sources: { train: [0] },
      text: "Great food",
      target: 1,
      target_label: "positive",
      pathway_scores: { "train-fa-2": [0.5, -0.3] },
      reconstruction_r2: { "train-fa-2": 0.9 },
      pathway_variance_fractions: { "train-fa-2": [0.6, 0.3] },
      has_shap: ["train-fa-2"],
    },
  ],
};

const mockActivationBucket = {
  reviews: [
    { id: "a3f7c2d81e09", activations: [12.0, 24.0, 35.0] },
    { id: "bbbb00000000", activations: [1.0, 2.0, 3.0] },
  ],
};

const mockShapBucket = {
  reviews: [
    {
      id: "a3f7c2d81e09",
      base_values: [0.1, -0.2],
      unmasked_values: [0.8, 0.5],
      words: [
        { word: "[CLS]", scores: [0.01, -0.01] },
        { word: "great", scores: [0.3, 0.2] },
        { word: "food", scores: [0.1, 0.05] },
      ],
    },
  ],
};

beforeEach(() => {
  jest.restoreAllMocks();
});

describe("fetchIndex", () => {
  it("fetches and returns the S3 index", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockIndex),
    });

    const result = await fetchIndex();
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}index.json`);
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].id).toBe("a3f7c2d81e09");
  });

  it("throws on fetch failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(fetchIndex()).rejects.toThrow("Failed to fetch index: 404 Not Found");
  });
});

describe("fetchActivations", () => {
  it("fetches the correct bucket and caches it", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockActivationBucket),
    });
    const cache = new Map();

    const activations = await fetchActivations("a3f7c2d81e09", cache);
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}activations/a3.json`);
    expect(activations).toEqual([12.0, 24.0, 35.0]);
    expect(cache.has("a3")).toBe(true);
  });

  it("uses cached bucket on second call", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockActivationBucket),
    });
    const cache = new Map();

    await fetchActivations("a3f7c2d81e09", cache);
    await fetchActivations("bbbb00000000", cache);
    expect(fetch).toHaveBeenCalledTimes(2);

    const activations = await fetchActivations("a3f7c2d81e09", cache);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(activations).toEqual([12.0, 24.0, 35.0]);
  });

  it("throws if review not found in bucket", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockActivationBucket),
    });
    const cache = new Map();

    await expect(fetchActivations("a3zzzzzzzzzz", cache)).rejects.toThrow(
      "Review a3zzzzzzzzzz not found in bucket a3"
    );
  });
});

describe("fetchShap", () => {
  it("fetches the correct SHAP bucket and caches it", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockShapBucket),
    });
    const cache = new Map();

    const shap = await fetchShap("a3f7c2d81e09", "train-fa-2", cache);
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}shap/train-fa-2/a3.json`);
    expect(shap.words).toHaveLength(3);
    expect(shap.base_values).toEqual([0.1, -0.2]);
    expect(cache.has("train-fa-2/a3")).toBe(true);
  });

  it("uses cached SHAP bucket on second call", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockShapBucket),
    });
    const cache = new Map();

    await fetchShap("a3f7c2d81e09", "train-fa-2", cache);
    const shap = await fetchShap("a3f7c2d81e09", "train-fa-2", cache);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(shap.words).toHaveLength(3);
  });

  it("fetches different buckets for different fits", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockShapBucket),
    });
    const cache = new Map();

    await fetchShap("a3f7c2d81e09", "train-fa-2", cache);
    await fetchShap("a3f7c2d81e09", "test-fa-7", cache);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}shap/train-fa-2/a3.json`);
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}shap/test-fa-7/a3.json`);
  });

  it("throws if review not found in SHAP bucket", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockShapBucket),
    });
    const cache = new Map();

    await expect(fetchShap("a3zzzzzzzzzz", "train-fa-2", cache)).rejects.toThrow(
      "Review a3zzzzzzzzzz not found in SHAP bucket train-fa-2/a3"
    );
  });
});

describe("fitToPathways", () => {
  it("translates an S3FaFit to Pathways shape", () => {
    const pathways = fitToPathways(mockFit);
    expect(pathways.components).toEqual(mockFit.loadings);
    expect(pathways.noise_variance).toEqual(mockFit.noise_variance);
    expect(pathways.mean).toEqual([0, 0, 0]);
  });
});

describe("fitToScaler", () => {
  it("translates an S3FaFit to Scaler shape", () => {
    const scaler = fitToScaler(mockFit);
    expect(scaler.mean).toEqual([10.0, 20.0, 30.0]);
    expect(scaler.scale).toEqual([2.0, 4.0, 5.0]);
  });
});

describe("fitToMetadata", () => {
  it("translates an S3FaFit to Metadata shape", () => {
    const metadata = fitToMetadata(mockFit);
    expect(metadata.n_neurons).toBe(3);
    expect(metadata.n_pathways).toBe(2);
    expect(metadata.explained_variance_total).toBe(0.85);
    expect(metadata.explained_variance_per_pathway).toEqual([0.7, 0.15]);
  });
});

describe("standardizeActivations", () => {
  it("computes (raw - mean) / scale", () => {
    const raw = [12.0, 24.0, 35.0];
    const scalerMean = [10.0, 20.0, 30.0];
    const scalerScale = [2.0, 4.0, 5.0];
    const result = standardizeActivations(raw, scalerMean, scalerScale);
    expect(result).toEqual([1.0, 1.0, 1.0]);
  });
});
