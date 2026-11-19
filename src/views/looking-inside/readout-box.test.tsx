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
    let heights: Record<string, number>;
    const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");

    beforeEach(() => {
      heights = { short: 40, tall: 60 };
      (globalThis as any).ResizeObserver = class {
        constructor(callback: () => void) { resized = callback; }
        observe = jest.fn();
        disconnect = jest.fn();
      };
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
        configurable: true,
        get(this: HTMLElement) {
          return this.classList.contains("readout-box__candidate") ? heights[this.textContent ?? ""] ?? 0 : 0;
        }
      });
    });

    afterEach(() => {
      delete (globalThis as any).ResizeObserver;
      if (offsetHeight) Object.defineProperty(HTMLElement.prototype, "offsetHeight", offsetHeight);
    });

    it("holds the tallest candidate as min-height and reports it with the margin", () => {
      const onHeightChange = jest.fn();
      render((
        <ReadoutBox
          content="short" candidates={{ prompts: ["short"], readouts: ["tall"] }} idle onHeightChange={onHeightChange}
        />
      ));
      expect(screen.getByTestId("readout-box").style.minHeight).toBe("60px");
      expect(screen.getByTestId("readout-box").style.height).toBe("");
      expect(onHeightChange).toHaveBeenLastCalledWith(68);
    });

    it("measures again when the observed layout resizes", () => {
      const onHeightChange = jest.fn();
      render((
        <ReadoutBox
          content="short" candidates={{ prompts: ["short"], readouts: ["tall"] }} idle onHeightChange={onHeightChange}
        />
      ));
      heights.tall = 90;
      act(() => resized());
      expect(screen.getByTestId("readout-box").style.minHeight).toBe("90px");
      expect(onHeightChange).toHaveBeenLastCalledWith(98);
    });
  });
});
