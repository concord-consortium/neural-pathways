export type AttributeType = "binary" | "integer" | "float";

/**
 * An external attribute: something an observer coded about an item, held
 * separately from the model's own inputs and outputs.
 */
export interface AttributeDefinition {
  /** Usable directly as a search field name. */
  key: string;
  /** Short human-readable name, shown on chips and in the correlation matrix. */
  label: string;
  /** Paragraph shown on hover and in the search help dialog. */
  description: string;
  type: AttributeType;
  /** Required for "integer" and "float"; ignored for "binary". */
  min?: number;
  max?: number;
  /**
   * Display labels for individual values, e.g. { 0: "negative", 1: "positive" }.
   * Consumers must fall back to the raw value for any value not listed here, so a
   * partial map — or none at all — degrades to showing the number rather than lying.
   */
  valueLabels?: Record<number, string>;
  /**
   * Present in the data but not shown in the explorer until a student
   * commissions it. Written by the dataset generator. `applyCommissions`
   * (shared/datasets/dataset-config.ts) filters a hidden attribute out of
   * `ActiveDataset.attributes` — the list every explorer surface reads —
   * unless its key is in the commissioned set; `codeableAttributes` in the
   * same file uses it to build the Codings dialog's list of attributes a
   * student can commission.
   */
  hidden?: boolean;
  /**
   * Withheld from the regression panel's predictor candidates. The attribute is
   * otherwise ordinary: it still appears on chips, in search, in the correlation
   * matrix, and in the Fields view. Only the regression checkbox is missing.
   *
   * Set on `prediction` in both dataset configs, because `target`, `prediction`
   * and `model_correct` are a mutually determining triple — for binary values
   * `correct = 1 − target − prediction + 2·target·prediction`, so any two of them
   * fix the third and `prediction` adds no explanatory power a regression on the
   * other two does not already have.
   *
   * The reason this is an exclusion rather than a merely uninformative predictor:
   * with pairwise interactions switched on, the `target × prediction` column plus
   * the `target` and `prediction` main effects span `model_correct` exactly, so
   * the design matrix is exactly singular and the fit fails outright. Every
   * candidate starts checked (`excludedKeys` in regression-panel.tsx begins
   * empty), so that is not an exotic selection a user has to go looking for — it
   * is the panel's default state the moment the interactions box is ticked.
   * `buildDesignMatrix`'s duplicate-column check (shared/utils/design-matrix.ts)
   * compares columns pairwise only and cannot see a three-column dependency, so
   * nothing downstream catches this; the panel just reports "Not enough usable
   * data to fit a model", which misdescribes the cause.
   *
   * So: if you are here because an attribute is missing its regression checkbox
   * and that looks like a bug, it is not. Restoring it re-breaks the panel's
   * default state. Detecting and explaining collinearity properly is a separate
   * feature; until it exists, this flag is the fix.
   */
  excludeFromRegression?: boolean;
}
