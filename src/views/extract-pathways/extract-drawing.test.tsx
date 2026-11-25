import React from "react";
import { render, screen } from "@testing-library/react";
import { fixtureLoadings, fixtureNetwork } from "../../core/network/__fixtures__/alien3-network";
import { forward } from "../../core/network/forward";
import { networkScales } from "../../core/network/network-scales";
import { signColor } from "../../core/colors";
import { MIN_GAUGE } from "../../core/network-diagram/network-drawing";
import fixture from "../../core/network/__fixtures__/alien3-messages.json";
import { collectAllPlan, collectAllSceneAt, HANDOVER_MS } from "./collect-all-timeline";
import { collectDuration, collectSceneAt } from "./collect-timeline";
import { describeScene, ExtractDrawing } from "./extract-drawing";
import { deckRestScene, ExtractScene, pathwaysRestScene, restScene } from "./extract-scene";
import { extractGeometry, minCanvasWidth } from "./extract-geometry";
import { flightDuration } from "./flight";
import { extractPathwaysSceneAt } from "./pathways-timeline";
import { pathwaysLayout } from "./pathways-layout";
import { TIP_LINES } from "./pick-targets";
import { setupSceneAt } from "./setup-timeline";

const SIZES = [10, 8, 6, 2];
const LABELS = { 0: "wait", 1: "approach" };
const passes = fixture.messages.map(c => forward(fixtureNetwork, c.text));
const scales = networkScales(fixtureNetwork, passes);
// jsdom has no ResizeObserver, so the drawing lays out at its narrowest.
const geometry = extractGeometry(SIZES, 0);

function renderDrawing(scene: ExtractScene, atRest = true) {
  return render(
    <ExtractDrawing network={fixtureNetwork} passes={passes} scales={scales} outputLabels={LABELS} scene={scene}
      headingId="panel-head" deckSize={passes.length}
      loadings={fixtureLoadings} pick={undefined} onPick={jest.fn()} atRest={atRest} />,
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
        <h2 id="panel-head">The Neural Network → Activated Pathways</h2>
        <ExtractDrawing network={fixtureNetwork} passes={passes} scales={scales} outputLabels={LABELS}
          scene={restScene(SIZES, 0)} headingId="panel-head" deckSize={passes.length}
          loadings={fixtureLoadings} pick={undefined} onPick={jest.fn()} atRest />
      </>,
    );
    const group = screen.getByRole("group", { name: "The Neural Network → Activated Pathways" });
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
    expect(svg).toHaveAttribute("height", "404");
    expect(svg).toHaveAttribute("viewBox", `0 0 ${width} 404`);
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

  it("draws a deck column for each collected message, under the last one's label", () => {
    renderDrawing(restScene(SIZES, 4));
    expect(screen.getByRole(
      "img", { name: "The network, with its 14 hidden neurons lifted out and 3 messages collected." },
    )).toBeInTheDocument();
    expect(screen.getByText("Message 3")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^deck-column-/)).toHaveLength(3);
  });

  it("draws each deck column from its own message, its gauges up or down and colored by sign", () => {
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
      "img", { name: "The network, with its 14 hidden neurons lifted out and 1 message collected." },
    )).toBeInTheDocument();
  });

  it("names one message collected in the singular", () => {
    renderDrawing(restScene(SIZES, 2));
    expect(screen.getByRole(
      "img", { name: "The network, with its 14 hidden neurons lifted out and 1 message collected." },
    )).toBeInTheDocument();
  });

  it("shows the message the scene names on the network", () => {
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

  it("bounces the message label in, and leaves it still once it lands", () => {
    const scene = restScene(SIZES, 2);
    scene.label = { n: 1, bounce: 0.2 };
    const { unmount } = renderDrawing(scene);
    expect(screen.getByText("Message 1").getAttribute("style")).toMatch(/scale/);
    unmount();
    renderDrawing(restScene(SIZES, 2));
    expect(screen.getByText("Message 1")).not.toHaveAttribute("style");
  });

  it("draws the finished deck in place of the network once Collect All is done", () => {
    renderDrawing(deckRestScene(SIZES, 20));
    expect(screen.getByRole(
      "img", { name: "The network's 14 hidden neurons lifted out, and all 20 messages collected." },
    )).toBeInTheDocument();
    expect(screen.queryByTestId("node-1-0")).not.toBeInTheDocument();
    expect(screen.getByText("20 Messages")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^deck-0-/)).toHaveLength(20);
    expect(screen.queryAllByTestId(/^deck-column-/)).toHaveLength(0);
  });

  it("describes the deck still filling by the messages collected by hand", () => {
    renderDrawing(collectAllSceneAt(SIZES, 3, 20, HANDOVER_MS + 100));
    expect(screen.getByRole(
      "img", { name: "The network, with its 14 hidden neurons lifted out and 3 messages collected." },
    )).toBeInTheDocument();
  });

  it("draws each set of a deck of 800 where it is and as faded as it is, mid-close", () => {
    // A deck of 800 repeats the fixture's 20 messages.
    const deckPasses = Array.from({ length: 800 }, (_, i) => passes[i % passes.length]);
    // Halfway through a close of 22 sets, with sets still short of their places and the newest fading in.
    const close = collectAllPlan(SIZES, 3, 800).closes[20];
    const scene = collectAllSceneAt(SIZES, 3, 800, close.start + close.duration / 2);
    render(
      <ExtractDrawing network={fixtureNetwork} passes={deckPasses} scales={scales} outputLabels={LABELS}
        scene={scene} headingId="panel-head" deckSize={800} loadings={fixtureLoadings} pick={undefined}
        onPick={jest.fn()} atRest />,
    );
    const places = scene.deck!.sets.map((_, index) => screen.getByTestId(`deck-place-${index}`))
      .map((place, index) => [index, placeOf(place).x, place.getAttribute("opacity")]);
    expect(places).toEqual(scene.deck!.sets.map((set, index) => [
      index, set.offset * geometry.deck.r + set.shift, set.opacity < 1 ? String(set.opacity) : null,
    ]));
  });

  it("fades the network and its label as a whole while Collect All hides it", () => {
    renderDrawing(collectAllSceneAt(SIZES, 3, 20, 650));
    const opacity = Number(screen.getByTestId("network").getAttribute("opacity"));
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    // eslint-disable-next-line testing-library/no-node-access -- the label's fade is on its parent group
    const labelOpacity = Number(screen.getByText("Message 3").parentElement!.getAttribute("opacity"));
    expect(labelOpacity).toBe(opacity);
  });

  it("draws the pathways beside the slid deck, and describes them, once Extract Pathways is done", () => {
    renderDrawing(pathwaysRestScene(SIZES, 20, fixtureLoadings));
    expect(screen.getByRole("img", {
      name: "The 14 hidden neurons, with their loadings on three pathways drawn from all 20 messages.",
    })).toBeInTheDocument();
    expect(screen.getAllByTestId("pathway-line")).toHaveLength(42);
    const dx = pathwaysLayout(geometry, 20, fixtureLoadings).liftedDx;
    expect(screen.getByTestId("lifted-column")).toHaveAttribute("transform", `translate(${dx},0)`);
  });

  describe("describeScene with a pick", () => {
    const scene = pathwaysRestScene(SIZES, 20, fixtureLoadings);
    const names = Array.from({ length: 14 }, (_, k) =>
      (k < 8 ? `Hidden Layer 1 Neuron ${k + 1}` : `Hidden Layer 2 Neuron ${k - 7}`));
    const detail = { names, loadings: fixtureLoadings };
    const signed = (value: number) => (value < 0 ? "" : "+") + value.toFixed(2);
    const base = "The 14 hidden neurons, with their loadings on three pathways drawn from all 20 messages.";

    it("is unchanged with no pick", () => {
      expect(describeScene(scene, 14, undefined, detail)).toBe(base);
    });

    it("lists a picked neuron's three loadings, signed", () => {
      // Not the first neuron, so the picked one's loadings and name are the ones listed.
      const l = fixtureLoadings[9];
      expect(describeScene(scene, 14, { kind: "neuron", index: 9 }, detail)).toBe(
        `${base} Hidden Layer 2 Neuron 2's loadings: Pathway 1 ${signed(l[0])}, Pathway 2 ${signed(l[1])}, `
        + `Pathway 3 ${signed(l[2])}.`);
    });

    it("lists a picked pathway's loadings on all 14 neurons", () => {
      const text = describeScene(scene, 14, { kind: "pathway", index: 1 }, detail);
      const list = fixtureLoadings.map((l, k) => `${names[k]} ${signed(l[1])}`).join(", ");
      expect(text).toBe(`${base} Pathway 2's loadings: ${list}.`);
    });

    it("speaks a negative loading with an ASCII minus", () => {
      const text = describeScene(scene, 14, { kind: "pathway", index: 1 }, detail);
      expect(fixtureLoadings.some(l => l[1] < 0)).toBe(true);
      expect(text).toMatch(/ -\d\.\d\d/);
      expect(text).not.toContain("−");
    });

    it("ignores a pick before the pathways are done", () => {
      expect(describeScene(deckRestScene(SIZES, 20), 14, { kind: "pathway", index: 1 }, detail))
        .toBe("The network's 14 hidden neurons lifted out, and all 20 messages collected.");
    });
  });

  it("keeps describing the deck while Extract Pathways runs", () => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    try {
      renderDrawing(extractPathwaysSceneAt(SIZES, 20, fixtureLoadings, 3000));
      expect(screen.getByRole(
        "img", { name: "The network's 14 hidden neurons lifted out, and all 20 messages collected." },
      )).toBeInTheDocument();
    } finally {
      jest.restoreAllMocks();
    }
  });

  it("slides the lifted column toward its place beside the pathways", () => {
    const columnX = (t: number) => {
      const { unmount } = renderDrawing(extractPathwaysSceneAt(SIZES, 20, fixtureLoadings, t));
      const column = screen.getByTestId("lifted-column");
      const x = column.hasAttribute("transform") ? placeOf(column).x : 0;
      unmount();
      return x;
    };
    const dx = pathwaysLayout(geometry, 20, fixtureLoadings).liftedDx;
    expect(columnX(400)).toBe(0);
    // The column moves left, so dx is negative; at 900 ms it is part of the way there.
    const share = columnX(900) / dx;
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(1);
  });

  it("offers the pick targets and the tip at rest after Extract Pathways, over the drawing", () => {
    renderDrawing(pathwaysRestScene(SIZES, 20, fixtureLoadings));
    const targets = screen.getByRole("group", { name: TIP_LINES.join(" ") });
    expect(screen.getAllByRole("button", { name: /, show its loadings on / })).toHaveLength(17);
    // Over the drawing's SVG, as its last layer, and the same size.
    const svg = screen.getByRole("img");
    // eslint-disable-next-line testing-library/no-node-access -- the drawing's layers, bottom to top
    const layers = [...svg.parentElement!.children];
    expect(layers.indexOf(targets)).toBe(layers.length - 1);
    expect(targets).toHaveAttribute("width", svg.getAttribute("width"));
    expect(targets).toHaveAttribute("height", svg.getAttribute("height"));
  });

  it("names the neuron targets as the lifted copies are named", () => {
    renderDrawing(pathwaysRestScene(SIZES, 20, fixtureLoadings));
    expect(screen.getByRole("button", { name: "Hidden Layer 2 Neuron 6, show its loadings on the three pathways" }))
      .toBeInTheDocument();
  });

  it("offers no pick targets while a step plays, or before the pathways are done", () => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    try {
      const { unmount } = renderDrawing(pathwaysRestScene(SIZES, 20, fixtureLoadings), false);
      expect(screen.queryByRole("group", { name: TIP_LINES.join(" ") })).not.toBeInTheDocument();
      unmount();
      const view = renderDrawing(extractPathwaysSceneAt(SIZES, 20, fixtureLoadings, 3000));
      expect(screen.queryByRole("group", { name: TIP_LINES.join(" ") })).not.toBeInTheDocument();
      view.unmount();
      renderDrawing(deckRestScene(SIZES, 20));
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    } finally {
      jest.restoreAllMocks();
    }
  });

  it("shows the particle canvas only while the particles fly", () => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    try {
      const { unmount } = renderDrawing(extractPathwaysSceneAt(SIZES, 20, fixtureLoadings, 3000));
      expect(screen.getByTestId("particles")).toBeInTheDocument();
      unmount();
      renderDrawing(pathwaysRestScene(SIZES, 20, fixtureLoadings));
      expect(screen.queryByTestId("particles")).not.toBeInTheDocument();
    } finally {
      jest.restoreAllMocks();
    }
  });
});
