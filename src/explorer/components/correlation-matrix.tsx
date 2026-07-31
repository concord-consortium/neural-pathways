import React, { useMemo } from "react";
import { Series } from "../types/explorer-data";
import { pearson, CorrelationResult } from "../utils/statistics";
import { valueToColor } from "../../shared/color-scale";
import "./correlation-matrix.scss";

export interface MatrixCell {
  rowKey: string;
  colKey: string;
}

interface CorrelationMatrixProps {
  series: Series[];
  selectedCell: MatrixCell | null;
  onSelectCell: (cell: MatrixCell) => void;
}

function firstPathwayIndex(series: Series[]): number {
  return series.findIndex(s => s.kind === "pathway");
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  series, selectedCell, onSelectCell,
}) => {
  const grid = useMemo(() => {
    return series.map(row => series.map(col => pearson(row.values, col.values)));
  }, [series]);

  if (series.length === 0) return null;

  const boundary = firstPathwayIndex(series);

  const cellClass = (rowIndex: number, colIndex: number, result: CorrelationResult) => {
    const classes = ["explorer-matrix-cell"];
    if (rowIndex === colIndex) classes.push("diagonal");
    if (result.r === null) classes.push("undefined-r");
    if (colIndex === boundary && boundary > 0) classes.push("boundary-left");
    if (rowIndex === boundary && boundary > 0) classes.push("boundary-top");
    if (selectedCell
      && selectedCell.rowKey === series[rowIndex].key
      && selectedCell.colKey === series[colIndex].key) {
      classes.push("selected");
    }
    return classes.join(" ");
  };

  return (
    <table className="explorer-correlation-matrix" data-testid="correlation-matrix">
      <thead>
        <tr>
          <th className="explorer-matrix-corner" />
          {series.map((col, colIndex) => (
            <th
              key={col.key}
              className={`explorer-matrix-col-header${colIndex === boundary && boundary > 0 ? " boundary-left" : ""}`}
              title={col.description || undefined}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {series.map((row, rowIndex) => (
          <tr key={row.key}>
            <th
              className={`explorer-matrix-row-header${rowIndex === boundary && boundary > 0 ? " boundary-top" : ""}`}
              title={row.description || undefined}
            >
              {row.label}
            </th>
            {series.map((col, colIndex) => {
              const result = grid[rowIndex][colIndex];
              const isDiagonal = rowIndex === colIndex;
              const clickable = !isDiagonal && result.r !== null;
              return (
                <td
                  key={col.key}
                  className={cellClass(rowIndex, colIndex, result)}
                  style={result.r === null || isDiagonal
                    ? undefined
                    : { background: valueToColor(result.r, 1) }}
                  title={result.r === null
                    ? `${row.label} x ${col.label}: undefined (n = ${result.n})`
                    : `${row.label} x ${col.label}: r = ${result.r.toFixed(4)}, n = ${result.n}`}
                  onClick={clickable ? () => onSelectCell({ rowKey: row.key, colKey: col.key }) : undefined}
                  data-testid={`cell-${row.key}-${col.key}`}
                >
                  {result.r === null ? "—" : result.r.toFixed(2)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
