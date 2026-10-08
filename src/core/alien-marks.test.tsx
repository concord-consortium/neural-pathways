import React from "react";
import { render } from "@testing-library/react";
import { AlienMark } from "./alien-marks";

const KEYS = [
  "voices_raised", "engaged_in_task", "group_size", "near_water", "food_present",
  "resource_stressed", "gestures_repeated", "young_present", "carrying_burden",
];

function renderMark(attributeKey: string) {
  const { container } = render(<AlienMark attributeKey={attributeKey} size={34} />);
  // The mark is hidden from screen readers, so no query finds it.
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  return { container, svg: container.querySelector("svg") };
}

describe("AlienMark", () => {
  it.each(KEYS)("draws %s at the size asked for, hidden from screen readers", key => {
    const { svg } = renderMark(key);
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("width", "34");
    expect(svg).toHaveAttribute("height", "34");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).not.toBeEmptyDOMElement();
  });

  it("draws each attribute differently", () => {
    const drawings = KEYS.map(key => renderMark(key).svg?.innerHTML);
    expect(new Set(drawings).size).toBe(KEYS.length);
  });

  it("draws nothing for an attribute it has no drawing for", () => {
    const { container } = renderMark("bogus");
    expect(container).toBeEmptyDOMElement();
  });
});
