import React from "react";
import { render } from "@testing-library/react";
import { AlienIcon } from "./alien-icon";

const KEYS = [
  "voices_raised", "engaged_in_task", "group_size", "near_water", "food_present",
  "resource_stressed", "gestures_repeated", "young_present", "carrying_burden",
];

function renderIcon(attributeKey: string) {
  const { container } = render(<AlienIcon attributeKey={attributeKey} size={34} />);
  // The icon is hidden from screen readers, so no query finds it.
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  return { container, svg: container.querySelector("svg") };
}

describe("AlienIcon", () => {
  it.each(KEYS)("draws %s at the size asked for, hidden from screen readers", key => {
    const { svg } = renderIcon(key);
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("width", "34");
    expect(svg).toHaveAttribute("height", "34");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).not.toBeEmptyDOMElement();
  });

  it("draws each attribute differently", () => {
    const drawings = KEYS.map(key => renderIcon(key).svg?.innerHTML);
    expect(new Set(drawings).size).toBe(KEYS.length);
  });

  it.each(["bogus", "toString", "constructor"])("draws nothing for %p, which has no drawing", key => {
    const { container } = renderIcon(key);
    expect(container).toBeEmptyDOMElement();
  });
});
