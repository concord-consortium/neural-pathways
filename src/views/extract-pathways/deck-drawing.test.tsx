import React from "react";
import { render, screen, within } from "@testing-library/react";
import { forward } from "../../core/network/forward";
import { toyNetwork } from "../../core/network/toy-network";
import fixture from "../../core/network/__fixtures__/toy-network-conversations.json";
import * as deckLayout from "./deck-layout";
import { bottomHalf, DeckStack, diagonalHalf, faceOf, shading } from "./deck-drawing";
import { extractGeometry } from "./extract-geometry";
import { deckStack, StackScene } from "./extract-scene";

const SIZES = [10, 8, 6, 2];
const fixturePasses = fixture.conversations.map(c => forward(toyNetwork, c.text));
// The fixture has 20 conversations; a deck of more repeats them, which only these tests need.
const passes = Array.from({ length: 800 }, (_, i) => fixturePasses[i % fixturePasses.length]);
const geometry = extractGeometry(SIZES, 0);
const names = Array.from({ length: 14 }, (_, k) => `Neuron ${k + 1}`);

function drawStack(stack: StackScene) {
  return <svg><DeckStack stack={stack} geometry={geometry} passes={passes} names={names} clipPrefix="clip" /></svg>;
}

describe("faceOf", () => {
  it("finds the right face in set 0, the front face in each set's last column, and their corner", () => {
    expect(faceOf(0, 0)).toBe("right");
    expect(faceOf(0, 19)).toBe("corner");
    expect(faceOf(3, 19)).toBe("front");
    expect(faceOf(3, 0)).toBe("inside");
  });
});

describe("shading", () => {
  it("shades nothing at level 0, or inside the deck", () => {
    expect(shading("right", 0)).toEqual({});
    expect(shading("inside", 10)).toEqual({});
  });

  it("darkens the right face twice as much as the front face, with the top circle cut its own way", () => {
    const right = shading("right", 10);
    expect(right.body).toBeCloseTo(0.95);
    expect(right.top).toMatchObject({ shape: diagonalHalf });
    expect(right.top!.opacity).toBeCloseTo(0.05);
    const front = shading("front", 10);
    expect(front.body).toBeCloseTo(0.975);
    expect(front.top).toMatchObject({ shape: bottomHalf });
    expect(front.top!.opacity).toBeCloseTo(0.025);
  });

  it("lands the corner's right half on the right face's value", () => {
    const corner = shading("corner", 39);
    expect(corner.body! * (1 - corner.cornerBody!)).toBeCloseTo(shading("right", 39).body!);
    expect(corner.cornerTop).toBeCloseTo(shading("right", 39).top!.opacity);
  });

  it("stops deepening at level 40", () => {
    expect(shading("right", 45)).toEqual(shading("right", 40));
  });
});

describe("DeckStack", () => {
  it("draws every set, back to front, so set 0 stands in front", () => {
    render(drawStack(deckStack(60)));
    expect(screen.getAllByTestId(/^deck-set-/).map(set => set.dataset.testid))
      .toEqual(["deck-set-2", "deck-set-1", "deck-set-0"]);
    expect(within(screen.getByTestId("deck-set-0")).getAllByTestId(/^deck-0-/)).toHaveLength(20);
  });

  it("names set 0's neurons, and leaves later sets unnamed", () => {
    render(drawStack(deckStack(40)));
    // eslint-disable-next-line testing-library/no-node-access -- a gauge's name is its <title> child
    expect(screen.getByTestId("deck-set-0").querySelectorAll("title")).toHaveLength(20 * 14);
    // eslint-disable-next-line testing-library/no-node-access -- a gauge's name is its <title> child
    expect(screen.getByTestId("deck-set-1").querySelectorAll("title")).toHaveLength(0);
  });

  it("labels a column of set 0 and counts the deck", () => {
    render(drawStack({ ...deckStack(40), labels: [{ column: 4, opacity: 1 }] }));
    expect(screen.getByText("Conversation 5")).toBeInTheDocument();
    expect(screen.getByText("40 Conversations")).toBeInTheDocument();
  });

  it("slides an arriving column in at its opacity", () => {
    const stack = { ...deckStack(5), arriving: [{ column: 5, dx: -8, opacity: 0.5 }] };
    render(drawStack(stack));
    const column = screen.getByTestId("deck-0-5");
    expect(column).toHaveAttribute("opacity", "0.5");
    expect(column.getAttribute("transform")).toBe(`translate(${-8 - 5 * geometry.deck.r},${5 * geometry.deck.r})`);
  });

  it("doesn't redraw a set's columns when only its place changes", () => {
    const stack = deckStack(60);
    const { rerender } = render(drawStack(stack));
    const reads = jest.spyOn(deckLayout, "columnValues");
    try {
      const moved = stack.sets.map(set => ({ ...set, offset: set.offset + 1 }));
      rerender(drawStack({ ...stack, centered: 0.5, sets: moved }));
      expect(reads).not.toHaveBeenCalled();
    } finally {
      reads.mockRestore();
    }
  });
});
