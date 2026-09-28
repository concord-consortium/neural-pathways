import { S3FaFit } from "../../../core/types/s3-data";
import { Pathways, Scaler, Metadata } from "../types/viz-data";

/**
 * These three functions feed the heatmap, which visualizes the 780-neuron
 * activation model. A fit without that model cannot answer them, and returning
 * empty arrays would draw an empty heatmap that looks like real data.
 */
function requireActivationModel<T>(value: T | undefined, field: string): T {
  if (value === undefined) {
    throw new Error(`Fit has no activation model: "${field}" is absent`);
  }
  return value;
}

export function fitToPathways(fit: S3FaFit): Pathways {
  const loadings = requireActivationModel(fit.loadings, "loadings");
  const nNeurons = loadings[0].length;
  return {
    components: loadings,
    mean: new Array(nNeurons).fill(0),
    noise_variance: requireActivationModel(fit.noise_variance, "noise_variance"),
  };
}

export function fitToScaler(fit: S3FaFit): Scaler {
  return {
    mean: requireActivationModel(fit.scaler_mean, "scaler_mean"),
    scale: requireActivationModel(fit.scaler_scale, "scaler_scale"),
  };
}

export function fitToMetadata(fit: S3FaFit): Metadata {
  const loadings = requireActivationModel(fit.loadings, "loadings");
  return {
    n_neurons: loadings[0].length,
    n_pathways: fit.n_pathways,
    explained_variance_total: requireActivationModel(fit.explained_variance_total, "explained_variance_total"),
    explained_variance_per_pathway: fit.explained_variance_per_pathway,
  };
}

export function standardizeActivations(
  raw: number[], scalerMean: number[], scalerScale: number[],
): number[] {
  return raw.map((v, i) => (v - scalerMean[i]) / scalerScale[i]);
}
