// src/explorer/components/settings-menu.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsMenu } from "./settings-menu";
import { ScaleMode } from "../types/explorer-data";

describe("SettingsMenu", () => {
  const defaultProps = {
    scaleMode: "shared" as ScaleMode,
    onScaleModeChange: jest.fn(),
    showVarianceFractions: false,
    onShowVarianceFractionsChange: jest.fn(),
    showScores: false,
    onShowScoresChange: jest.fn(),
    showExtents: false,
    onShowExtentsChange: jest.fn(),
    wordColorMode: "score" as const,
    onWordColorModeChange: jest.fn(),
    showPathwayValues: false,
    onShowPathwayValuesChange: jest.fn(),
    wordScaleScope: "per-pathway" as const,
    onWordScaleScopeChange: jest.fn(),
  };

  it("opens the popover when gear icon is clicked", () => {
    render(<SettingsMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Shared scale")).toBeDefined();
  });

  it("does not show popover initially", () => {
    render(<SettingsMenu {...defaultProps} />);
    expect(screen.queryByText("Shared scale")).toBeNull();
  });

  it("calls onScaleModeChange when radio is clicked", () => {
    const onScaleModeChange = jest.fn();
    render(<SettingsMenu {...defaultProps} onScaleModeChange={onScaleModeChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByLabelText("Per-pathway scale"));
    expect(onScaleModeChange).toHaveBeenCalledWith("per-pathway");
  });

  it("calls onShowVarianceFractionsChange when checkbox is clicked", () => {
    const onShowVarianceFractionsChange = jest.fn();
    render(<SettingsMenu {...defaultProps} onShowVarianceFractionsChange={onShowVarianceFractionsChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByLabelText("Show variance fractions"));
    expect(onShowVarianceFractionsChange).toHaveBeenCalledWith(true);
  });
});
