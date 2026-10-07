import React from "react";
import { render, screen } from "@testing-library/react";
import { DIAGRAM_DEFAULT_SIZE, NetworkDiagram, popScale } from "./network-diagram";
import { layoutNetwork } from "./layout";
import { emptyScene, fullScene, Scene } from "./scene";
import { toyNetwork } from "../network/toy-network";
import { ForwardPass, forward, predictedClass } from "../network/forward";
import { BandThresholds, magnitudeBand, networkScales } from "../network/network-scales";
import { NEGATIVE_COLOR, POSITIVE_COLOR, signColor } from "../colors";
import fixture from "../network/__fixtures__/toy-network-conversations.json";

const SIZES = [10, 8, 6, 2];
const LABELS = { 0: "wait", 1: "approach" };
const passes = fixture.conversations.map(c => forward(toyNetwork, c.text));
const scales = networkScales(toyNetwork, passes);
const waitPass = passes[0];       // classification 0
const approachPass = passes[6];   // classification 1
// jsdom has no ResizeObserver, so the diagram draws at its default size.
const layout = layoutNetwork(SIZES, DIAGRAM_DEFAULT_SIZE.width, DIAGRAM_DEFAULT_SIZE.height);
const R = layout.radius;

function renderDiagram(scene: Scene, pass: ForwardPass = waitPass) {
  return render(
    <NetworkDiagram network={toyNetwork} pass={pass} scales={scales} outputLabels={LABELS} scene={scene} />,
  );
}

function numberAttr(testId: string, name: string): number {
  return Number(screen.getByTestId(testId).getAttribute(name));
}

describe("NetworkDiagram", () => {
  it("draws only wires, empty nodes and captions for an empty scene", () => {
    renderDiagram(emptyScene(SIZES));
    expect(screen.getAllByTestId(/^wire-/)).toHaveLength(80 + 48 + 12);
    expect(screen.getAllByTestId(/^node-/)).toHaveLength(26);
    expect(screen.queryAllByTestId(/^edge-/)).toHaveLength(0);
    expect(screen.queryAllByTestId(/^gauge-/)).toHaveLength(0);
    expect(screen.queryAllByTestId(/^weight-label-/)).toHaveLength(0);
    expect(screen.getByTestId("pill-0")).not.toHaveClass("network-diagram__pill--won");
    expect(screen.getByTestId("pill-1")).not.toHaveClass("network-diagram__pill--won");
    expect(screen.getByRole("img", { name: "Network diagram" })).toBeInTheDocument();
    for (const caption of ["Input Layer", "Hidden Layer 1", "Hidden Layer 2", "Output Layer"]) {
      expect(screen.getByText(caption)).toBeInTheDocument();
    }
    expect(screen.getByText("APPROACH")).toBeInTheDocument();
    expect(screen.getByText("WAIT")).toBeInTheDocument();
    expect(screen.getByText("Target Class:")).toBeInTheDocument();
    expect(screen.getByText("Other Class:")).toBeInTheDocument();
  });

  it("draws both halves of every edge for a full scene", () => {
    renderDiagram(fullScene(SIZES));
    expect(screen.getAllByTestId(/^edge-near-/)).toHaveLength(140);
    expect(screen.getAllByTestId(/^edge-far-/)).toHaveLength(140);
  });

  it("colors and bands the near half by activation and the far half by activation × weight", () => {
    renderDiagram(fullScene(SIZES));
    const activation = waitPass.layers[1][2];
    const contribution = activation * toyNetwork.layers[2].weights[3][2];
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
    render(<NetworkDiagram network={toyNetwork} pass={waitPass} scales={perGap} outputLabels={LABELS}
      scene={fullScene(SIZES)} />);
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
    const contribution = waitPass.layers[2][0] * toyNetwork.layers[3].weights[1][0];
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
    const negative = waitPass.layers[1][0];
    const positive = waitPass.layers[1][1];
    expect(negative).toBeLessThan(0);
    expect(positive).toBeGreaterThan(0);
    const node0 = layout.nodes[1][0];
    const node1 = layout.nodes[1][1];
    expect(numberAttr("gauge-1-0", "y")).toBeCloseTo(node0.y);
    expect(numberAttr("gauge-1-0", "height")).toBeCloseTo(R * Math.min(1, -negative));
    expect(screen.getByTestId("gauge-1-0")).toHaveAttribute("fill", NEGATIVE_COLOR);
    expect(numberAttr("gauge-1-1", "y")).toBeCloseTo(node1.y - R * Math.min(1, positive));
    expect(screen.getByTestId("gauge-1-1")).toHaveAttribute("fill", POSITIVE_COLOR);
  });

  it("fills a gauge part way", () => {
    const scene = fullScene(SIZES);
    scene.nodeFill[1][1] = 0.5;
    renderDiagram(scene);
    expect(numberAttr("gauge-1-1", "height")).toBeCloseTo(R * 0.5 * Math.min(1, waitPass.layers[1][1]));
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
    expect(screen.getByRole("img", { name: "Network diagram. The network predicts Wait." })).toBeInTheDocument();
  });

  it("marks Approach when the network predicts it", () => {
    renderDiagram(fullScene(SIZES), approachPass);
    expect(screen.getByTestId("pill-1")).toHaveClass("network-diagram__pill--won");
    expect(screen.getByRole("img", { name: /predicts Approach/ })).toBeInTheDocument();
  });

  it("pops the winning pill while the answer arrives, without naming it yet", () => {
    const scene = emptyScene(SIZES);
    scene.answer = 0.3;
    renderDiagram(scene);
    const pill = screen.getByTestId("pill-0");
    expect(pill).toHaveClass("network-diagram__pill--won");
    expect(pill).toHaveStyle({ transform: `scale(${popScale(0.3)})` });
    expect(screen.getByRole("img", { name: "Network diagram" })).toBeInTheDocument();
  });

  it("shows a gap's weight caption only when the scene asks", () => {
    const scene = emptyScene(SIZES);
    scene.weightLabel[1] = true;
    renderDiagram(scene);
    expect(screen.getByTestId("weight-label-1")).toHaveTextContent("× weight");
    expect(screen.queryByTestId("weight-label-0")).not.toBeInTheDocument();
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
