import React from "react";
import { S3Item } from "../../shared/types/s3-data";
import { AttributeDefinition } from "../../shared/types/attributes";
import "./attribute-chips.scss";

interface AttributeChipsProps {
  item: S3Item;
  attributes: AttributeDefinition[];
  getAttributeValue: (item: S3Item, key: string) => number | null;
}

function formatValue(definition: AttributeDefinition, value: number): string {
  switch (definition.type) {
    case "binary":
      return value ? "yes" : "no";
    case "integer":
      return String(value);
    case "float":
      return value.toFixed(2);
  }
}

export const AttributeChips: React.FC<AttributeChipsProps> = ({
  item, attributes, getAttributeValue,
}) => {
  const present: { definition: AttributeDefinition; value: number }[] = [];
  for (const definition of attributes) {
    const value = getAttributeValue(item, definition.key);
    if (value != null) {
      present.push({ definition, value });
    }
  }

  if (present.length === 0) return null;

  return (
    <div className="explorer-attribute-chips" data-testid="attribute-chips">
      {present.map(({ definition, value }) => {
        const isOn = definition.type === "binary" && value === 1;
        return (
          <span
            key={definition.key}
            className={`explorer-attribute-chip${isOn ? " chip-on" : ""}`}
            title={definition.description}
            data-testid={`attribute-chip-${definition.key}`}
          >
            <span className="chip-label">{definition.label}</span>
            <span className="chip-value">{formatValue(definition, value)}</span>
          </span>
        );
      })}
    </div>
  );
};
