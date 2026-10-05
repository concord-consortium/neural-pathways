/* eslint-disable testing-library/no-node-access -- group opacity sits on a parent <g> with no role or test id */
import React from "react";
import { render, screen } from "@testing-library/react";
import { NetworkDrawing } from "./network-drawing";
import { layoutNetwork } from "./layout";
import { fullScene, Scene } from "./scene";
import { toyNetwork } from "../network/toy-network";
import { forward } from "../network/forward";
import { networkScales } from "../network/network-scales";
import fixture from "../network/__fixtures__/toy-network-conversations.json";

const SIZES = [10, 8, 6, 2];
const LABELS = { 0: "wait", 1: "approach" };
const passes = fixture.conversations.map(c => forward(toyNetwork, c.text));
const scales = networkScales(toyNetwork, passes);
const layout = layoutNetwork(SIZES, 537, 440);

function renderDrawing(scene: Scene) {
  return render(
    <svg>
      <NetworkDrawing network={toyNetwork} layout={layout} pass={passes[0]} scales={scales} outputLabels={LABELS}
        scene={scene} />
    </svg>,
  );
}

function dimmed(rest: number, hidden: number): Scene {
  const scene = fullScene(SIZES);
  scene.dim = { rest, hidden };
  return scene;
}

describe("NetworkDrawing", () => {
  it("draws at full strength without opacity attributes", () => {
    renderDrawing(fullScene(SIZES));
    expect(screen.getByTestId("node-0-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("node-1-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("gauge-1-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("edge-near-0-0-0").closest("g")).not.toHaveAttribute("opacity");
  });

  it("dims everything but the hidden layers' nodes by dim.rest", () => {
    renderDrawing(dimmed(0.5, 1));
    expect(screen.getByTestId("node-0-0")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("node-3-0")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("gauge-3-0")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("wire-0-0-0").closest("g")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("edge-near-0-0-0").closest("g")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("pill-0").closest("g")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByText("Hidden Layer 1")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByText("WAIT").closest("g")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("node-1-0")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("node-2-5")).not.toHaveAttribute("opacity");
    expect(screen.getByTestId("gauge-1-0")).not.toHaveAttribute("opacity");
  });

  it("dims the hidden layers' nodes by dim.hidden", () => {
    renderDrawing(dimmed(0.5, 0.5));
    expect(screen.getByTestId("node-1-0")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("node-2-5")).toHaveAttribute("opacity", "0.5");
    expect(screen.getByTestId("gauge-1-0")).toHaveAttribute("opacity", "0.5");
  });
});
/* eslint-enable testing-library/no-node-access */
