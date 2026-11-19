import React from "react";
import { render, screen } from "@testing-library/react";
import { step1Duration } from "./word-flights";
import { WordFlightOverlay } from "./word-flight-overlay";

const WORDS = ["wait", "for", "me"];
const INPUTS = 10;

/** A container holding the card's words and the input layer's outlines, each with a rect from its position. */
function makeContainer(): HTMLElement {
  const container = document.createElement("div");
  WORDS.forEach((word, i) => {
    const span = document.createElement("span");
    span.className = "message-words__word";
    span.textContent = word;
    span.dataset.rect = `${10 + i * 30},10`;
    container.appendChild(span);
  });
  for (let unit = 0; unit < INPUTS; unit++) {
    const circle = document.createElement("div");
    circle.dataset.column = "0";
    circle.dataset.unit = String(unit);
    circle.dataset.rect = `300,${20 + unit * 20}`;
    container.appendChild(circle);
  }
  return container;
}

describe("WordFlightOverlay", () => {
  const original = Element.prototype.getBoundingClientRect;
  beforeAll(() => {
    // Like the browser's, it reports once when it starts observing. The layout never resizes after.
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: class {
        constructor(private readonly callback: () => void) {}
        observe() { this.callback(); }
        disconnect() { /* nothing */ }
      },
    });
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const [x, y] = ((this as HTMLElement).dataset.rect ?? "0,0").split(",").map(Number);
      return { left: x - 5, top: y - 5, width: 10, height: 10 } as DOMRect;
    };
  });
  afterAll(() => {
    Element.prototype.getBoundingClientRect = original;
  });

  /** The chips drawn at `time`. The measured container is kept out of the document, so only chips have text. */
  function chips(time: number | undefined): HTMLElement[] {
    render(<WordFlightOverlay time={time} words={WORDS} container={makeContainer()} />);
    return screen.queryAllByText(/./);
  }

  it("draws nothing at rest", () => {
    expect(chips(undefined)).toHaveLength(0);
  });

  it("draws each copy in flight with its word, hidden from assistive technology", () => {
    const drawn = chips(0);
    expect(drawn.map(chip => chip.textContent).sort()).toEqual([...WORDS].sort());
    expect(screen.getByTestId("word-flight-overlay")).toHaveAttribute("aria-hidden", "true");
  });

  it("draws nothing once Step 1 is over", () => {
    expect(chips(step1Duration(INPUTS))).toHaveLength(0);
  });
});
