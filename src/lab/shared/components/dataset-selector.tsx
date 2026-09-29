import React from "react";
import { DatasetConfig } from "../datasets/dataset-config";
import "./dataset-selector.scss";

interface DatasetSelectorProps {
  datasets: DatasetConfig[];
  selectedId: string;
  onChange: (id: string) => void;
}

/** Shared by the explorer and the heatmap; both read the choice from a `dataset` hash param. */
export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  datasets, selectedId, onChange,
}) => (
  <>
    <label className="dataset-label" htmlFor="dataset-select">Dataset:</label>
    <select
      id="dataset-select"
      className="dataset-selector"
      value={selectedId}
      onChange={e => onChange(e.target.value)}
    >
      {datasets.map(dataset => (
        <option key={dataset.id} value={dataset.id}>{dataset.label}</option>
      ))}
    </select>
  </>
);
