import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ReadoutBox } from "./readout-box";

const none = { prompts: [], readouts: [] };

describe("ReadoutBox", () => {
  it("shows the content in a polite live region", () => {
    render(<ReadoutBox content="Hello" candidates={{ prompts: ["Hello"], readouts: [] }} idle={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Hello");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("is empty when there is no content", () => {
    render(<ReadoutBox content={undefined} candidates={none} idle />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("is italic when idle and not otherwise", () => {
    const { rerender } = render(<ReadoutBox content="x" candidates={none} idle />);
    expect(screen.getByTestId("readout-box")).toHaveClass("readout-box--idle");
    rerender(<ReadoutBox content="x" candidates={none} idle={false} />);
    expect(screen.getByTestId("readout-box")).not.toHaveClass("readout-box--idle");
  });

  it("has a Clear button only when given onClear, and it calls it", () => {
    const onClear = jest.fn();
    const { rerender } = render(<ReadoutBox content="x" candidates={none} idle={false} />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    rerender(<ReadoutBox content="x" candidates={none} idle={false} onClear={onClear} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("renders every candidate in a hidden twin", () => {
    render(<ReadoutBox content="a" candidates={{ prompts: ["one", "two"], readouts: ["three"] }} idle />);
    const twin = screen.getByTestId("readout-measure");
    expect(twin).toHaveAttribute("aria-hidden", "true");
    expect(within(twin).getAllByText(/one|two|three/)).toHaveLength(3);
    expect(twin).toHaveTextContent("onetwothree");
  });

  it("measures prompts in the idle style they are shown in, and readouts upright", () => {
    render(<ReadoutBox content="a" candidates={{ prompts: ["p"], readouts: ["r"] }} idle />);
    const [prompt, readout] = screen.getAllByTestId("readout-candidate");
    expect(prompt).toHaveTextContent("p");
    expect(prompt).toHaveClass("readout-box__candidate--idle");
    expect(readout).toHaveTextContent("r");
    expect(readout).not.toHaveClass("readout-box__candidate--idle");
  });

  it("leaves room for the Clear button only in readout candidates", () => {
    const { rerender } = render(<ReadoutBox content="a" candidates={{ prompts: ["p", "q"], readouts: [] }} idle />);
    expect(screen.queryAllByTestId("readout-stand-in")).toHaveLength(0);
    rerender(<ReadoutBox content="a" candidates={{ prompts: ["p", "q"], readouts: ["r"] }} idle />);
    expect(screen.getAllByTestId("readout-stand-in")).toHaveLength(1);
  });

  describe("measuring", () => {
    let resized: () => void;
    let observed: Element[];
    let heights: Record<string, number>;
    let disconnect: jest.Mock;
    const getBoundingClientRect = Element.prototype.getBoundingClientRect;

    beforeEach(() => {
      heights = { short: 40, tall: 60 };
      observed = [];
      disconnect = jest.fn();
      (globalThis as any).ResizeObserver = class {
        constructor(callback: () => void) { resized = callback; }
        observe = (element: Element) => observed.push(element);
        disconnect = disconnect;
      };
      Element.prototype.getBoundingClientRect = function (this: Element) {
        const height = this.classList.contains("readout-box__candidate") ? heights[this.textContent ?? ""] ?? 0 : 0;
        return { height } as DOMRect;
      };
    });

    afterEach(() => {
      delete (globalThis as any).ResizeObserver;
      Element.prototype.getBoundingClientRect = getBoundingClientRect;
    });

    it("holds the tallest candidate as min-height", () => {
      render(<ReadoutBox content="short" candidates={{ prompts: ["short"], readouts: ["tall"] }} idle />);
      expect(screen.getByTestId("readout-box").style.minHeight).toBe("60px");
      expect(screen.getByTestId("readout-box").style.height).toBe("");
    });

    it("rounds a fractional height up, so the text never grows the box", () => {
      heights.tall = 75.4;
      render(<ReadoutBox content="short" candidates={{ prompts: ["short"], readouts: ["tall"] }} idle />);
      expect(screen.getByTestId("readout-box").style.minHeight).toBe("76px");
    });

    it("measures the new candidates when they change", () => {
      heights.taller = 80;
      const { rerender } = render(
        <ReadoutBox content="short" candidates={{ prompts: ["short"], readouts: ["tall"] }} idle />);
      rerender(<ReadoutBox content="short" candidates={{ prompts: ["short"], readouts: ["taller"] }} idle />);
      expect(screen.getByTestId("readout-box").style.minHeight).toBe("80px");
    });

    it("stops observing when it unmounts", () => {
      const { unmount } = render(
        <ReadoutBox content="short" candidates={{ prompts: ["short"], readouts: ["tall"] }} idle />);
      expect(disconnect).not.toHaveBeenCalled();
      unmount();
      expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it("measures again when the observed layout resizes", () => {
      render(<ReadoutBox content="short" candidates={{ prompts: ["short"], readouts: ["tall"] }} idle />);
      heights.tall = 90;
      act(() => resized());
      expect(screen.getByTestId("readout-box").style.minHeight).toBe("90px");
    });

    it("observes the box, whose width zoom changes, and the candidates' stack, which text zoom grows", () => {
      render(<ReadoutBox content="short" candidates={{ prompts: ["short"], readouts: ["tall"] }} idle />);
      const stack = screen.getByTestId("readout-measure-stack");
      expect(within(stack).getAllByTestId("readout-candidate")).toHaveLength(2);
      expect(observed).toEqual(expect.arrayContaining([screen.getByTestId("readout-box"), stack]));
      // Not the twin, whose height is held at 0 so that the stack adds nothing to the page: it never
      // resizes.
      expect(observed).not.toContain(screen.getByTestId("readout-measure"));
    });
  });
});
