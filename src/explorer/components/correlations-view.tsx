import React, { useState, useMemo } from "react";
import { Series } from "../types/explorer-data";
import { pearson, compareGroups } from "../utils/statistics";
import { CorrelationMatrix, MatrixCell } from "./correlation-matrix";
import { DistributionComparison } from "./distribution-comparison";
import { ScatterPlot } from "./scatter-plot";
import "./correlations-view.scss";

interface CorrelationsViewProps {
  series: Series[];
  resultCount: number;
  totalCount: number;
}

const BINARY_LABELS: Record<number, string> = { 0: "no", 1: "yes" };

export const CorrelationsView: React.FC<CorrelationsViewProps> = ({
  series, resultCount, totalCount,
}) => {
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);

  const selected = useMemo(() => {
    if (!selectedCell) return null;
    const row = series.find(s => s.key === selectedCell.rowKey);
    const col = series.find(s => s.key === selectedCell.colKey);
    if (!row || !col) return null;
    return { row, col, result: pearson(row.values, col.values) };
  }, [selectedCell, series]);

  const comparison = useMemo(() => {
    if (!selected || selected.row.attributeType !== "binary") return null;
    return compareGroups(selected.row.values, selected.col.values);
  }, [selected]);

  return (
    <div className="explorer-correlations-view" data-testid="correlations-view">
      <div className="explorer-correlations-header" data-testid="correlations-scope">
        Correlations over <strong>{resultCount}</strong> of {totalCount} reviews
      </div>

      {series.length === 0 ? (
        <div className="explorer-correlations-empty" data-testid="correlations-empty">
          No attributes or pathways available to correlate.
        </div>
      ) : (
        <>
          <div className="explorer-correlations-matrix-wrapper">
            <CorrelationMatrix
              series={series}
              selectedCell={selectedCell}
              onSelectCell={setSelectedCell}
            />
          </div>

          <div className="explorer-correlations-drilldown">
            {!selected ? (
              <div className="explorer-drilldown-prompt" data-testid="drilldown-prompt">
                Click a cell to see the evidence behind it.
              </div>
            ) : (
              <>
                <div className="explorer-drilldown-summary" data-testid="drilldown-summary">
                  {selected.row.label} × {selected.col.label}
                  {" · "}
                  {selected.result.r === null
                    ? "r undefined"
                    : `r = ${selected.result.r.toFixed(3)}`}
                  {" · "}n = {selected.result.n}
                </div>
                {comparison ? (
                  <DistributionComparison comparison={comparison} groupLabels={BINARY_LABELS} />
                ) : (
                  <ScatterPlot
                    xs={selected.row.values}
                    ys={selected.col.values}
                    xLabel={selected.row.label}
                    yLabel={selected.col.label}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
