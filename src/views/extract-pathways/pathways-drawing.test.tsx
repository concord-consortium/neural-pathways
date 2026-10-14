import React from "react";
import { render, screen } from "@testing-library/react";
import { forward } from "../../core/network/forward";
import { toyNetwork } from "../../core/network/toy-network";
import { NEGATIVE_COLOR, POSITIVE_COLOR, signColor } from "../../core/colors";
import fixture from "../../core/network/__fixtures__/toy-network-conversations.json";
import { finishedPathways, PathwaysScene } from "./extract-scene";
import { extractGeometry } from "./extract-geometry";
import { kickScale, mixColor, ParticleCanvas, PathwaysLayer } from "./pathways-drawing";
import { BOX_SIDE, pathwaysLayout } from "./pathways-layout";
import { COPY_END_SCALE } from "./pathways-timeline";

const SIZES = [10, 8, 6, 2];
const geometry = extractGeometry(SIZES, 0);
const layout = pathwaysLayout(geometry, 20);
const passes = fixture.conversations.map(c => forward(toyNetwork, c.text));

const drawLayer = (pathways: PathwaysScene) =>
  render(<svg><PathwaysLayer pathways={pathways} layout={layout} /></svg>);

describe("mixColor", () => {
  it("mixes two colors, landing exactly on each", () => {
    expect(mixColor(POSITIVE_COLOR, "#CCD3DD", 0)).toBe(POSITIVE_COLOR);
    expect(mixColor(POSITIVE_COLOR, "#CCD3DD", 1)).toBe("#CCD3DD");
    expect(mixColor("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });
});

describe("kickScale", () => {
  it("swells to 1.10, dips to 0.98 and settles at 1", () => {
    expect(kickScale(0)).toBe(1);
    expect(kickScale(0.38)).toBeCloseTo(1.1);
    expect(kickScale(0.7)).toBeCloseTo(0.98);
    expect(kickScale(1)).toBe(1);
  });
});

describe("PathwaysLayer", () => {
  it("draws nothing before the particles start", () => {
    drawLayer({ ...finishedPathways(), bars: undefined });
    expect(screen.queryByTestId("pathways")).not.toBeInTheDocument();
  });

  it("draws the finished pathways: 42 bars in their loadings' colors, three labeled boxes and 42 lines", () => {
    drawLayer(finishedPathways());
    const bars = screen.getAllByTestId("loading-bar");
    expect(bars).toHaveLength(42);
    expect(bars[0]).toHaveAttribute("fill", POSITIVE_COLOR);
    expect(bars[0]).toHaveAttribute("width", String(layout.bars[0].length));
    expect(bars[1]).toHaveAttribute("fill", NEGATIVE_COLOR);
    expect(screen.getAllByTestId("pathway-line")).toHaveLength(42);
    ["Pathway 1", "Pathway 2", "Pathway 3"].forEach(label => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it("fades the lines and the boxes in, kicks a box, and draws each neuron's zero rule", () => {
    const pathways = finishedPathways();
    pathways.lines = 0.5;
    pathways.boxes[1] = { opacity: 0.5, kick: 0.38 };
    drawLayer(pathways);
    expect(screen.getByTestId("pathway-lines")).toHaveAttribute("opacity", "0.5");
    const boxes = screen.getAllByTestId("pathway-box");
    expect(boxes[0]).not.toHaveAttribute("opacity");
    expect(boxes[1]).toHaveAttribute("opacity", "0.5");
    // eslint-disable-next-line testing-library/no-node-access -- the kick scales the box's square
    const square = boxes[1].querySelector("rect")!;
    expect(Number(square.style.transform.match(/scale\(([\d.]+)\)/)![1])).toBeCloseTo(1.1);
    const rules = screen.getAllByTestId("zero-rule").map(rule => [rule.getAttribute("x1"), rule.getAttribute("y1")]);
    expect(rules).toEqual(layout.rules.map(rule => [String(rule.x), String(rule.y1)]));
    expect(rules).toHaveLength(14);
  });

  it("grows a bar from zero toward its sign, and grays it while it is muted", () => {
    const pathways = finishedPathways();
    pathways.bars![1] = { grown: 0.5, muted: 1 };
    drawLayer(pathways);
    const bar = screen.getAllByTestId("loading-bar")[1];
    const length = layout.bars[1].length / 2;
    expect(Number(bar.getAttribute("width"))).toBeCloseTo(length);
    expect(Number(bar.getAttribute("x"))).toBeCloseTo(layout.bars[1].zero - length);
    expect(bar).toHaveAttribute("fill", "#CCD3DD");
  });

  it("draws a pathway's copies while they fly", () => {
    drawLayer({
      ...finishedPathways(),
      flying: { pathway: 0, copies: Array.from({ length: 14 }, () => ({ progress: 0.5, opacity: 1 })) },
    });
    expect(screen.getAllByTestId("bar-copy")).toHaveLength(14);
  });

  it("runs each bar's line to its own pathway's box", () => {
    drawLayer(finishedPathways());
    const ends = screen.getAllByTestId("pathway-line")
      .map((line, b) => [b, Number(line.getAttribute("x2")), Number(line.getAttribute("y2"))]);
    expect(ends).toEqual(layout.bars.map((bar, b) => [b, layout.boxes[bar.pathway].x, layout.boxes[bar.pathway].cy]));
    expect(layout.bars.map(bar => bar.pathway)).toEqual(layout.bars.map((_, b) => b % 3));
  });

  it("flies copies of the flying pathway's bars, in their colors, to the middle of its box", () => {
    const copies = Array.from({ length: 14 }, () => ({ progress: 1, opacity: 1 }));
    copies[13] = { progress: 1, opacity: 0 };
    drawLayer({ ...finishedPathways(), flying: { pathway: 1, copies } });
    const drawn = screen.getAllByTestId("bar-copy");
    expect(drawn).toHaveLength(13);
    const box = layout.boxes[1];
    drawn.forEach((copy, neuron) => {
      const bar = layout.bars[neuron * 3 + 1];
      const middle = bar.zero + (bar.loading >= 0 ? bar.length / 2 : -bar.length / 2);
      expect([neuron, Number(copy.getAttribute("x")), copy.getAttribute("fill")])
        .toEqual([neuron, middle - bar.length / 2, signColor(bar.loading)]);
      const [dx, dy, scale] = copy.style.transform.match(/-?[\d.]+/g)!.map(Number);
      expect(dx).toBeCloseTo(box.x + BOX_SIDE / 2 - middle);
      expect(dy).toBeCloseTo(box.cy - bar.y);
      expect(scale).toBeCloseTo(COPY_END_SCALE);
    });
  });

  it("flies the bar copies over the boxes, so each still shows as it lands", () => {
    drawLayer({
      ...finishedPathways(),
      flying: { pathway: 0, copies: Array.from({ length: 14 }, () => ({ progress: 1, opacity: 0.5 })) },
    });
    const box = screen.getByText("Pathway 1");
    const copy = screen.getAllByTestId("bar-copy")[0];
    expect(box.compareDocumentPosition(copy)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(copy).toHaveAttribute("opacity", "0.5");
  });
});

describe("ParticleCanvas", () => {
  afterEach(() => jest.restoreAllMocks());

  it("paints the particles in flight, hidden from screen readers", () => {
    const context = {
      setTransform: jest.fn(), clearRect: jest.fn(), beginPath: jest.fn(), arc: jest.fn(), fill: jest.fn(),
      globalAlpha: 1, fillStyle: "",
    };
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as any);
    render(<ParticleCanvas t={2000} geometry={geometry} passes={passes} size={20} layout={layout} />);
    expect(screen.getByTestId("particles")).toHaveAttribute("aria-hidden", "true");
    expect(context.clearRect).toHaveBeenCalled();
    expect(context.arc.mock.calls.length).toBeGreaterThan(0);
  });

  it("draws nothing, without failing, where there is no 2D context", () => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<ParticleCanvas t={2000} geometry={geometry} passes={passes} size={20} layout={layout} />);
    expect(screen.getByTestId("particles")).toBeInTheDocument();
  });
});
