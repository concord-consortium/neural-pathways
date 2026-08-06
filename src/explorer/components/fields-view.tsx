import React from "react";
import { Series } from "../types/explorer-data";
import "./fields-view.scss";

interface FieldsViewProps {
  /** One series per visible attribute then pathway, over the filtered items. */
  series: Series[];
  /** The same series over every item in the dataset. This is what supplies the bins. */
  baselineSeries: Series[];
  resultCount: number;
  totalCount: number;
  itemNoun: { singular: string; plural: string };
}

// series and baselineSeries are declared but not destructured yet — the list and
// detail arrive in later tasks. Destructuring them here would trip no-unused-vars.
export const FieldsView: React.FC<FieldsViewProps> = ({ resultCount, totalCount, itemNoun }) => (
  <div className="explorer-fields-view" data-testid="fields-view">
    <div className="explorer-fields-header" data-testid="fields-scope">
      Fields over <strong>{resultCount}</strong> of {totalCount} {itemNoun.plural}
    </div>
  </div>
);
