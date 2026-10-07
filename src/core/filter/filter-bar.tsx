import React, { useId } from "react";
import { AttributeDefinition } from "../types/attributes";
import { FilterHelp } from "./filter-help";
import "./filter-bar.scss";

export type FilterStatus = { matched: number; total: number } | { error: string };

export interface FilterBarProps {
  text: string;
  status: FilterStatus;
  fields: readonly string[];
  attributes: readonly AttributeDefinition[];
  onTextChange: (text: string) => void;
  /** Called on Enter, and when focus leaves the bar. */
  onCommit: () => void;
  /** Called on Escape. */
  onDiscard: () => void;
}

function statusText(status: FilterStatus): string {
  if ("error" in status) {
    return status.error;
  }
  return status.matched === status.total ? String(status.total) : `${status.matched} of ${status.total}`;
}

/** The filter's label, text box, count and help. It holds no state: the caller passes it all. */
export const FilterBar: React.FC<FilterBarProps> = ({
  text, status, fields, attributes, onTextChange, onCommit, onDiscard,
}) => {
  const id = useId();
  const inputId = `${id}-input`;
  const countId = `${id}-count`;
  const hasError = "error" in status;
  return (
    // Committed when focus leaves the bar, not just the box: checking the help mid-query mustn't
    // store a half-typed query. Switching windows commits too, on purpose: in an iframe, focus moving
    // to the host page and the window losing focus can't be reliably told apart.
    <div className={`filter-bar${hasError ? " filter-bar--error" : ""}`}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onCommit();
        }
      }}>
      <label className="filter-bar__label" htmlFor={inputId}>Filter</label>
      <input id={inputId} className="filter-bar__input" type="text" value={text}
        placeholder="Example: model_correct:0" autoComplete="off" spellCheck={false}
        aria-invalid={hasError} aria-describedby={countId}
        onChange={event => onTextChange(event.target.value)}
        onKeyDown={event => {
          // Enter and Escape during an IME composition finish or cancel it. Safari reports them as 229.
          if (event.nativeEvent.isComposing || event.keyCode === 229) {
            return;
          }
          if (event.key === "Enter") {
            onCommit();
          } else if (event.key === "Escape") {
            onDiscard();
          }
        }} />
      <div className="filter-bar__tail">
        <span id={countId} className="filter-bar__count" aria-live="polite">{statusText(status)}</span>
        <FilterHelp fields={fields} attributes={attributes} />
      </div>
    </div>
  );
};
