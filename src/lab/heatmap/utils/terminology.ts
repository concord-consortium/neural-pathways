export type TerminologyMode = "project" | "fa";

interface DualLabel {
  project: string;
  fa: string;
}

const labels = {
  pathwayPrefix: { project: "P", fa: "F" } as DualLabel,
  pathwayLoadings: { project: "Pathway loadings", fa: "Factor loadings" } as DualLabel,
  pathwayScores: { project: "Pathway activations", fa: "Factor scores" } as DualLabel,
  scoredPathways: {
    project: "Activated pathways (loading x activation)",
    fa: "Scaled loadings (loading x score)",
  } as DualLabel,
  originalActivations: {
    project: "Neuron activations",
    fa: "Observation",
  } as DualLabel,
} as const;

type LabelKey = keyof typeof labels;

export function getLabel(key: LabelKey, mode: TerminologyMode): string {
  return labels[key][mode];
}

export function getPathwayHeader(index: number, mode: TerminologyMode): string {
  return `${labels.pathwayPrefix[mode]}${index + 1}`;
}

/** The scores-row label names the dataset's item; FA mode keeps the dataset-neutral "observation". */
export function getItemScoresLabel(mode: TerminologyMode, itemNoun: string): string {
  return mode === "fa"
    ? "Factor scores for this observation"
    : `Pathway activations for this ${itemNoun}`;
}
