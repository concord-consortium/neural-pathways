import React, { useId } from "react";
import { AlienMark } from "../alien-marks";
import { AttributeDefinition } from "../types/attributes";
import "./observation-notes.scss";

interface ObservationNotesProps {
  observation?: string;
  /** The attributes to mark, in the order to show them. */
  attributes: AttributeDefinition[];
  /** The conversation's values, keyed by attribute key. */
  values?: Record<string, number | null>;
}

/**
 * What the observer wrote about the conversation, and under it a mark for each attribute the
 * notes record: the sentence is the evidence and the mark is the reading of it. The marks keep
 * the order they are given, so a mark is in the same place for every conversation.
 */
export const ObservationNotes: React.FC<ObservationNotesProps> = ({ observation, attributes, values }) => {
  const headId = useId();
  return (
    <div className="observation-notes">
      <h3 id={headId} className="observation-notes__head">Observation notes</h3>
      {/* The box scrolls when the card is too short for it, so it is a named region the keyboard
          can reach. Safari doesn't make a scrolling box focusable on its own. */}
      <div className="observation-notes__box" role="region" aria-labelledby={headId} tabIndex={0}>
        <p className="observation-notes__text">{observation || "(no notes for this conversation)"}</p>
        {attributes.length > 0 &&
          <ul className="observation-notes__marks">
            {attributes.map(attribute =>
              <Mark key={attribute.key} attribute={attribute} value={values?.[attribute.key]} />)}
          </ul>}
      </div>
    </div>
  );
};

interface MarkProps {
  attribute: AttributeDefinition;
  value: number | null | undefined;
}

/** Label, drawing, answer: the order a field sheet reads in. A screen reader hears "Label: value". */
const Mark: React.FC<MarkProps> = ({ attribute, value }) => (
  <li className="observation-notes__mark">
    <span className="observation-notes__label">{attribute.label}</span>
    <span className="observation-notes__spoken">{`: ${spokenValue(attribute, value)}`}</span>
    <AlienMark attributeKey={attribute.key} size={34} />
    <b className="observation-notes__badge" aria-hidden="true">{badgeText(attribute, value)}</b>
  </li>
);

function spokenValue(attribute: AttributeDefinition, value: number | null | undefined): string {
  if (value == null) return "not recorded";
  return attribute.valueLabels?.[value] ?? String(value);
}

/**
 * A tick for a binary attribute that is 1, and a blank for 0: every note states every attribute,
 * so a blank can't be mistaken for "not recorded". Anything else shows its number. The tick is
 * followed by a variation selector so no platform draws it as an emoji.
 */
function badgeText(attribute: AttributeDefinition, value: number | null | undefined): string {
  if (value == null) return "–";
  if (attribute.type === "binary") return value === 1 ? "✔︎" : "";
  return String(value);
}
