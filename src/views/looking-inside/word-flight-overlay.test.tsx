import React from "react";
import { render, screen } from "@testing-library/react";
import { landingTime, step1Duration } from "./word-flights";
import { WordFlightOverlay } from "./word-flight-overlay";

const WORDS = ["wait", "for", "me"];
const INPUTS = 10;

/**
 * A container holding the card's words and the input layer's outlines, each with a rect from its
 * position. Also the input neurons' buttons, which carry the same data attributes as the outlines,
 * far to the right. They come first, so an overlay that took them for outlines would aim at them.
 */
function makeContainer(): HTMLElement {
  const container = document.createElement("div");
  for (let unit = 0; unit < INPUTS; unit++) {
    const button = document.createElement("div");
    button.setAttribute("role", "button");
    button.dataset.column = "0";
    button.dataset.unit = String(unit);
    button.dataset.rect = `900,${20 + unit * 20}`;
    container.appendChild(button);
  }
  WORDS.forEach((word, i) => {
    const span = document.createElement("span");
    span.className = "message-words__word";
    span.textContent = word;
    span.dataset.rect = `${10 + i * 30},10`;
    container.appendChild(span);
  });
  for (let unit = 0; unit < INPUTS; unit++) {
    const circle = document.createElement("div");
    circle.className = "network-diagram__node";
    circle.dataset.column = "0";
    circle.dataset.unit = String(unit);
    circle.dataset.rect = `300,${20 + unit * 20}`;
    container.appendChild(circle);
  }
  return container;
}

/** Whether the stubbed ResizeObserver reports when it starts observing, as the browser's does. */
let reportsOnObserve = true;

describe("WordFlightOverlay", () => {
  const original = Element.prototype.getBoundingClientRect;
  beforeAll(() => {
    // Like the browser's, it reports once when it starts observing. The layout never resizes after.
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: class {
        constructor(private readonly callback: () => void) {}
        observe() { if (reportsOnObserve) { this.callback(); } }
        disconnect() { /* nothing */ }
      },
    });
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const [x, y] = ((this as HTMLElement).dataset.rect ?? "0,0").split(",").map(Number);
      return { left: x - 5, top: y - 5, width: 10, height: 10 } as DOMRect;
    };
  });
  afterEach(() => {
    reportsOnObserve = true;
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

  it("draws each chip in flight with its word, hidden from assistive technology", () => {
    const drawn = chips(0);
    expect(drawn.map(chip => chip.textContent).sort()).toEqual([...WORDS].sort());
    expect(screen.getByTestId("word-flight-overlay")).toHaveAttribute("aria-hidden", "true");
  });

  it("aims at the input neurons' outlines, not at other elements with their data attributes", () => {
    // Just before the first chip lands on the first input, it is all but there.
    const drawn = chips(landingTime(0, 0, WORDS.length) - 1);
    const x = parseFloat(drawn[0].style.left);
    expect(Math.abs(x - 305)).toBeLessThan(20);
  });

  it("draws nothing once Step 1 is over", () => {
    expect(chips(step1Duration(INPUTS))).toHaveLength(0);
  });

  it("draws nothing of an earlier run before the new run has measured", () => {
    const { rerender } = render(<WordFlightOverlay time={0} words={WORDS} container={makeContainer()} />);
    expect(screen.queryAllByText(/./)).toHaveLength(WORDS.length);
    rerender(<WordFlightOverlay time={undefined} words={WORDS} container={makeContainer()} />);
    // The new run's observer hasn't reported yet.
    reportsOnObserve = false;
    rerender(<WordFlightOverlay time={0} words={["only"]} container={makeContainer()} />);
    expect(screen.queryAllByText(/./)).toHaveLength(0);
  });
});
