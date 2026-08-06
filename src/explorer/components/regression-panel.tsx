import React, { useState, useMemo } from "react";
import { Series } from "../types/explorer-data";
import { isUsable } from "../utils/statistics";
import { buildDesignMatrix } from "../utils/design-matrix";
import { multipleRegression, logisticRegression } from "../utils/regression";
import "./regression-panel.scss";

interface RegressionPanelProps {
  series: Series[];
}

interface DisplayTerm {
  label: string;
  primary: number;
  partialR: number | null;
}

function distinctUsableCount(values: (number | null)[]): number {
  const seen = new Set<number>();
  for (const value of values) {
    if (isUsable(value)) seen.add(value);
  }
  return seen.size;
}

/**
 * Counted from the series itself rather than from the design matrix, because the
 * design matrix only knows about predictors that are currently included — and the
 * "(missing N)" hint is most needed on a box the user has just unchecked, when
 * they are deciding whether the sample-size cost was worth paying.
 */
function missingCount(values: (number | null)[]): number {
  let missing = 0;
  for (const value of values) {
    if (!isUsable(value)) missing++;
  }
  return missing;
}

export const RegressionPanel: React.FC<RegressionPanelProps> = ({ series }) => {
  const defaultTargetKey = useMemo(() => {
    const firstPathway = series.find(s => s.kind === "pathway");
    return firstPathway?.key ?? series[0]?.key ?? "";
  }, [series]);

  const [targetKey, setTargetKey] = useState<string>(defaultTargetKey);
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [includeInteractions, setIncludeInteractions] = useState(false);

  const target = series.find(s => s.key === targetKey) ?? series.find(s => s.key === defaultTargetKey);

  // Drops the target itself, plus any attribute whose definition opts out — see
  // excludeFromRegression in shared/types/attributes.ts for why one would.
  const candidates = useMemo(
    () => series.filter(s => s.kind === "attribute" && s.key !== target?.key && !s.excludeFromRegression),
    [series, target],
  );

  const predictors = useMemo(
    () => candidates.filter(s => !excludedKeys.has(s.key)),
    [candidates, excludedKeys],
  );

  const design = useMemo(
    () => (target ? buildDesignMatrix(predictors, target, includeInteractions) : null),
    [predictors, target, includeInteractions],
  );

  // Derived from the fitted cases (design.y), not every value in the series: the
  // fitted set is complete cases only, and can have a different distinct-value count
  // than the full series (e.g. a third value present only among rows some predictor
  // drops as missing). Routing that mismatch to the wrong model is exactly the bug
  // this guards against — the method line and the fit it names must agree.
  const isBinaryTarget = design ? distinctUsableCount(design.y) === 2 : false;

  const fit = useMemo(() => {
    if (!design || design.columnLabels.length === 0) return null;
    return isBinaryTarget
      ? logisticRegression(design.X, design.y)
      : multipleRegression(design.X, design.y);
  }, [design, isBinaryTarget]);

  if (series.length === 0 || !target || !design) return null;

  const terms: DisplayTerm[] = fit
    ? fit.kind === "ols"
      ? fit.terms.map((term, i) => ({
        label: design.columnLabels[i] ?? term.label,
        primary: term.beta,
        partialR: term.partialR,
      }))
      : fit.terms.map((term, i) => ({
        label: design.columnLabels[i] ?? term.label,
        primary: term.coefficient,
        partialR: null,
      }))
    : [];
  terms.sort((a, b) => Math.abs(b.primary) - Math.abs(a.primary));

  const toggleExcluded = (key: string) => {
    setExcludedKeys(previous => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="explorer-regression-panel" data-testid="regression-panel">
      <div className="explorer-regression-controls">
        <label className="explorer-regression-target-label">
          Explained by attributes, for:
          <select
            className="explorer-regression-target"
            data-testid="regression-target"
            value={target.key}
            onChange={event => setTargetKey(event.target.value)}
          >
            {series.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </label>

        <div className="explorer-regression-predictors">
          {candidates.map(candidate => {
            const missing = missingCount(candidate.values);
            return (
              <label className="explorer-regression-predictor" key={candidate.key}>
                <input
                  type="checkbox"
                  data-testid={`predictor-toggle-${candidate.key}`}
                  checked={!excludedKeys.has(candidate.key)}
                  onChange={() => toggleExcluded(candidate.key)}
                />
                {candidate.label}
                {missing > 0 && (
                  <span className="explorer-regression-missing"> (missing {missing})</span>
                )}
              </label>
            );
          })}
        </div>

        <label className="explorer-regression-predictor">
          <input
            type="checkbox"
            data-testid="interactions-toggle"
            checked={includeInteractions}
            onChange={() => setIncludeInteractions(value => !value)}
          />
          include pairwise interactions
        </label>
      </div>

      <div className="explorer-regression-method" data-testid="regression-method">
        {isBinaryTarget
          ? "Logistic regression — the target has two values."
          : "Least squares — the target is continuous."}
      </div>

      <div className="explorer-regression-rows" data-testid="regression-rows">
        Fitted on <strong>{design.nUsed}</strong> of {design.nAvailable} rows
      </div>

      {design.dropped.length > 0 && (
        <div className="explorer-regression-dropped" data-testid="regression-dropped">
          Dropped before fitting: {design.dropped
            .map(column => `${column.label} (${column.reason})`)
            .join(", ")}
        </div>
      )}

      {!fit ? (
        <div className="explorer-regression-unavailable" data-testid="regression-unavailable">
          Not enough usable data to fit a model. Include more attributes, widen the search, or
          pick a different target.
        </div>
      ) : (
        <>
          <div className="explorer-regression-fit" data-testid="regression-fit">
            {fit.kind === "ols" ? (
              <>
                R² = <strong>{fit.rSquared.toFixed(3)}</strong>
                {" · "}
                {((1 - fit.rSquared) * 100).toFixed(0)}% unexplained
              </>
            ) : (
              <>
                accuracy <strong>{(fit.accuracy * 100).toFixed(1)}%</strong>
                {" · "}baseline {(fit.baselineAccuracy * 100).toFixed(1)}%
                {!fit.converged && " · did not converge"}
              </>
            )}
          </div>

          {includeInteractions && (
            <div className="explorer-regression-caution" data-testid="interactions-caution">
              {design.interactionCount} interaction terms were tested. With that many, expect
              roughly {Math.max(1, Math.round(design.interactionCount / 20))} to look notable by
              chance alone.
            </div>
          )}

          <table className="explorer-regression-table">
            <thead>
              <tr>
                <th>Term</th>
                <th>{fit.kind === "ols" ? "β" : "coefficient"}</th>
                {fit.kind === "ols" && <th>partial r</th>}
              </tr>
            </thead>
            <tbody>
              {terms.map(term => (
                <tr key={term.label} data-testid={`term-row-${term.label}`}>
                  <td>{term.label}</td>
                  <td>{term.primary.toFixed(3)}</td>
                  {fit.kind === "ols" && (
                    <td>{term.partialR === null ? "—" : term.partialR.toFixed(3)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};
