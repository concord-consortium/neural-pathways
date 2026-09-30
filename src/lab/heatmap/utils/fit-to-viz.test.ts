import { fitToPathways, fitToScaler, fitToMetadata, standardizeActivations } from "./fit-to-viz";
import { S3FaFit } from "../../../core/types/s3-data";

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

describe("fitToPathways", () => {
  it("translates an S3FaFit to Pathways shape", () => {
    const pathways = fitToPathways(mockFit);
    expect(pathways.components).toEqual(mockFit.loadings);
    expect(pathways.noise_variance).toEqual(mockFit.noise_variance);
    expect(pathways.mean).toEqual([0, 0, 0]);
  });

  it("throws a named error when a fit has no activation model", () => {
    const fit: S3FaFit = { ...mockFit };
    delete fit.loadings;
    expect(() => fitToPathways(fit)).toThrow(/no activation model/);
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
