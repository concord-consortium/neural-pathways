import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { DIAGRAM_DEFAULT_SIZE, NetworkDiagram } from "./network-diagram";
import { popScale } from "./network-drawing";
import { formatActivation } from "./neuron";
import { NeuronInteraction } from "./neuron-targets";
import { layoutNetwork } from "./layout";
import { emptyScene, fullScene, Scene } from "./scene";
import { fixtureNetwork } from "../network/__fixtures__/alien3-network";
import { ForwardPass, forward, predictedClass } from "../network/forward";
import { BandThresholds, magnitudeBand, networkScales } from "../network/network-scales";
import { NEGATIVE_COLOR, POSITIVE_COLOR, signColor } from "../colors";
import fixture from "../network/__fixtures__/alien3-messages.json";

const SIZES = [10, 8, 6, 2];
const LABELS = { 0: "wait", 1: "approach" };
const passes = fixture.messages.map(c => forward(fixtureNetwork, c.text));
const scales = networkScales(fixtureNetwork, passes);
const waitPass = passes[0];       // classification 0
const approachPass = passes[6];   // classification 1
// jsdom has no ResizeObserver, so the diagram draws at its default size.
const layout = layoutNetwork(SIZES, DIAGRAM_DEFAULT_SIZE.width, DIAGRAM_DEFAULT_SIZE.height);
const R = layout.radius;

function renderDiagram(scene: Scene, pass: ForwardPass = waitPass) {
  return render(
    <>
      <h2 id="network-head">The Neural Network</h2>
      <NetworkDiagram network={fixtureNetwork} pass={pass} scales={scales} outputLabels={LABELS} scene={scene}
        headingId="network-head" />
    </>,
  );
}

function numberAttr(testId: string, name: string): number {
  return Number(screen.getByTestId(testId).getAttribute(name));
}

describe("NetworkDiagram", () => {
  // jsdom never overflows, so this is the diagram when it doesn't scroll: still a group, but not a Tab stop.
  it("is a group named by its panel's heading, and not a Tab stop while it doesn't scroll", () => {
    renderDiagram(emptyScene(SIZES));
    const group = screen.getByRole("group", { name: "The Neural Network" });
    expect(group).toContainElement(screen.getByRole("group", { name: "Network diagram" }));
    expect(group).not.toHaveAttribute("tabindex");
  });

  it("draws only wires, empty nodes and captions for an empty scene", () => {
    renderDiagram(emptyScene(SIZES));
    expect(screen.getAllByTestId(/^wire-/)).toHaveLength(80 + 48 + 12);
    expect(screen.getAllByTestId(/^node-/)).toHaveLength(26);
    expect(screen.queryAllByTestId(/^edge-/)).toHaveLength(0);
    expect(screen.queryAllByTestId(/^gauge-/)).toHaveLength(0);
    expect(screen.queryAllByTestId(/^weight-label-/)).toHaveLength(0);
    expect(screen.getByTestId("pill-0")).not.toHaveClass("network-diagram__pill--won");
    expect(screen.getByTestId("pill-1")).not.toHaveClass("network-diagram__pill--won");
    expect(screen.getByRole("group", { name: "Network diagram" })).toBeInTheDocument();
    for (const caption of ["Input Layer", "Hidden Layer 1", "Hidden Layer 2", "Output Layer"]) {
      expect(screen.getByText(caption)).toBeInTheDocument();
    }
    expect(screen.getByText("APPROACH")).toBeInTheDocument();
    expect(screen.getByText("WAIT")).toBeInTheDocument();
  });

  it("draws both halves of every edge for a full scene", () => {
    renderDiagram(fullScene(SIZES));
    expect(screen.getAllByTestId(/^edge-near-/)).toHaveLength(140);
    expect(screen.getAllByTestId(/^edge-far-/)).toHaveLength(140);
  });

  it("colors and bands the near half by activation and the far half by activation × weight", () => {
    renderDiagram(fullScene(SIZES));
    const activation = waitPass.layers[1][2];
    const contribution = activation * fixtureNetwork.layers[2].weights[3][2];
    const near = screen.getByTestId("edge-near-1-2-3");
    const far = screen.getByTestId("edge-far-1-2-3");
    expect(near).toHaveAttribute("stroke", signColor(activation));
    expect(near).toHaveAttribute("stroke-width", String(magnitudeBand(activation, scales.edgeThresholds[1]) + 1));
    expect(far).toHaveAttribute("stroke", signColor(contribution));
    expect(far).toHaveAttribute("stroke-width", String(magnitudeBand(contribution, scales.edgeThresholds[1]) + 1));
  });

  it("bands each gap against its own thresholds", () => {
    // Every nonzero value is thick in gaps 0 and 2, and thin in gap 1.
    const perGap = { ...scales, edgeThresholds: [[0, 0], [Infinity, Infinity], [0, 0]] as BandThresholds[] };
    render(<NetworkDiagram network={fixtureNetwork} pass={waitPass} scales={perGap} outputLabels={LABELS}
      scene={fullScene(SIZES)} headingId="network-head" />);
    const widths = (gap: number) => new Set(
      screen.getAllByTestId(new RegExp(`^edge-(near|far)-${gap}-`)).map(edge => edge.getAttribute("stroke-width")));
    expect(widths(0)).toEqual(new Set(["3"]));
    expect(widths(1)).toEqual(new Set(["1"]));
    expect(widths(2)).toEqual(new Set(["3"]));
  });

  it("uses both colors across a full scene", () => {
    renderDiagram(fullScene(SIZES));
    const strokes = screen.getAllByTestId(/^edge-/).map(edge => edge.getAttribute("stroke"));
    expect(strokes).toContain(POSITIVE_COLOR);
    expect(strokes).toContain(NEGATIVE_COLOR);
  });

  it("wires the output edges to the right class", () => {
    renderDiagram(fullScene(SIZES));
    const contribution = waitPass.layers[2][0] * fixtureNetwork.layers[3].weights[1][0];
    expect(screen.getByTestId("edge-far-2-0-1")).toHaveAttribute("stroke", signColor(contribution));
    // Approach (class 1) is drawn on top.
    const approachEdge = screen.getByTestId("edge-near-2-0-1");
    expect(Number(approachEdge.getAttribute("y2"))).toBeLessThan(
      Number(screen.getByTestId("edge-near-2-0-0").getAttribute("y2")));
  });

  it("draws a unit's edges part way", () => {
    const scene = emptyScene(SIZES);
    scene.edgeDraw[0][3] = 0.25;
    renderDiagram(scene);
    expect(screen.getAllByTestId(/^edge-near-0-3-/)).toHaveLength(8);
    expect(screen.queryAllByTestId(/^edge-far-/)).toHaveLength(0);
    const from = layout.nodes[0][3];
    const to = layout.nodes[1][5];
    const half = Math.hypot((to.x - R - (from.x + R)) / 2, (to.y - from.y) / 2);
    expect(numberAttr("edge-near-0-3-5", "stroke-dasharray")).toBeCloseTo(half);
    expect(numberAttr("edge-near-0-3-5", "stroke-dashoffset")).toBeCloseTo(half / 2);
  });

  it("fills each gauge from the center by the node's value", () => {
    renderDiagram(fullScene(SIZES));
    const values = waitPass.layers[1];
    const n = values.findIndex(v => v < 0);
    const p = values.findIndex(v => v > 0);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(p).toBeGreaterThanOrEqual(0);
    const nodeN = layout.nodes[1][n];
    const nodeP = layout.nodes[1][p];
    expect(numberAttr(`gauge-1-${n}`, "y")).toBeCloseTo(nodeN.y);
    expect(numberAttr(`gauge-1-${n}`, "height")).toBeCloseTo(R * Math.min(1, -values[n]));
    expect(screen.getByTestId(`gauge-1-${n}`)).toHaveAttribute("fill", NEGATIVE_COLOR);
    expect(numberAttr(`gauge-1-${p}`, "y")).toBeCloseTo(nodeP.y - R * Math.min(1, values[p]));
    expect(screen.getByTestId(`gauge-1-${p}`)).toHaveAttribute("fill", POSITIVE_COLOR);
  });

  it("fills a gauge part way", () => {
    const scene = fullScene(SIZES);
    const p = waitPass.layers[1].findIndex(v => v > 0);
    scene.nodeFill[1][p] = 0.5;
    renderDiagram(scene);
    expect(numberAttr(`gauge-1-${p}`, "height")).toBeCloseTo(R * 0.5 * Math.min(1, waitPass.layers[1][p]));
  });

  it("draws output gauges against the logit scale", () => {
    renderDiagram(fullScene(SIZES));
    const logit = waitPass.layers[3][0];
    expect(numberAttr("gauge-3-0", "height")).toBeCloseTo(R * Math.min(1, Math.abs(logit) / scales.logitScale));
  });

  it("marks the winning pill and names the answer once it is revealed", () => {
    expect(predictedClass(waitPass)).toBe(0);
    renderDiagram(fullScene(SIZES));
    expect(screen.getByTestId("pill-0")).toHaveClass("network-diagram__pill--won");
    expect(screen.getByTestId("pill-1")).not.toHaveClass("network-diagram__pill--won");
    expect(screen.getByRole("group", { name: "Network diagram. The network predicts Wait." })).toBeInTheDocument();
  });

  it("marks Approach when the network predicts it", () => {
    renderDiagram(fullScene(SIZES), approachPass);
    expect(screen.getByTestId("pill-1")).toHaveClass("network-diagram__pill--won");
    expect(screen.getByRole("group", { name: /predicts Approach/ })).toBeInTheDocument();
  });

  it("pops the winning pill while the answer arrives, without naming it yet", () => {
    const scene = emptyScene(SIZES);
    scene.answer = 0.3;
    renderDiagram(scene);
    const pill = screen.getByTestId("pill-0");
    expect(pill).toHaveClass("network-diagram__pill--won");
    expect(pill).toHaveStyle({ transform: `scale(${popScale(0.3)})` });
    expect(screen.getByRole("group", { name: "Network diagram" })).toBeInTheDocument();
  });

  it("shows a gap's weight caption only when the scene asks", () => {
    const scene = emptyScene(SIZES);
    scene.weightLabel[1] = true;
    renderDiagram(scene);
    expect(screen.getByTestId("weight-label-1")).toHaveTextContent("× weight");
    expect(screen.queryByTestId("weight-label-0")).not.toBeInTheDocument();
  });
});

const DIAGRAM_NAME = "Network diagram. The network predicts Wait.";

function makeInteraction(overrides: Partial<NeuronInteraction> = {}): NeuronInteraction {
  return {
    reachedColumns: 2, rings: {},
    onHover: jest.fn(), onFocusChange: jest.fn(), onToggle: jest.fn(), onClear: jest.fn(),
    ...overrides,
  };
}

function renderInteractive(interaction: NeuronInteraction, scene: Scene = fullScene(SIZES)) {
  return render(
    <>
      <h2 id="network-head">The Neural Network</h2>
      <NetworkDiagram network={fixtureNetwork} pass={waitPass} scales={scales} outputLabels={LABELS} scene={scene}
        headingId="network-head" interaction={interaction} />
    </>,
  );
}

describe("NetworkDiagram neuron targets", () => {
  it("is a group with the diagram's label, holding the reached neurons as buttons", () => {
    renderInteractive(makeInteraction());
    expect(screen.getByRole("group", { name: DIAGRAM_NAME })).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(18);
    expect(buttons[0]).toHaveAccessibleName(
      `Input Layer Neuron 1, activation ${formatActivation(waitPass.layers[0][0])}`);
  });

  it("draws no targets without an interaction", () => {
    renderDiagram(fullScene(SIZES));
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByTestId(/^neuron-target-/)).toHaveLength(0);
  });

  it("gives the Tab stop to one neuron only", () => {
    renderInteractive(makeInteraction({ tabStop: { column: 0, unit: 3 } }));
    const tabIndexes = screen.getAllByRole("button").map(b => b.getAttribute("tabindex"));
    expect(tabIndexes.filter(t => t === "0")).toHaveLength(1);
    expect(tabIndexes.filter(t => t === "-1")).toHaveLength(17);
    expect(screen.getByRole("button", { name: /^Input Layer Neuron 4,/ })).toHaveAttribute("tabindex", "0");
  });

  it("marks the pinned neuron as pressed", () => {
    renderInteractive(makeInteraction({ rings: { pinned: { column: 1, unit: 2 } } }));
    const pressed = screen.getAllByRole("button", { pressed: true });
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveAccessibleName(/^Hidden Layer 1 Neuron 3,/);
  });

  it("doesn't answer for neurons the steps haven't reached", () => {
    const interaction = makeInteraction({ reachedColumns: 1 });
    renderInteractive(interaction);
    expect(screen.getAllByRole("button")).toHaveLength(10);
    fireEvent.click(screen.getByTestId("neuron-target-1-0"));
    fireEvent.pointerEnter(screen.getByTestId("neuron-target-1-0"));
    fireEvent.click(screen.getByTestId("pill-target-1"));
    expect(interaction.onToggle).not.toHaveBeenCalled();
    expect(interaction.onClear).not.toHaveBeenCalled();
    expect(interaction.onHover).not.toHaveBeenCalled();
  });

  it("toggles on click, Enter and Space, and clears on Escape and on empty space", () => {
    const interaction = makeInteraction({ tabStop: { column: 0, unit: 0 } });
    renderInteractive(interaction);
    fireEvent.click(screen.getByTestId("neuron-target-0-0"));
    expect(interaction.onToggle).toHaveBeenCalledWith({ column: 0, unit: 0 });
    expect(interaction.onClear).not.toHaveBeenCalled();

    const button = screen.getAllByRole("button")[0];
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    expect(interaction.onToggle).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(button, { key: "Escape" });
    expect(interaction.onClear).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("group", { name: DIAGRAM_NAME }));
    expect(interaction.onClear).toHaveBeenCalledTimes(2);
  });

  it("reports hover and focus", () => {
    const interaction = makeInteraction();
    renderInteractive(interaction);
    const button = screen.getAllByRole("button")[0];
    fireEvent.pointerEnter(button);
    expect(interaction.onHover).toHaveBeenLastCalledWith({ column: 0, unit: 0 });
    fireEvent.pointerLeave(button);
    expect(interaction.onHover).toHaveBeenLastCalledWith(undefined);
    button.focus();
    expect(interaction.onFocusChange).toHaveBeenLastCalledWith({ column: 0, unit: 0 });
    button.blur();
    expect(interaction.onFocusChange).toHaveBeenLastCalledWith(undefined);
  });

  it("moves focus with the arrow keys", () => {
    renderInteractive(makeInteraction({ tabStop: { column: 0, unit: 0 } }));
    const buttons = screen.getAllByRole("button");
    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowDown" });
    expect(buttons[1]).toHaveFocus();
  });

  it("lets the output pill stand in for its neuron", () => {
    const interaction = makeInteraction({ reachedColumns: 4 });
    renderInteractive(interaction);
    fireEvent.pointerEnter(screen.getByTestId("pill-target-1"));
    expect(interaction.onHover).toHaveBeenCalledWith({ column: 3, unit: 1 });
    fireEvent.click(screen.getByTestId("pill-target-1"));
    expect(interaction.onToggle).toHaveBeenCalledWith({ column: 3, unit: 1 });
    expect(interaction.onClear).not.toHaveBeenCalled();
  });

  it("titles a neuron with its name before it's reached and its activation after", () => {
    renderInteractive(makeInteraction({ reachedColumns: 2 }));
    expect(screen.getByTestId("neuron-target-1-0"))
      .toHaveTextContent(`Activation: ${formatActivation(waitPass.layers[1][0])}`);
    expect(screen.getByTestId("neuron-target-2-0")).toHaveTextContent("Hidden Layer 2 Neuron 1");
    expect(screen.getByTestId("neuron-target-3-1")).toHaveTextContent("Output Layer: Approach");
  });
});

describe("popScale", () => {
  it("runs 0.94 → 1.10 → 0.98 → 1", () => {
    expect(popScale(0)).toBeCloseTo(0.94);
    expect(popScale(0.45)).toBeCloseTo(1.1);
    expect(popScale(0.72)).toBeCloseTo(0.98);
    expect(popScale(1)).toBe(1);
  });
});
