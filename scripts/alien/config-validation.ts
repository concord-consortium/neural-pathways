import * as path from "path";
import { validateAttributeKeys } from "../../src/shared/datasets/dataset-config";
import { AlienConfig } from "./config-types";

const SHARE_TOLERANCE = 1e-9;
const WEIGHT_TOLERANCE = 1e-9;

/**
 * writeDataset (emit.ts) recursively deletes outputDir with force: true before
 * writing. An empty, ".", "..", absolute, or escaping path would resolve outside
 * the intended dist/ directory — at worst to the repo root — and be wiped
 * silently. Keep it a plain relative path that stays inside the repo.
 */
function checkOutputDir(config: AlienConfig): void {
  const dir = config.outputDir;
  const unsafe = dir === "" || dir === "."
    || path.isAbsolute(dir) || dir.split("/").some(segment => segment === "..");
  if (unsafe) {
    throw new Error(
      `outputDir "${dir}" is unsafe: writeDataset deletes it recursively before writing. Use a `
      + `non-empty relative path inside the repo, e.g. "dist/alien-data".`,
    );
  }
}

function checkVocabulary(config: AlienConfig): void {
  const seen = new Set<string>();
  const groupWeights: number[][] = Array.from({ length: config.pathwayCount }, () => []);

  for (const entry of config.vocabulary) {
    if (seen.has(entry.word)) {
      throw new Error(`Duplicate vocabulary word "${entry.word}"`);
    }
    seen.add(entry.word);

    if (entry.weights.length !== config.pathwayCount) {
      throw new Error(
        `Word "${entry.word}" has ${entry.weights.length} weights, expected ${config.pathwayCount}`,
      );
    }
    const nonZero = entry.weights
      .map((weight, pathway) => ({ weight, pathway }))
      .filter(item => item.weight !== 0);
    if (nonZero.length !== 1) {
      throw new Error(
        `Word "${entry.word}" must carry weight in exactly one pathway, found ${nonZero.length}. `
        + `Cross-pathway weight correlates the pathway scores and breaks the bias construction.`,
      );
    }
    groupWeights[nonZero[0].pathway].push(nonZero[0].weight);
  }

  // Each pathway's weights must be symmetric under negation: for every word at
  // +w there must be one at -w. That is the exact condition the orthogonality
  // argument rests on, and it is stronger than the weights merely summing to
  // zero.
  groupWeights.forEach((weights, pathway) => {
    if (weights.length === 0) {
      throw new Error(`Pathway ${pathway} has no words; its score would have no variance`);
    }
    const sorted = [...weights].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (Math.abs(sorted[i] + sorted[sorted.length - 1 - i]) > WEIGHT_TOLERANCE) {
        throw new Error(
          `Pathway ${pathway}'s weights are not symmetric under negation: ${sorted[i]} has no `
          + `matching ${-sorted[i]}. That symmetry is what keeps the pathway scores `
          + `uncorrelated, and losing it breaks the bias construction.`,
        );
      }
    }
  });
}

function checkAttributes(config: AlienConfig): void {
  validateAttributeKeys(config.attributes.map(attr => ({
    key: attr.key,
    label: attr.label,
    description: attr.description,
    type: attr.type,
  })));

  for (const attr of config.attributes) {
    const total = attr.valueShares.reduce((sum, share) => sum + share, 0);
    if (Math.abs(total - 1) > SHARE_TOLERANCE) {
      throw new Error(`Attribute "${attr.key}": value shares sum to ${total}, must sum to 1`);
    }
    if (attr.valueShares.some(share => share <= 0)) {
      throw new Error(`Attribute "${attr.key}": every value share must be positive`);
    }
    if (attr.type === "binary" && attr.valueShares.length !== 2) {
      throw new Error(`Attribute "${attr.key}": a binary attribute needs exactly two value shares`);
    }
    if (attr.pathway !== null
        && (attr.pathway < 0 || attr.pathway >= config.pathwayCount)) {
      throw new Error(`Attribute "${attr.key}": pathway ${attr.pathway} is out of range`);
    }
    if (attr.pathway === null && attr.targetR !== 0) {
      throw new Error(`Attribute "${attr.key}": a decoy must request targetR 0`);
    }
    for (let i = 0; i < attr.valueShares.length; i++) {
      const value = attr.minValue + i;
      const fragments = attr.notes[value];
      if (!fragments || fragments.length < 2) {
        throw new Error(
          `Attribute "${attr.key}" value ${value}: needs at least two note fragments for variety`,
        );
      }
    }
  }
}

/**
 * Self-check 2 attests an attribute value by finding one of its fragments inside
 * the note. That only identifies a value if no fragment appears anywhere else,
 * including inside a longer fragment.
 */
function checkFragmentsAreDistinguishable(config: AlienConfig): void {
  const fragments: { text: string; owner: string }[] = [];
  for (const attr of config.attributes) {
    for (const [value, list] of Object.entries(attr.notes)) {
      for (const text of list) fragments.push({ text, owner: `${attr.key}=${value}` });
    }
  }
  config.fillerFragments.forEach((text, i) => fragments.push({ text, owner: `filler[${i}]` }));

  const byText = new Map<string, string>();
  for (const fragment of fragments) {
    const existing = byText.get(fragment.text);
    if (existing) {
      throw new Error(
        `Note fragment "${fragment.text}" is used by both ${existing} and ${fragment.owner}`,
      );
    }
    byText.set(fragment.text, fragment.owner);
  }

  for (const outer of fragments) {
    for (const inner of fragments) {
      if (outer === inner) continue;
      if (outer.text.includes(inner.text)) {
        throw new Error(
          `Note fragment for ${inner.owner} is a substring of the one for ${outer.owner}`,
        );
      }
    }
  }
}

function checkBias(config: AlienConfig): void {
  const bias = config.attributes.find(attr => attr.key === config.biasAttributeKey);
  if (!bias) {
    throw new Error(`Bias attribute "${config.biasAttributeKey}" is not in the attribute list`);
  }
  if (bias.type !== "binary") {
    throw new Error(`Bias attribute "${bias.key}" must be binary`);
  }
  if (bias.pathway === config.truthPathway) {
    throw new Error(
      `Bias attribute "${bias.key}" tracks pathway ${bias.pathway}, which is also the truth `
      + `pathway. The truth would then depend on the bias attribute and the model would be `
      + `correct rather than biased.`,
    );
  }
  if (config.errorRateWhenBiasOn <= config.errorRateWhenBiasOff) {
    throw new Error("errorRateWhenBiasOn must exceed errorRateWhenBiasOff, or there is no bias");
  }
}

export function validateConfig(config: AlienConfig): void {
  if (config.targetVarianceShares.length !== config.pathwayCount) {
    throw new Error("targetVarianceShares must have one entry per pathway");
  }
  if (config.minWords < 2 * config.maxTurns) {
    throw new Error(
      `minWords (${config.minWords}) must be at least 2 * maxTurns (${2 * config.maxTurns}) `
      + `so every turn can hold two words`,
    );
  }
  checkOutputDir(config);
  checkVocabulary(config);
  checkAttributes(config);
  checkFragmentsAreDistinguishable(config);
  checkBias(config);
}
