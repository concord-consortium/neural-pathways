import React, { useMemo, useState } from "react";
import { Series } from "../types/explorer-data";
import { BinPlan, FieldStats, chooseBins, summarize } from "../utils/statistics";
import { FieldListRow } from "./field-list-row";
import { FieldDetail } from "./field-detail";
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

interface FieldPlan {
  plan: BinPlan;
  baseline: FieldStats;
}

export const FieldsView: React.FC<FieldsViewProps> = ({
  series, baselineSeries, resultCount, totalCount, itemNoun,
}) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Keyed on the baseline alone, so typing in the search box does not rebin
  // three thousand items per field. This is the half of the work that a
  // keystroke must not invalidate.
  const plans = useMemo(() => {
    const byKey = new Map<string, FieldPlan>();
    for (const field of baselineSeries) {
      const plan = chooseBins(field.values);
      if (plan === null) continue;
      const baseline = summarize(field.values, plan);
      // summarize returns null only when nothing is usable, and chooseBins
      // already rejected that case — but narrow rather than assert.
      if (baseline !== null) byKey.set(field.key, { plan, baseline });
    }
    return byKey;
  }, [baselineSeries]);

  // Recomputed as the filter changes, counting into the plans above. Keyed by
  // series key rather than paired by index: the two lists are index-aligned by
  // construction today, and nothing here needs to depend on that staying true.
  const subsets = useMemo(() => {
    const byKey = new Map<string, FieldStats | null>();
    for (const field of series) {
      const entry = plans.get(field.key);
      byKey.set(field.key, entry ? summarize(field.values, entry.plan) : null);
    }
    return byKey;
  }, [series, plans]);

  // Resolves to nothing when the selected key no longer names a field — a fit
  // change drops pathways, and resetting commissions drops attributes.
  const selected = selectedKey === null
    ? null : series.find(field => field.key === selectedKey) ?? null;
  const selectedPlan = selected ? plans.get(selected.key) ?? null : null;

  const firstPathwayKey = series.find(field => field.kind === "pathway")?.key;

  return (
    <div className="explorer-fields-view" data-testid="fields-view">
      <div className="explorer-fields-header" data-testid="fields-scope">
        Fields over <strong>{resultCount}</strong> of {totalCount} {itemNoun.plural}
      </div>

      {series.length === 0 ? (
        <div className="explorer-fields-empty" data-testid="fields-empty">
          No attributes or pathways available to summarise.
        </div>
      ) : resultCount === 0 ? (
        <div className="explorer-fields-empty" data-testid="fields-empty-selection">
          No {itemNoun.plural} match this search.
        </div>
      ) : (
        <>
          <div className="explorer-fields-list">
            <div className="explorer-fields-list-head">
              <span />
              <span className="explorer-fields-head-stat">these</span>
              <span className="explorer-fields-head-stat">all</span>
              <span />
            </div>
            {series.map(field => (
              <React.Fragment key={field.key}>
                {field.key === firstPathwayKey && (
                  <div className="explorer-fields-separator" data-testid="fields-kind-separator" />
                )}
                <FieldListRow
                  series={field}
                  subset={subsets.get(field.key) ?? null}
                  baseline={plans.get(field.key)?.baseline ?? null}
                  selected={field.key === selectedKey}
                  onSelect={() => setSelectedKey(field.key)}
                />
              </React.Fragment>
            ))}
          </div>

          <div className="explorer-fields-detail-wrapper">
            {selected && selectedPlan ? (
              <FieldDetail
                series={selected}
                bins={selectedPlan.plan.bins}
                subset={subsets.get(selected.key) ?? null}
                baseline={selectedPlan.baseline}
                resultCount={resultCount}
                totalCount={totalCount}
                itemNoun={itemNoun}
              />
            ) : (
              <div className="explorer-fields-prompt" data-testid="fields-prompt">
                Click a field to see its distribution.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
