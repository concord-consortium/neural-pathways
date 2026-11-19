import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ObservationNotes } from "./observation-notes";

/** The notes with their open state kept, as a view keeps it. */
const Notes: React.FC<{ observation?: string; initiallyOpen?: boolean }> = ({ observation, initiallyOpen = false }) => {
  const [open, setOpen] = useState(initiallyOpen);
  return <ObservationNotes observation={observation} open={open} onOpenChange={setOpen} />;
};

const toggle = () => screen.getByRole("button", { name: "Observation notes" });

describe("ObservationNotes", () => {
  it("puts the toggle inside a level 3 heading", () => {
    render(<Notes />);
    expect(screen.getByRole("heading", { level: 3, name: "Observation notes" })).toContainElement(toggle());
  });

  it("starts closed when the view says so, hiding the notes", () => {
    render(<Notes observation="Two individuals, facing each other." />);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Observation notes" })).not.toBeInTheDocument();
    expect(screen.getByText("Two individuals, facing each other.")).not.toBeVisible();
  });

  it("opens and closes when the heading is clicked", () => {
    render(<Notes observation="Quiet." />);
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Quiet.")).toBeVisible();
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Quiet.")).not.toBeVisible();
  });

  it("tells the view the new state, leaving the view to keep it", () => {
    const onOpenChange = jest.fn();
    render(<ObservationNotes observation="Quiet." open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(toggle());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Still open, since the view hasn't changed it.
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
  });

  it("points the toggle at the box it opens", () => {
    render(<Notes initiallyOpen observation="Quiet." />);
    const region = screen.getByRole("region", { name: "Observation notes" });
    expect(toggle()).toHaveAttribute("aria-controls", region.id);
  });

  // The box scrolls when the card is short, and is then a Tab stop. jsdom never overflows, so here
  // it is the box that fits: a region all the same, but not a Tab stop.
  it("puts the open notes in a region named by their heading, a Tab stop only while it scrolls", () => {
    render(<Notes initiallyOpen observation="Quiet." />);
    const region = screen.getByRole("region", { name: "Observation notes" });
    expect(region).not.toHaveAttribute("tabindex");
    expect(region).toHaveTextContent("Quiet.");
  });

  it.each([undefined, ""])("says there are no notes when the observation is %p", observation => {
    render(<Notes initiallyOpen observation={observation} />);
    expect(screen.getByText("(no notes for this message)")).toBeVisible();
  });

  it("shows no attribute indicators", () => {
    render(<Notes initiallyOpen observation="Quiet." />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
