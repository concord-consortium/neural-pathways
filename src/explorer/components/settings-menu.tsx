// src/explorer/components/settings-menu.tsx
import React, { useState, useRef, useEffect } from "react";
import { ScaleMode } from "../types/explorer-data";
import "./settings-menu.scss";

interface SettingsMenuProps {
  scaleMode: ScaleMode;
  onScaleModeChange: (mode: ScaleMode) => void;
  showVarianceFractions: boolean;
  onShowVarianceFractionsChange: (show: boolean) => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  scaleMode, onScaleModeChange, showVarianceFractions, onShowVarianceFractionsChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="settings-menu" ref={containerRef}>
      <button
        className="settings-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Settings"
      >
        &#9881;
      </button>
      {isOpen && (
        <div className="settings-menu-popover">
          <div className="settings-menu-group">
            <div className="settings-menu-group-label">Scale Mode</div>
            <label>
              <input
                type="radio"
                name="scaleMode"
                checked={scaleMode === "shared"}
                onChange={() => onScaleModeChange("shared")}
              />
              Shared scale
            </label>
            <label>
              <input
                type="radio"
                name="scaleMode"
                checked={scaleMode === "per-pathway"}
                onChange={() => onScaleModeChange("per-pathway")}
              />
              Per-pathway scale
            </label>
          </div>
          <div className="settings-menu-group">
            <div className="settings-menu-group-label">Display</div>
            <label>
              <input
                type="checkbox"
                checked={showVarianceFractions}
                onChange={e => onShowVarianceFractionsChange(e.target.checked)}
              />
              Show variance fractions
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
