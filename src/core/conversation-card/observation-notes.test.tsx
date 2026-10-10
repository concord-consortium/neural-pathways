import React from "react";
import { render, screen } from "@testing-library/react";
import { AttributeDefinition } from "../types/attributes";
import { spokenText } from "./__fixtures__/spoken-text";
import { ObservationNotes } from "./observation-notes";

const YES_NO = { 0: "no", 1: "yes" };
const voices: AttributeDefinition = {
  key: "voices_raised", label: "Voices raised", description: "", type: "binary", valueLabels: YES_NO,
};
const water: AttributeDefinition = {
  key: "near_water", label: "Near water", description: "", type: "binary", valueLabels: YES_NO,
};
const group: AttributeDefinition = {
  key: "group_size", label: "Group size", description: "", type: "integer", min: 1, max: 6,
};
const unlabeled: AttributeDefinition = { key: "food_present", label: "Food present", description: "", type: "binary" };

function items() {
  return screen.getAllByRole("listitem");
}

/** The shown value is the only text in an attribute indicator that screen readers don't read, and it comes last. */
function shownValue(item: HTMLElement) {
  return (item.textContent ?? "").slice(spokenText(item).length);
}

describe("ObservationNotes", () => {
  it("shows the notes under their heading", () => {
    render(<ObservationNotes observation="Two individuals, facing each other." attributes={[]} />);
    expect(screen.getByRole("heading", { level: 3, name: "Observation notes" })).toBeInTheDocument();
    expect(screen.getByText("Two individuals, facing each other.")).toBeInTheDocument();
  });

  // The box scrolls when the card is short, and is then a Tab stop. jsdom never overflows, so here
  // it is the box that fits: a region all the same, but not a Tab stop.
  it("puts the notes in a region named by their heading, a Tab stop only while it scrolls", () => {
    render(<ObservationNotes observation="Quiet." attributes={[voices]} values={{ voices_raised: 0 }} />);
    const region = screen.getByRole("region", { name: "Observation notes" });
    expect(region).not.toHaveAttribute("tabindex");
    expect(region).toHaveTextContent("Quiet.");
    expect(region).toContainElement(items()[0]);
  });

  it.each([undefined, ""])("says there are no notes when the observation is %p", observation => {
    render(<ObservationNotes observation={observation} attributes={[]} />);
    expect(screen.getByText("(no notes for this conversation)")).toBeInTheDocument();
  });

  it("shows the attribute indicators in the order given, not the order of the values", () => {
    render(<ObservationNotes attributes={[water, voices, group]}
      values={{ voices_raised: 1, group_size: 2, near_water: 0 }} />);
    expect(items().map(spokenText)).toEqual(["Near water: no", "Voices raised: yes", "Group size: 2"]);
  });

  it("checks a binary attribute that is 1 and leaves one that is 0 blank", () => {
    render(<ObservationNotes attributes={[voices, water]} values={{ voices_raised: 1, near_water: 0 }} />);
    expect(shownValue(items()[0])).toBe("✔︎");
    expect(shownValue(items()[1])).toBe("");
  });

  // Only a binary 0 is blank: a count of 0 is still a count.
  it.each([[4, "4"], [0, "0"]])("shows an integer attribute's value %p as %p", (value, shown) => {
    render(<ObservationNotes attributes={[group]} values={{ group_size: value }} />);
    expect(shownValue(items()[0])).toBe(shown);
    expect(spokenText(items()[0])).toBe(`Group size: ${shown}`);
  });

  it("reads the number for a value with no label", () => {
    render(<ObservationNotes attributes={[unlabeled]} values={{ food_present: 1 }} />);
    expect(spokenText(items()[0])).toBe("Food present: 1");
  });

  it("says a missing value wasn't recorded", () => {
    render(<ObservationNotes attributes={[voices, group]} values={{}} />);
    expect(items().map(spokenText)).toEqual(["Voices raised: not recorded", "Group size: not recorded"]);
    expect(items().map(shownValue)).toEqual(["–", "–"]);
  });

  // null is how the data says a value is missing, so it gets the dash, not the blank that means no.
  it("says a null value wasn't recorded", () => {
    render(<ObservationNotes attributes={[water]} values={{ near_water: null }} />);
    expect(spokenText(items()[0])).toBe("Near water: not recorded");
    expect(shownValue(items()[0])).toBe("–");
  });

  it("draws an icon in each attribute indicator", () => {
    render(<ObservationNotes attributes={[voices, group]} values={{ voices_raised: 1, group_size: 3 }} />);
    expect(items().map(item => item.innerHTML.includes("<svg"))).toEqual([true, true]);
  });

  it("has no list when there are no attributes to show", () => {
    render(<ObservationNotes observation="Quiet." attributes={[]} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
