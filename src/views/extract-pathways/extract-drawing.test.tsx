import React from "react";
import { render, screen } from "@testing-library/react";
import { toyNetwork } from "../../core/network/toy-network";
import { forward } from "../../core/network/forward";
import { networkScales } from "../../core/network/network-scales";
import { signColor } from "../../core/colors";
import fixture from "../../core/network/__fixtures__/toy-network-conversations.json";
import { ExtractDrawing } from "./extract-drawing";
import { ExtractScene, restScene } from "./extract-scene";
import { extractGeometry, MIN_CANVAS_WIDTH } from "./extract-geometry";
import { setupSceneAt } from "./setup-timeline";

const SIZES = [10, 8, 6, 2];
const LABELS = { 0: "wait", 1: "approach" };
const passes = fixture.conversations.map(c => forward(toyNetwork, c.text));
const scales = networkScales(toyNetwork, passes);
// jsdom has no ResizeObserver, so the drawing lays out at its minimum width.
const geometry = extractGeometry(SIZES, MIN_CANVAS_WIDTH);

function renderDrawing(scene: ExtractScene) {
  return render(
    <ExtractDrawing network={toyNetwork} passes={passes} scales={scales} outputLabels={LABELS} scene={scene} />,
  );
}

/** The unit of `values` with the largest magnitude, so its gauge is surely drawn. */
function strongest(values: number[]): number {
  return values.reduce((best, v, k) => (Math.abs(v) > Math.abs(values[best]) ? k : best), 0);
}

/** The translate in a copy's transform. */
function placeOf(element: Element): { x: number; y: number } {
  const match = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(element.getAttribute("transform") ?? "");
  return { x: Number(match![1]), y: Number(match![2]) };
}

describe("ExtractDrawing", () => {
  it("draws only the network before Setup", () => {
    renderDrawing(restScene(SIZES, 0));
    expect(screen.getByRole("img", { name: "The network." })).toBeInTheDocument();
    expect(screen.getByTestId("node-1-0")).toBeInTheDocument();
    expect(screen.queryByTestId("lifted-column")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId(/^deck-column-/)).toHaveLength(0);
  });

  it("stands the 14 lifted copies in their column once Setup is done, named by their neurons", () => {
    renderDrawing(restScene(SIZES, 1));
    expect(screen.getByRole("img", { name: "The network, with its 14 hidden neurons lifted out." }))
      .toBeInTheDocument();
    const lifted = screen.getByTestId("lifted-column");
    expect(lifted).toHaveTextContent("Hidden Layer Neurons");
    // eslint-disable-next-line testing-library/no-node-access -- copies are groups with only a test id
    const copies = lifted.querySelectorAll("[data-testid^='copy-']");
    expect(copies).toHaveLength(14);
    // eslint-disable-next-line testing-library/no-node-access -- a copy's name is its <title> child
    expect(copies[0].querySelector("title")).toHaveTextContent("Hidden Layer 1 Neuron 1");
    // eslint-disable-next-line testing-library/no-node-access -- a copy's name is its <title> child
    expect(copies[13].querySelector("title")).toHaveTextContent("Hidden Layer 2 Neuron 6");
    expect(placeOf(copies[0])).toEqual({ x: geometry.lifted.x, y: geometry.lifted.ys[0] });
  });

  it("describes the plain network while the lifted column is still flying", () => {
    renderDrawing(setupSceneAt(SIZES, 1000));
    expect(screen.getByRole("img", { name: "The network." })).toBeInTheDocument();
  });

  it("starts a lifted copy on its hidden neuron", () => {
    renderDrawing(setupSceneAt(SIZES, 550));
    // eslint-disable-next-line testing-library/no-node-access -- copies are groups with only a test id
    const first = screen.getByTestId("lifted-column").querySelector("[data-testid='copy-0']")!;
    expect(placeOf(first)).toEqual(geometry.hidden[0]);
  });

  it("draws each collected conversation as a deck column of its hidden activations", () => {
    renderDrawing(restScene(SIZES, 4));
    expect(screen.getByRole(
      "img", { name: "The network, with its 14 hidden neurons lifted out and 3 conversations collected." },
    )).toBeInTheDocument();
    expect(screen.getByText("Conversation 3")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^deck-column-/)).toHaveLength(3);
    const values = [...passes[1].layers[1], ...passes[1].layers[2]];
    const k = strongest(values);
    // eslint-disable-next-line testing-library/no-node-access -- the gauge is an unlabeled rect in a copy
    const gauge = screen.getByTestId("deck-column-1").querySelector(`[data-testid='copy-${k}'] rect`);
    expect(gauge).toHaveAttribute("fill", signColor(values[k]));
  });

  it("names one conversation collected in the singular", () => {
    renderDrawing(restScene(SIZES, 2));
    expect(screen.getByRole(
      "img", { name: "The network, with its 14 hidden neurons lifted out and 1 conversation collected." },
    )).toBeInTheDocument();
  });

  it("shows the conversation the scene names on the network", () => {
    renderDrawing(restScene(SIZES, 3));
    const values = passes[1].layers[1];
    const k = strongest(values);
    expect(Number(screen.getByTestId(`gauge-1-${k}`).getAttribute("height")))
      .toBeCloseTo(geometry.network.radius * Math.min(1, Math.abs(values[k])));
  });

  it("dims the lifted column with its opacity", () => {
    const scene = restScene(SIZES, 1);
    scene.lifted = { ...scene.lifted!, opacity: 0.5 };
    renderDrawing(scene);
    expect(screen.getByTestId("lifted-column")).toHaveAttribute("opacity", "0.5");
  });

  it("bounces the conversation label in, and leaves it still once it lands", () => {
    const scene = restScene(SIZES, 2);
    scene.label = { n: 1, bounce: 0.2 };
    const { unmount } = renderDrawing(scene);
    expect(screen.getByText("Conversation 1").getAttribute("style")).toMatch(/scale/);
    unmount();
    renderDrawing(restScene(SIZES, 2));
    expect(screen.getByText("Conversation 1")).not.toHaveAttribute("style");
  });
});
