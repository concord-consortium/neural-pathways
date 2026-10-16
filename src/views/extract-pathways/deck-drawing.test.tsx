import React from "react";
import { render, screen, within } from "@testing-library/react";
import { forward } from "../../core/network/forward";
import { fixtureNetwork } from "../../core/network/__fixtures__/alien3-network";
import fixture from "../../core/network/__fixtures__/alien3-conversations.json";
import * as deckLayout from "./deck-layout";
import { bottomHalf, DeckDrawing, diagonalHalf, faceOf, shading } from "./deck-drawing";
import { extractGeometry } from "./extract-geometry";
import { DeckScene, finishedDeck } from "./extract-scene";

const SIZES = [10, 8, 6, 2];
const fixturePasses = fixture.conversations.map(c => forward(fixtureNetwork, c.text));
// The fixture has 20 conversations; a deck of more repeats them, which only these tests need.
const passes = Array.from({ length: 800 }, (_, i) => fixturePasses[i % fixturePasses.length]);
const geometry = extractGeometry(SIZES, 0);
const names = Array.from({ length: 14 }, (_, k) => `Neuron ${k + 1}`);

function drawDeck(deck: DeckScene, size = deck.collected) {
  return (
    <svg>
      <DeckDrawing deck={deck} geometry={geometry} passes={passes} names={names} clipPrefix="clip" size={size} />
    </svg>
  );
}

describe("faceOf", () => {
  it("finds the right face in set 0, the front face in each set's last column, and their corner", () => {
    expect(faceOf(0, 0, 20)).toBe("right");
    expect(faceOf(0, 19, 20)).toBe("corner");
    expect(faceOf(3, 19, 20)).toBe("front");
    expect(faceOf(3, 0, 20)).toBe("inside");
  });

  it("puts a short last set's last column on the front face only where the set in front leaves it showing", () => {
    expect(faceOf(1, 18, 19)).toBe("front");
    expect(faceOf(1, 9, 10)).toBe("inside");
    expect(faceOf(0, 6, 7)).toBe("corner");
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

describe("DeckDrawing", () => {
  it("draws every set, back to front, so set 0 stands in front", () => {
    render(drawDeck(finishedDeck(60)));
    expect(screen.getAllByTestId(/^deck-set-/).map(set => set.dataset.testid))
      .toEqual(["deck-set-2", "deck-set-1", "deck-set-0"]);
    expect(within(screen.getByTestId("deck-set-0")).getAllByTestId(/^deck-0-/)).toHaveLength(20);
  });

  it("names set 0's neurons, and leaves later sets unnamed", () => {
    render(drawDeck(finishedDeck(40)));
    // eslint-disable-next-line testing-library/no-node-access -- a gauge's name is its <title> child
    expect(screen.getByTestId("deck-set-0").querySelectorAll("title")).toHaveLength(20 * 14);
    // eslint-disable-next-line testing-library/no-node-access -- a gauge's name is its <title> child
    expect(screen.getByTestId("deck-set-1").querySelectorAll("title")).toHaveLength(0);
  });

  it("labels a column of set 0 and counts the deck", () => {
    render(drawDeck({ ...finishedDeck(40), labels: [{ column: 4, opacity: 1 }] }));
    expect(screen.getByText("Conversation 5")).toBeInTheDocument();
    expect(screen.getByText("40 Conversations")).toBeInTheDocument();
  });

  it("slides an arriving column in at its opacity", () => {
    const deck = { ...finishedDeck(5), arriving: [{ column: 5, dx: -8, opacity: 0.5 }] };
    render(drawDeck(deck));
    const column = screen.getByTestId("deck-0-5");
    expect(column).toHaveAttribute("opacity", "0.5");
    expect(column.getAttribute("transform")).toBe(`translate(${-8 - 5 * geometry.deck.r},${5 * geometry.deck.r})`);
  });

  it("moves the deck toward the room's middle, and places and fades each set as its scene says", () => {
    const full = finishedDeck(40);
    const sets = full.sets.map((set, i) => (i === 1 ? { ...set, shift: -8, opacity: 0.5 } : set));
    render(drawDeck({ ...full, centered: 0.5, sets }));
    expect(screen.getByTestId("deck"))
      .toHaveAttribute("transform", `translate(${0.5 * deckLayout.centerShift(geometry)},0)`);
    const place = screen.getByTestId("deck-place-1");
    expect(place).toHaveAttribute("transform", `translate(${deckLayout.setOffset(1, 40) * geometry.deck.r - 8},0)`);
    expect(place).toHaveAttribute("opacity", "0.5");
  });

  it("doesn't redraw a set's columns when only its place changes", () => {
    const deck = finishedDeck(60);
    const { rerender } = render(drawDeck(deck));
    const reads = jest.spyOn(deckLayout, "columnValues");
    try {
      const moved = deck.sets.map(set => ({ ...set, offset: set.offset + 1 }));
      rerender(drawDeck({ ...deck, centered: 0.5, sets: moved }));
      expect(reads).not.toHaveBeenCalled();
    } finally {
      reads.mockRestore();
    }
  });

  it("redraws only the face columns when the shade changes", () => {
    const deck = finishedDeck(60);
    const { rerender } = render(drawDeck(deck));
    const reads = jest.spyOn(deckLayout, "columnValues");
    try {
      rerender(drawDeck({ ...deck, shade: deck.shade + 1 }));
      // Set 0's 20 columns, and the last column of sets 1 and 2.
      expect(reads).toHaveBeenCalledTimes(22);
    } finally {
      reads.mockRestore();
    }
  });

  it.each([[59, 22], [50, 21]])("shades a short last set's last column only if it shows, in %p", (size, faces) => {
    const deck = finishedDeck(size);
    const { rerender } = render(drawDeck(deck));
    const reads = jest.spyOn(deckLayout, "columnValues");
    try {
      rerender(drawDeck({ ...deck, shade: deck.shade + 1 }));
      // Set 0's 20 columns and set 1's last; set 2's last of 19 shows, and its last of 10 is hidden.
      expect(reads).toHaveBeenCalledTimes(faces);
    } finally {
      reads.mockRestore();
    }
  });

  it("finds a set's front face by the columns it will hold, not those in so far", () => {
    const full = finishedDeck(40);
    render(drawDeck({ ...full, sets: full.sets.map((set, i) => (i === 1 ? { ...set, columns: 15 } : set)) }));
    // eslint-disable-next-line testing-library/no-node-access -- the shading is a filter on the column's lower rows
    expect(screen.getByTestId("deck-1-14").querySelector("g")).not.toHaveAttribute("style");
  });
});
