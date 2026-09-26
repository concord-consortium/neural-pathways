import React, { useState, useRef, useEffect } from "react";
import { AttributeDefinition } from "../../shared/types/attributes";
import "./codings-menu.scss";

interface CodingsMenuProps {
  /** Every codeable attribute, commissioned or not, in declared order. */
  codings: AttributeDefinition[];
  commissioned: ReadonlySet<string>;
  /** How many items a coder would have to read, for the framing line. */
  itemCount: number;
  itemNoun: { singular: string; plural: string };
  onCommission: (key: string) => void;
  onReset: () => void;
}

export const CodingsMenu: React.FC<CodingsMenuProps> = ({
  codings, commissioned, itemCount, itemNoun, onCommission, onReset,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const done = codings.filter(coding => commissioned.has(coding.key));
  const available = codings.filter(coding => !commissioned.has(coding.key));

  return (
    <div className="explorer-codings-menu" ref={menuRef}>
      <button
        className="explorer-codings-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        Codings
        {available.length > 0 && (
          <span className="explorer-codings-count">{available.length}</span>
        )}
      </button>

      {open && (
        <div className="explorer-codings-dialog" data-testid="codings-dialog">
          <h3>Codings</h3>
          <p className="explorer-codings-framing" data-testid="codings-framing">
            The {itemNoun.plural} already carry attributes a coder recorded before this data
            reached you. A coder can read all {itemCount} {itemNoun.plural} again and record
            one more. Choose what you think is worth the effort.
          </p>

          {done.length > 0 && (
            <div data-testid="codings-commissioned">
              <h4>Commissioned in this session</h4>
              <ul className="explorer-codings-done">
                {done.map(coding => <li key={coding.key}>{coding.label}</li>)}
              </ul>
            </div>
          )}

          {available.length > 0 ? (
            <>
              <h4>Available to commission</h4>
              <ul className="explorer-codings-available">
                {available.map(coding => (
                  <li key={coding.key}>
                    <div className="explorer-codings-entry">
                      <span className="explorer-codings-label">{coding.label}</span>
                      <button
                        className="explorer-codings-commission"
                        data-testid={`commission-${coding.key}`}
                        onClick={() => onCommission(coding.key)}
                      >
                        Commission
                      </button>
                    </div>
                    <div className="explorer-codings-description">{coding.description}</div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="explorer-codings-empty">Every available coding has been commissioned.</p>
          )}

          {done.length > 0 && (
            <button className="explorer-codings-reset" onClick={onReset}>
              Reset codings
            </button>
          )}
        </div>
      )}
    </div>
  );
};
