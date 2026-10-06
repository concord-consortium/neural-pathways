import React, { useEffect, useId, useRef, useState } from "react";
import { AttributeDefinition } from "../types/attributes";
import "./filter-help.scss";

interface FilterHelpProps {
  fields: readonly string[];
  attributes: readonly AttributeDefinition[];
}

const FIXED_FIELDS: Record<string, string> = {
  n: "Position among all the conversations, from 1",
  id: "The conversation's id",
  text: "The conversation's words. A bare word searches these too.",
  target_label: "approach or wait",
};

const OPERATORS: [string, string][] = [
  ["field:value", "Equals, or contains for text"],
  ["field:>value", "Greater than. Also <, >= and <="],
  ["AND", "Both"],
  ["OR", "Either"],
  ["NOT", "Not this"],
  ["-word", "Not this"],
  ["( )", "Group terms"],
  ["\"quoted phrase\"", "These words together"],
];

const EXAMPLES: [string, string][] = [
  ["model_correct:0", "the ones the model got wrong"],
  ["pathway_1:>2", "a high score on Pathway 1"],
  ["yandor", "conversations containing that word"],
  ["voices_raised:1 AND pathway_1:<0", ""],
  ["NOT near_water:1", ""],
  ["n:127", "conversation 127"],
];

function describeField(field: string, attributes: readonly AttributeDefinition[]): string {
  if (field in FIXED_FIELDS) {
    return FIXED_FIELDS[field];
  }
  const pathway = /^pathway_(\d+)$/.exec(field);
  if (pathway) {
    return `Score on Pathway ${pathway[1]}`;
  }
  const attribute = attributes.find(a => a.key === field);
  if (!attribute) {
    return "";
  }
  if (attribute.type === "integer" && attribute.min != null && attribute.max != null) {
    return `${attribute.label} (${attribute.min}–${attribute.max})`;
  }
  return attribute.label;
}

/** The ⓘ button in the filter bar, and the popover listing what a query can use. */
export const FilterHelp: React.FC<FilterHelpProps> = ({ fields, attributes }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="filter-help" ref={rootRef}
      onKeyDown={event => {
        if (open && event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}>
      <button ref={buttonRef} type="button" className="filter-help__button"
        aria-label="Show what you can filter on" aria-expanded={open}
        aria-controls={open ? dialogId : undefined} onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle cx="10" cy="5.5" r="1.6" />
          <rect x="8.6" y="8.5" width="2.8" height="7.5" rx="1" />
        </svg>
      </button>
      {open &&
        <div id={dialogId} className="filter-help__dialog" role="dialog" aria-label="What you can filter on">
          <button type="button" className="filter-help__close" aria-label="Close" onClick={close}>
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path d="M5 5 L15 15 M15 5 L5 15" />
            </svg>
          </button>
          <h3>Fields</h3>
          <table>
            <tbody>
              {fields.map(field =>
                <tr key={field}><td><code>{field}</code></td><td>{describeField(field, attributes)}</td></tr>)}
            </tbody>
          </table>
          <h3>Operators</h3>
          <table>
            <tbody>
              {OPERATORS.map(([operator, meaning]) =>
                <tr key={operator}><td><code>{operator}</code></td><td>{meaning}</td></tr>)}
            </tbody>
          </table>
          <p>Write AND, OR and NOT in capitals. In lowercase they are searched for as words.</p>
          <h3>Examples</h3>
          <ul>
            {EXAMPLES.map(([query, meaning]) =>
              <li key={query}><code>{query}</code>{meaning && ` — ${meaning}`}</li>)}
          </ul>
        </div>}
    </div>
  );
};
