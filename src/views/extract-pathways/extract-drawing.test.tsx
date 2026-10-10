import React from "react";
import { render, screen } from "@testing-library/react";
import { toyNetwork } from "../../core/network/toy-network";
import { forward } from "../../core/network/forward";
import { networkScales } from "../../core/network/network-scales";
import { signColor } from "../../core/colors";
import { MIN_GAUGE } from "../../core/network-diagram/network-drawing";
import fixture from "../../core/network/__fixtures__/toy-network-conversations.json";
import { collectDuration, collectSceneAt } from "./collect-timeline";
import { ExtractDrawing } from "./extract-drawing";
import { ExtractScene, restScene } from "./extract-scene";
import { extractGeometry, minCanvasWidth } from "./extract-geometry";
import { flightDuration } from "./flight";
import { setupSceneAt } from "./setup-timeline";

const SIZES = [10, 8, 6, 2];
const LABELS = { 0: "wait", 1: "approach" };
const passes = fixture.conversations.map(c => forward(toyNetwork, c.text));
const scales = networkScales(toyNetwork, passes);
// jsdom has no ResizeObserver, so the drawing lays out at its narrowest.
const geometry = extractGeometry(SIZES, 0);

function renderDrawing(scene: ExtractScene) {
  return render(
    <ExtractDrawing network={toyNetwork} passes={passes} scales={scales} outputLabels={LABELS} scene={scene}
      headingId="panel-head" />,
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

/** The scale in a copy's transform. */
function scaleOf(element: Element): number {
  return Number(/scale\(([-\d.e]+)\)/.exec(element.getAttribute("transform") ?? "")![1]);
}

interface Gauge {
  height: number;
  y: number;
  fill: string | null;
}

/** Each copy's gauge in deck column `column`, or undefined where none is drawn. */
function deckGauges(column: number): (Gauge | undefined)[] {
  // eslint-disable-next-line testing-library/no-node-access -- copies are groups with only a test id
  const copies = screen.getByTestId(`deck-column-${column}`).querySelectorAll("[data-testid^='copy-']");
  return [...copies].map(copy => {
    // eslint-disable-next-line testing-library/no-node-access -- the gauge is an unlabeled rect in a copy
    const gauge = copy.querySelector("rect");
    return gauge
      ? {
        height: Number(gauge.getAttribute("height")),
        y: Number(gauge.getAttribute("y")),
        fill: gauge.getAttribute("fill"),
      }
      : undefined;
  });
}

describe("ExtractDrawing", () => {
  // jsdom never overflows, so this is the drawing when it doesn't scroll: still a group, but not a Tab stop.
  it("is a group named by its panel's heading, and not a Tab stop while it doesn't scroll", () => {
    render(
      <>
        <h2 id="panel-head">The Network → Activated Pathways</h2>
        <ExtractDrawing network={toyNetwork} passes={passes} scales={scales} outputLabels={LABELS}
          scene={restScene(SIZES, 0)} headingId="panel-head" />
      </>,
    );
    const group = screen.getByRole("group", { name: "The Network → Activated Pathways" });
    expect(group).toContainElement(screen.getByRole("img"));
    expect(group).not.toHaveAttribute("tabindex");
  });

  it("draws only the network before Setup", () => {
    renderDrawing(restScene(SIZES, 0));
    expect(screen.getByRole("img", { name: "The network." })).toBeInTheDocument();
    expect(screen.getByTestId("node-1-0")).toBeInTheDocument();
    expect(screen.queryByTestId("lifted-column")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId(/^deck-column-/)).toHaveLength(0);
  });

  it("draws the canvas at full size, one drawing unit to a pixel, so its text zooms with the page", () => {
    renderDrawing(restScene(SIZES, 0));
    const width = String(minCanvasWidth(SIZES));
    const svg = screen.getByRole("img", { name: "The network." });
    expect(svg).toHaveAttribute("width", width);
    expect(svg).toHaveAttribute("height", "440");
    expect(svg).toHaveAttribute("viewBox", `0 0 ${width} 440`);
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

  it("draws a deck column for each collected conversation, under the last one's label", () => {
    renderDrawing(restScene(SIZES, 4));
    expect(screen.getByRole(
      "img", { name: "The network, with its 14 hidden neurons lifted out and 3 conversations collected." },
    )).toBeInTheDocument();
    expect(screen.getByText("Conversation 3")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^deck-column-/)).toHaveLength(3);
  });

  it("draws each deck column from its own conversation, its gauges up or down and colored by sign", () => {
    renderDrawing(restScene(SIZES, 3));
    [0, 1].forEach(column => {
      const values = [...passes[column].layers[1], ...passes[column].layers[2]];
      const expected = values.map(v => {
        const height = geometry.deck.r * Math.min(1, Math.abs(v));
        return height >= MIN_GAUGE ? { height, y: v >= 0 ? -height : 0, fill: signColor(v) } : undefined;
      });
      expect(deckGauges(column)).toEqual(expected);
    });
  });

  it("starts a deck copy on its hidden neuron, at the neuron's size", () => {
    const flyAt = collectDuration(SIZES, 2) - flightDuration(14);
    renderDrawing(collectSceneAt(SIZES, 2, flyAt));
    // eslint-disable-next-line testing-library/no-node-access -- copies are groups with only a test id
    const first = screen.getByTestId("deck-column-1").querySelector("[data-testid='copy-0']")!;
    expect(placeOf(first)).toEqual(geometry.hidden[0]);
    expect(scaleOf(first)).toBeCloseTo(geometry.network.radius / geometry.deck.r);
  });

  it("doesn't count a deck column still in flight as collected", () => {
    renderDrawing(collectSceneAt(SIZES, 2, collectDuration(SIZES, 2) - 1000));
    expect(screen.getAllByTestId(/^deck-column-/)).toHaveLength(2);
    expect(screen.getByRole(
      "img", { name: "The network, with its 14 hidden neurons lifted out and 1 conversation collected." },
    )).toBeInTheDocument();
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

  it("dims the lifted column's copies with its opacity, but not its label", () => {
    const scene = restScene(SIZES, 1);
    scene.lifted = { ...scene.lifted!, opacity: 0.5 };
    renderDrawing(scene);
    expect(screen.getByTestId("lifted-copies")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("lifted-column")).not.toHaveAttribute("opacity");
    expect(screen.getByText("Hidden Layer Neurons")).toHaveAttribute("opacity", "1");
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
