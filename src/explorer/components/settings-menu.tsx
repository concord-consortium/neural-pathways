// src/explorer/components/settings-menu.tsx
import React, { useState, useRef, useEffect } from "react";
import { ScaleMode, WordColorMode, WordScaleScope } from "../types/explorer-data";
import "./settings-menu.scss";

interface SettingsMenuProps {
  scaleMode: ScaleMode;
  onScaleModeChange: (mode: ScaleMode) => void;
  showVarianceFractions: boolean;
  onShowVarianceFractionsChange: (show: boolean) => void;
  showScores: boolean;
  onShowScoresChange: (show: boolean) => void;
  showExtents: boolean;
  onShowExtentsChange: (show: boolean) => void;
  wordColorMode: WordColorMode;
  onWordColorModeChange: (mode: WordColorMode) => void;
  showPathwayValues: boolean;
  onShowPathwayValuesChange: (show: boolean) => void;
  wordScaleScope: WordScaleScope;
  onWordScaleScopeChange: (scope: WordScaleScope) => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  scaleMode, onScaleModeChange, showVarianceFractions, onShowVarianceFractionsChange,
  showScores, onShowScoresChange, showExtents, onShowExtentsChange,
  wordColorMode, onWordColorModeChange,
  showPathwayValues, onShowPathwayValuesChange,
  wordScaleScope, onWordScaleScopeChange
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
                checked={showScores}
                onChange={e => onShowScoresChange(e.target.checked)}
              />
              Show scores
            </label>
            <label>
              <input
                type="checkbox"
                checked={showExtents}
                onChange={e => onShowExtentsChange(e.target.checked)}
              />
              Show scale extents
            </label>
            <label>
              <input
                type="checkbox"
                checked={showVarianceFractions}
                onChange={e => onShowVarianceFractionsChange(e.target.checked)}
              />
              Show variance fractions
            </label>
          </div>
          <div className="settings-menu-group">
            <div className="settings-menu-group-label">Word Color</div>
            <label>
              <input
                type="radio"
                name="wordColorMode"
                checked={wordColorMode === "score"}
                onChange={() => onWordColorModeChange("score")}
              />
              Score
            </label>
            <label>
              <input
                type="radio"
                name="wordColorMode"
                checked={wordColorMode === "impact"}
                onChange={() => onWordColorModeChange("impact")}
              />
              Normalized impact
            </label>
            <label>
              <input
                type="checkbox"
                checked={showPathwayValues}
                onChange={e => onShowPathwayValuesChange(e.target.checked)}
              />
              Show pathway values
            </label>
          </div>
          <div className="settings-menu-group">
            <div className="settings-menu-group-label">Word Color Scale</div>
            <label>
              <input
                type="radio"
                name="wordScaleScope"
                checked={wordScaleScope === "per-pathway"}
                onChange={() => onWordScaleScopeChange("per-pathway")}
              />
              Per pathway
            </label>
            <label>
              <input
                type="radio"
                name="wordScaleScope"
                checked={wordScaleScope === "full-review"}
                onChange={() => onWordScaleScopeChange("full-review")}
              />
              Full review
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
