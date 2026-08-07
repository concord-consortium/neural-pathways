import React from "react";
import { render, screen } from "@testing-library/react";
import { AttributeChips } from "./attribute-chips";
import { S3Review } from "../../shared/types/s3-data";
import { AttributeDefinition } from "../../shared/types/attributes";

const review = { id: "r1" } as S3Review;

const attributes: AttributeDefinition[] = [
  { key: "flag_on", label: "Flag on", description: "A binary that is set.", type: "binary" },
  { key: "flag_off", label: "Flag off", description: "A binary that is clear.", type: "binary" },
  { key: "count", label: "Count", description: "An integer.", type: "integer", min: 1, max: 5 },
  { key: "ratio", label: "Ratio", description: "A float.", type: "float", min: 0, max: 1 },
  { key: "missing", label: "Missing", description: "Not applicable here.", type: "binary" },
];

const values: Record<string, number | null> = {
  flag_on: 1, flag_off: 0, count: 3, ratio: 0.4567, missing: null,
};

const getAttributeValue = (_review: S3Review, key: string) => values[key] ?? null;

const renderChips = () => render(
  <AttributeChips review={review} attributes={attributes} getAttributeValue={getAttributeValue} />,
);

describe("AttributeChips", () => {
  it("renders yes for a set binary attribute", () => {
    renderChips();
    expect(screen.getByTestId("attribute-chip-flag_on").textContent).toContain("yes");
  });

  it("renders no for a clear binary attribute", () => {
    renderChips();
    expect(screen.getByTestId("attribute-chip-flag_off").textContent).toContain("no");
  });

  it("marks only set binary chips with the on modifier", () => {
    renderChips();
    expect(screen.getByTestId("attribute-chip-flag_on").className).toContain("chip-on");
    expect(screen.getByTestId("attribute-chip-flag_off").className).not.toContain("chip-on");
  });

  it("renders an integer without decimals", () => {
    renderChips();
    expect(screen.getByTestId("attribute-chip-count").textContent).toContain("3");
  });

  it("renders a float to two decimals", () => {
    renderChips();
    expect(screen.getByTestId("attribute-chip-ratio").textContent).toContain("0.46");
  });

  it("shows the label on every chip", () => {
    renderChips();
    expect(screen.getByTestId("attribute-chip-count").textContent).toContain("Count");
  });

  it("exposes the description as a tooltip", () => {
    renderChips();
    expect(screen.getByTestId("attribute-chip-count").getAttribute("title")).toBe("An integer.");
  });

  it("omits attributes whose value is null", () => {
    renderChips();
    expect(screen.queryByTestId("attribute-chip-missing")).toBeNull();
  });

  it("renders nothing when no attribute has a value", () => {
    const { container } = render(
      <AttributeChips review={review} attributes={attributes} getAttributeValue={() => null} />,
    );
    // eslint-disable-next-line testing-library/no-node-access -- verifying component renders nothing
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the attribute list is empty", () => {
    const { container } = render(
      <AttributeChips review={review} attributes={[]} getAttributeValue={getAttributeValue} />,
    );
    // eslint-disable-next-line testing-library/no-node-access -- verifying component renders nothing
    expect(container.firstChild).toBeNull();
  });
});
