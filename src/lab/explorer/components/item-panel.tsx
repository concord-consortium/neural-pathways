import React from "react";
import { S3Item } from "../../shared/types/s3-data";
import { AttributeDefinition } from "../../shared/types/attributes";
import { AttributeChips } from "./attribute-chips";
import "./item-panel.scss";

interface ItemPanelProps {
  item: S3Item;
  reconstructionR2: number | null;
  attributes: AttributeDefinition[];
  getAttributeValue: (item: S3Item, key: string) => number | null;
  classificationLabels: Record<number, string>;
}

const Stars: React.FC<{ count: number; testId?: string }> = ({ count, testId }) => {
  const filled = Math.round(count);
  return (
    <span className="explorer-stars" data-testid={testId}>
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
    </span>
  );
};

export const ItemPanel: React.FC<ItemPanelProps> = ({
  item, reconstructionR2, attributes, getAttributeValue, classificationLabels,
}) => {
  return (
    <div className="explorer-item-panel">
      <div className="explorer-item-meta">
        {item.review_stars != null && (
          <Stars count={item.review_stars} testId="item-stars" />
        )}
        {item.target_label && (
          <span className={`explorer-item-badge badge-${item.target_label}`}>
            {item.target_label}
          </span>
        )}
        {item.classification != null && (() => {
          const label = classificationLabels[item.classification] ?? String(item.classification);
          const pct = ((item.classification_probability ?? 0) * 100).toFixed(1);
          return (
            <span className={`explorer-item-badge badge-classification-${label}`}>
              predicted: {label} ({pct}%)
            </span>
          );
        })()}
        <span className="explorer-item-badge badge-source">
          {Object.keys(item.sources).join(", ")}
        </span>
      </div>

      <div className="explorer-item-text">{item.text}</div>

      {item.observation && (
        <div className="explorer-item-observation" data-testid="item-observation">
          <div className="explorer-item-observation-label">Observer&apos;s note</div>
          <div className="explorer-item-observation-text">{item.observation}</div>
        </div>
      )}

      {item.name && (
        <div className="explorer-item-business">
          <strong>{item.name}</strong>
          {item.city && <> · {item.city}{item.state && `, ${item.state}`}</>}
        </div>
      )}

      {item.categories && (
        <div className="explorer-item-categories">{item.categories}</div>
      )}

      {item.stars != null && (
        <div className="explorer-item-stats">
          <span className="explorer-item-business-stars">
            Business rating: <Stars count={item.stars} />
          </span>
        </div>
      )}

      {reconstructionR2 != null && (
        <div className="explorer-item-r2">
          Reconstruction R²: <span className="r2-value">{reconstructionR2.toFixed(4)}</span>
        </div>
      )}

      <AttributeChips
        item={item}
        attributes={attributes}
        getAttributeValue={getAttributeValue}
      />
    </div>
  );
};
