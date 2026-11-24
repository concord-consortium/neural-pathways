import React from "react";
import { render, screen } from "@testing-library/react";
import { NetworkDrawing } from "./network-drawing";
import { layoutNetwork } from "./layout";
import { fullScene, Scene } from "./scene";
import { fixtureNetwork } from "../network/__fixtures__/alien3-network";
import { forward } from "../network/forward";
import { networkScales } from "../network/network-scales";
import { NeuronRef, NeuronRings } from "./neuron";
import fixture from "../network/__fixtures__/alien3-messages.json";

const SIZES = [10, 8, 6, 2];
const LABELS = { 0: "wait", 1: "approach" };
const passes = fixture.messages.map(c => forward(fixtureNetwork, c.text));
const scales = networkScales(fixtureNetwork, passes);
const layout = layoutNetwork(SIZES, 537, 440);

function renderDrawing(scene: Scene, extra: { highlighted?: NeuronRef; rings?: NeuronRings } = {}) {
  return render(
    <svg>
      <NetworkDrawing network={fixtureNetwork} layout={layout} pass={passes[0]} scales={scales} outputLabels={LABELS}
        scene={scene} {...extra} />
    </svg>,
  );
}

function spotlit(strength: number): Scene {
  const scene = fullScene(SIZES);
  scene.hiddenLayerSpotlight = strength;
  return scene;
}

describe("NetworkDrawing", () => {
  it("draws at full strength without opacity attributes", () => {
    renderDrawing(fullScene(SIZES));
    expect(screen.getByTestId("node-0-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("node-1-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("gauge-1-0")).not.toHaveAttribute("opacity");
    // eslint-disable-next-line testing-library/no-node-access -- opacity is on a parent <g> with no role or id
    expect(screen.getByTestId("edge-near-0-0-0").closest("g")).not.toHaveAttribute("opacity");
  });

  it("fades everything but the hidden layers' nodes by the spotlight's strength", () => {
    renderDrawing(spotlit(0.5));
    expect(screen.getByTestId("node-0-0")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("node-3-0")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("gauge-3-0")).toHaveAttribute("opacity", "0.5");
    // eslint-disable-next-line testing-library/no-node-access -- opacity is on a parent <g> with no role or id
    expect(screen.getByTestId("wire-0-0-0").closest("g")).toHaveAttribute("opacity", "0.5");
    // eslint-disable-next-line testing-library/no-node-access -- opacity is on a parent <g> with no role or id
    expect(screen.getByTestId("edge-near-0-0-0").closest("g")).toHaveAttribute("opacity", "0.5");
    // eslint-disable-next-line testing-library/no-node-access -- opacity is on a parent <g> with no role or id
    expect(screen.getByTestId("pill-0").closest("g")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByText("Hidden Layer 1")).toHaveAttribute("opacity", "0.5");
    // eslint-disable-next-line testing-library/no-node-access -- opacity is on a parent <g> with no role or id
    expect(screen.getByText("WAIT").closest("g")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("node-1-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("node-2-5")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("gauge-1-0")).not.toHaveAttribute("opacity");
    // The white discs behind the nodes stay opaque, so the lines don't show through a faded node.
    expect(screen.getByTestId("disc-0-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("disc-3-0")).not.toHaveAttribute("opacity");
  });

  it("treats a spotlight above 1 as 1", () => {
    renderDrawing(spotlit(1.5));
    expect(screen.getByTestId("node-0-0")).toHaveAttribute("opacity", "0");
  });

  it("treats a spotlight below 0 as 0", () => {
    renderDrawing(spotlit(-0.5));
    expect(screen.getByTestId("node-0-0")).not.toHaveAttribute("opacity");
  });

  it("updates node opacity when the same drawing rerenders with a new scene", () => {
    const { rerender } = renderDrawing(fullScene(SIZES));
    expect(screen.getByTestId("node-0-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("node-1-0")).not.toHaveAttribute("opacity");
    rerender(
      <svg>
        <NetworkDrawing network={fixtureNetwork} layout={layout} pass={passes[0]} scales={scales}
          outputLabels={LABELS} scene={spotlit(0.25)} />
      </svg>,
    );
    expect(screen.getByTestId("node-0-0")).toHaveAttribute("opacity", "0.75");
    expect(screen.getByTestId("node-1-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("node-3-0")).toHaveAttribute("opacity", "0.75");
  });

  it("keeps a highlighted neuron's edges at full strength and dims the rest of its two gaps", () => {
    renderDrawing(fullScene(SIZES), { highlighted: { column: 1, unit: 2 } });
    expect(screen.getByTestId("edge-near-0-0-2")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("edge-far-0-5-2")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("edge-near-1-2-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("edge-far-1-2-5")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("edge-near-0-0-0")).toHaveAttribute("opacity", "0.1");
    expect(screen.getByTestId("edge-far-0-5-3")).toHaveAttribute("opacity", "0.1");
    expect(screen.getByTestId("edge-near-1-0-0")).toHaveAttribute("opacity", "0.1");
    expect(screen.getByTestId("edge-near-2-0-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("edge-near-2-3-1")).not.toHaveAttribute("opacity");
  });

  it("dims nothing when no neuron is highlighted", () => {
    renderDrawing(fullScene(SIZES));
    expect(screen.getByTestId("edge-near-0-0-0")).not.toHaveAttribute("opacity");
  });

  it("draws the highlighted neuron's edges after the others in their group", () => {
    const { container } = renderDrawing(fullScene(SIZES), { highlighted: { column: 1, unit: 2 } });
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- no role or id
    const group = container.querySelector(".network-diagram__edges")!;
    const touched = (id: string) => /^edge-(near|far)-(0-\d+-2|1-2-\d+)$/.test(id);
    // eslint-disable-next-line testing-library/no-node-access -- the edges group has no role or id
    const ids = Array.from(group.children).map(child => child.getAttribute("data-testid")!);
    const firstTouched = ids.findIndex(touched);
    expect(firstTouched).toBeGreaterThan(0);
    expect(ids.slice(firstTouched).every(touched)).toBe(true);
    expect(ids.slice(firstTouched)).toHaveLength(2 * (10 + 6));
  });

  it("draws a ring for hover, pin and focus, with a class for each", () => {
    renderDrawing(fullScene(SIZES), {
      rings: { hovered: { column: 0, unit: 1 }, pinned: { column: 1, unit: 0 }, focused: { column: 1, unit: 0 } },
    });
    expect(screen.getByTestId("ring-0-1")).toHaveClass("network-diagram__ring--hovered");
    expect(screen.getByTestId("ring-0-1")).not.toHaveClass("network-diagram__ring--pinned");
    expect(screen.getByTestId("ring-1-0"))
      .toHaveClass("network-diagram__ring--pinned", "network-diagram__ring--focused");
    expect(screen.getByTestId("ring-1-0")).toHaveAttribute("r", String(layout.radius + 3.5));
    expect(screen.queryByTestId("ring-0-0")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ring-2-0")).not.toBeInTheDocument();
  });

  it("draws no rings without the prop", () => {
    renderDrawing(fullScene(SIZES));
    expect(screen.queryByTestId("ring-0-0")).not.toBeInTheDocument();
  });

  it("hides its text from assistive technology", () => {
    const { container } = renderDrawing(fullScene(SIZES));
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- every <text>
    const texts = Array.from(container.querySelectorAll("text"));
    expect(texts.length).toBeGreaterThan(0);
    // eslint-disable-next-line testing-library/no-node-access -- checking every <text> element
    texts.forEach(text => expect(text.closest("[aria-hidden='true']")).not.toBeNull());
  });

  it("marks each node outline with its column and unit", () => {
    renderDrawing(fullScene(SIZES));
    expect(screen.getByTestId("node-3-1")).toHaveAttribute("data-column", "3");
    expect(screen.getByTestId("node-3-1")).toHaveAttribute("data-unit", "1");
  });
});
