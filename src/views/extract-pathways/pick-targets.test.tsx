import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { fixtureLoadings } from "../../core/network/__fixtures__/alien3-network";
import { extractGeometry } from "./extract-geometry";
import { pathwaysLayout } from "./pathways-layout";
import { Pick, togglePick } from "./pick";
import { PickTargets, stepAfterKey, TIP_LINES } from "./pick-targets";

const SIZES = [10, 8, 6, 2];
const geometry = extractGeometry(SIZES, 0);
const layout = pathwaysLayout(geometry, 20, fixtureLoadings);
const NAMES = Array.from({ length: 14 }, (_, k) =>
  (k < 8 ? `Hidden Layer 1 Neuron ${k + 1}` : `Hidden Layer 2 Neuron ${k - 7}`));

function renderTargets(pick: Pick = undefined, onPick: (next: Pick) => void = jest.fn()) {
  return render(
    <PickTargets width={geometry.width} height={geometry.height} lifted={geometry.lifted} layout={layout}
      names={NAMES} pick={pick} onPick={onPick} />,
  );
}

const neuronName = (k: number) => `${NAMES[k]}, show its loadings on the three pathways`;
const pathwayName = (p: number) => `Pathway ${p + 1}, show its loadings on the 14 neurons`;
const neuronButtons = () => screen.getAllByRole("button", { name: /show its loadings on the three pathways$/ });
const boxButtons = () => screen.getAllByRole("button", { name: /show its loadings on the 14 neurons$/ });

describe("stepAfterKey", () => {
  it("steps down and up, stopping at the ends", () => {
    expect(stepAfterKey(0, "ArrowDown", 14)).toBe(1);
    expect(stepAfterKey(13, "ArrowDown", 14)).toBeUndefined();
    expect(stepAfterKey(5, "ArrowUp", 14)).toBe(4);
    expect(stepAfterKey(0, "ArrowUp", 14)).toBeUndefined();
  });

  it("goes to the first and last with Home and End", () => {
    expect(stepAfterKey(5, "Home", 14)).toBe(0);
    expect(stepAfterKey(5, "End", 3)).toBe(2);
  });

  it("ignores other keys", () => {
    expect(stepAfterKey(0, "x", 3)).toBeUndefined();
    expect(stepAfterKey(0, "ArrowRight", 3)).toBeUndefined();
  });
});

describe("PickTargets", () => {
  it("names a group by the tip, with 14 neuron buttons and 3 box buttons", () => {
    renderTargets();
    const group = screen.getByRole("group", { name: TIP_LINES.join(" ") });
    expect(group).toHaveAttribute("aria-label", "Click a neuron or a neural pathway to see how they are linked.");
    expect(neuronButtons()).toHaveLength(14);
    expect(boxButtons()).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Hidden Layer 1 Neuron 1, show its loadings on the three pathways" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pathway 2, show its loadings on the 14 neurons" }))
      .toBeInTheDocument();
  });

  it("keeps the lifted neurons' tooltips, which the targets cover, without describing the buttons", () => {
    renderTargets();
    neuronButtons().forEach((button, k) => {
      // eslint-disable-next-line testing-library/no-node-access -- the tooltip is the hit rect's <title>
      expect(button.querySelector("rect > title")).toHaveTextContent(NAMES[k]);
      expect(button).not.toHaveAccessibleDescription();
    });
  });

  it("makes each group one Tab stop", () => {
    renderTargets();
    expect(neuronButtons().filter(button => button.tabIndex === 0)).toEqual([neuronButtons()[0]]);
    expect(boxButtons().filter(button => button.tabIndex === 0)).toEqual([boxButtons()[0]]);
    expect(neuronButtons().slice(1).every(button => button.tabIndex === -1)).toBe(true);
  });

  it("toggles with a click, Enter and Space, and clears with Escape", () => {
    const pick: Pick = { kind: "neuron", index: 2 };
    const onPick = jest.fn();
    renderTargets(pick, onPick);
    fireEvent.click(screen.getByRole("button", { name: neuronName(2) }));
    // The picked neuron again: togglePick clears it.
    expect(onPick).toHaveBeenLastCalledWith(togglePick(pick, { kind: "neuron", index: 2 }));
    fireEvent.click(screen.getByRole("button", { name: pathwayName(1) }));
    expect(onPick).toHaveBeenLastCalledWith({ kind: "pathway", index: 1 });
    // Handled keys don't also scroll the page or press anything else.
    expect(fireEvent.keyDown(screen.getByRole("button", { name: neuronName(4) }), { key: "Enter" })).toBe(false);
    expect(onPick).toHaveBeenLastCalledWith({ kind: "neuron", index: 4 });
    expect(fireEvent.keyDown(screen.getByRole("button", { name: pathwayName(0) }), { key: " " })).toBe(false);
    expect(onPick).toHaveBeenLastCalledWith({ kind: "pathway", index: 0 });
    onPick.mockClear();
    // A held key's repeats neither toggle again nor scroll the page.
    expect(fireEvent.keyDown(screen.getByRole("button", { name: pathwayName(0) }), { key: " ", repeat: true }))
      .toBe(false);
    expect(fireEvent.keyDown(screen.getByRole("button", { name: neuronName(4) }), { key: "Enter", repeat: true }))
      .toBe(false);
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("button", { name: pathwayName(2) }), { key: "Escape" });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(undefined);
  });

  it("moves the Tab stop with the arrow keys and focuses it", () => {
    renderTargets();
    const [first, second] = neuronButtons();
    first.focus();
    expect(fireEvent.keyDown(first, { key: "ArrowDown" })).toBe(false);
    expect(second).toHaveFocus();
    expect(second.tabIndex).toBe(0);
    expect(first.tabIndex).toBe(-1);
    fireEvent.keyDown(second, { key: "End" });
    expect(neuronButtons()[13]).toHaveFocus();
    // The boxes keep their own stop.
    expect(boxButtons()[0].tabIndex).toBe(0);
    fireEvent.keyDown(boxButtons()[0], { key: "ArrowDown" });
    expect(boxButtons()[1]).toHaveFocus();
    expect(boxButtons()[1].tabIndex).toBe(0);
    expect(neuronButtons()[13].tabIndex).toBe(0);
  });

  it("moves the Tab stop to what is clicked", () => {
    renderTargets();
    fireEvent.click(screen.getByRole("button", { name: neuronName(6) }));
    expect(screen.getByRole("button", { name: neuronName(6) }).tabIndex).toBe(0);
    expect(neuronButtons()[0].tabIndex).toBe(-1);
  });

  it("leaves keys at the ends of a group to the page", () => {
    renderTargets();
    const [first] = neuronButtons();
    first.focus();
    expect(fireEvent.keyDown(first, { key: "ArrowUp" })).toBe(true);
    expect(first).toHaveFocus();
  });

  it("leaves modified keys alone", () => {
    const onPick = jest.fn();
    renderTargets(undefined, onPick);
    const [first, second] = neuronButtons();
    first.focus();
    for (const modifier of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }]) {
      expect(fireEvent.keyDown(first, { key: "ArrowDown", ...modifier })).toBe(true);
      expect(fireEvent.keyDown(first, { key: "Enter", ...modifier })).toBe(true);
      expect(fireEvent.keyDown(first, { key: "Escape", ...modifier })).toBe(true);
    }
    expect(first).toHaveFocus();
    expect(second.tabIndex).toBe(-1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("marks the pick pressed", () => {
    const { rerender } = renderTargets({ kind: "pathway", index: 1 });
    const pressed = () => screen.getAllByRole("button", { pressed: true });
    expect(pressed()).toEqual([screen.getByRole("button", { name: pathwayName(1) })]);
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(16);
    rerender(
      <PickTargets width={geometry.width} height={geometry.height} lifted={geometry.lifted} layout={layout}
        names={NAMES} pick={{ kind: "neuron", index: 3 }} onPick={jest.fn()} />,
    );
    expect(pressed()).toEqual([screen.getByRole("button", { name: neuronName(3) })]);
  });

  it("shows the tip's three lines, hidden from assistive technology", () => {
    renderTargets();
    const tip = screen.getByTestId("pick-tip");
    expect(tip).toHaveAttribute("aria-hidden", "true");
    // eslint-disable-next-line testing-library/no-node-access -- the tip's lines are its tspans
    expect([...tip.querySelectorAll("tspan")].map(line => line.textContent)).toEqual([...TIP_LINES]);
    expect(TIP_LINES).toEqual(["Click a neuron or", "a neural pathway to see", "how they are linked."]);
  });

  it("puts the tip by the boxes, no nearer the canvas's right edge than 186 px", () => {
    renderTargets();
    const x = Math.min(layout.boxes[0].x, geometry.width - 186) - 5;
    expect(screen.getByTestId("pick-tip")).toHaveAttribute("x", String(x));
    expect(screen.getByTestId("pick-tip")).toHaveAttribute("y", "30");
  });
});
