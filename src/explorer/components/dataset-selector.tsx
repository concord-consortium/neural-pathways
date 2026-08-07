import React from "react";
import { DatasetConfig } from "../../shared/datasets/dataset-config";
import "./dataset-selector.scss";

interface DatasetSelectorProps {
  datasets: DatasetConfig[];
  selectedId: string;
  onChange: (id: string) => void;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  datasets, selectedId, onChange,
}) => (
  <>
    <label className="explorer-dataset-label" htmlFor="explorer-dataset">Dataset:</label>
    <select
      id="explorer-dataset"
      className="explorer-dataset-selector"
      value={selectedId}
      onChange={e => onChange(e.target.value)}
    >
      {datasets.map(dataset => (
        <option key={dataset.id} value={dataset.id}>{dataset.label}</option>
      ))}
    </select>
  </>
);
