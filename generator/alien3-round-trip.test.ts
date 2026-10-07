/**
 * @jest-environment node
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { threePathwayConfig } from "./alien-config";
import { generate } from "./alien/pipeline";
import { writeDataset } from "./alien/emit";
import { fetchActivations, fetchIndex, fetchShap } from "../src/core/data-loader";
import { alien3Dataset } from "../src/core/datasets/alien3-dataset";
import { ActivationBucket, S3Index, S3ShapBucket } from "../src/core/types/s3-data";

// The generator and core's loader each describe the data format on their own. This writes the
// shipped alien3 config to disk and reads it back through the loader the student app uses, so
// a change to either side that the other does not follow fails here.

const { fitName } = threePathwayConfig;
const originalFetch = global.fetch;
let dir: string;
let index: S3Index;

// Serves the loader's page-relative URLs (alien-data-3/...) from the generated folder.
function serveFrom(root: string): typeof fetch {
  return (async (url: string) => {
    if (!url.startsWith(alien3Dataset.baseUrl)) throw new Error(`unexpected URL ${url}`);
    const file = path.join(root, url.slice(alien3Dataset.baseUrl.length));
    if (!fs.existsSync(file)) return { ok: false, status: 404, statusText: "Not Found" };
    const body = JSON.parse(fs.readFileSync(file, "utf8"));
    return { ok: true, json: async () => body };
  }) as unknown as typeof fetch;
}

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "alien3-round-trip-"));
  writeDataset(dir, generate(threePathwayConfig).dataset);
  global.fetch = serveFrom(dir);
  index = await fetchIndex(alien3Dataset);
});

afterAll(() => {
  global.fetch = originalFetch;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("alien3 generator output read by core's loader", () => {
  it("reads every generated conversation from the index", () => {
    expect(index.items).toHaveLength(threePathwayConfig.conversationCount);
  });

  it("declares a three-pathway fit that every item is scored under", () => {
    expect(index.metadata.fa_fits[fitName]?.n_pathways).toBe(3);
    const wrong = index.items.filter(item => item.pathway_scores[fitName]?.length !== 3
      || item.pathway_variance_fractions[fitName]?.length !== 3);
    expect(wrong.map(item => item.id)).toEqual([]);
  });

  it("resolves the generated attributes and gives every item a value for each", () => {
    const configured = threePathwayConfig.attributes.map(a => a.key);
    const resolved = alien3Dataset.resolveAttributes(index).map(a => a.key);
    expect(resolved).toEqual(expect.arrayContaining(configured));
    const missing = index.items.flatMap(item => configured
      .filter(key => typeof alien3Dataset.getAttributeValue(item, key) !== "number")
      .map(key => `${item.id}:${key}`));
    expect(missing).toEqual([]);
  });

  it("gives every item a binary ground truth", () => {
    const bad = index.items.filter(item => {
      const target = alien3Dataset.getAttributeValue(item, "target");
      return target !== 0 && target !== 1;
    });
    expect(bad.map(item => item.id)).toEqual([]);
  });

  it("gives every item a binary prediction and whether it was correct", () => {
    const bad = index.items.filter(item => {
      const prediction = alien3Dataset.getAttributeValue(item, "prediction");
      const correct = alien3Dataset.getAttributeValue(item, "model_correct");
      return (prediction !== 0 && prediction !== 1) || (correct !== 0 && correct !== 1);
    });
    expect(bad.map(item => item.id)).toEqual([]);
  });

  it("finds every conversation's activations in its bucket", async () => {
    const cache = new Map<string, ActivationBucket>();
    const wrong: string[] = [];
    for (const item of index.items) {
      const activations = await fetchActivations(alien3Dataset, item.id, cache);
      if (activations.length !== threePathwayConfig.activations.neuronCount) wrong.push(item.id);
    }
    expect(wrong).toEqual([]);
  });

  it("finds SHAP for every conversation that claims it, one score per pathway", async () => {
    const withShap = index.items.filter(item => item.has_shap?.includes(fitName));
    expect(withShap.length).toBeGreaterThan(0);
    const cache = new Map<string, S3ShapBucket>();
    const wrong: string[] = [];
    for (const item of withShap) {
      const shap = await fetchShap(alien3Dataset, item.id, fitName, cache);
      const ok = shap.words.length > 0
        && shap.words.every(w => w.scores.length === 3)
        && shap.base_values.length === 3
        && shap.unmasked_values.length === 3;
      if (!ok) wrong.push(item.id);
    }
    expect(wrong).toEqual([]);
  });
});
