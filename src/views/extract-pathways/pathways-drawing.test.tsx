import React from "react";
import { render, screen } from "@testing-library/react";
import { forward } from "../../core/network/forward";
import { fixtureNetwork } from "../../core/network/__fixtures__/alien3-network";
import { NEGATIVE_COLOR, POSITIVE_COLOR } from "../../core/colors";
import fixture from "../../core/network/__fixtures__/alien3-conversations.json";
import { finishedPathways, PathwaysScene } from "./extract-scene";
import { extractGeometry } from "./extract-geometry";
import { kickScale, mixColor, ParticleCanvas, PathwaysLayer } from "./pathways-drawing";
import { pathwaysLayout } from "./pathways-layout";

const SIZES = [10, 8, 6, 2];
const geometry = extractGeometry(SIZES, 0);
const layout = pathwaysLayout(geometry, 20);
const passes = fixture.conversations.map(c => forward(fixtureNetwork, c.text));

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
