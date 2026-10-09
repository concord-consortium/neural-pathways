import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useKeyboardScrollable } from "./use-keyboard-scrollable";

const Scroller: React.FC = () => {
  const [ref, props] = useKeyboardScrollable<HTMLDivElement>({ role: "region", "aria-label": "Notes" });
  return <div ref={ref} data-testid="scroller" {...props}><p>Some notes</p></div>;
};

const scroller = () => screen.getByTestId("scroller");

/** Gives the scroller a content width and a visible width, as layout would. */
function setWidths(content: number, visible: number) {
  Object.defineProperty(scroller(), "scrollWidth", { configurable: true, value: content });
  Object.defineProperty(scroller(), "clientWidth", { configurable: true, value: visible });
}

describe("useKeyboardScrollable", () => {
  it("is never a Tab stop where ResizeObserver is missing", () => {
    render(<Scroller />);
    expect(scroller()).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  describe("with ResizeObserver", () => {
    let resized: () => void;
    const observeMock = jest.fn();
    const disconnectMock = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      (globalThis as any).ResizeObserver = class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe = observeMock;
        disconnect = disconnectMock;
      };
    });

    afterEach(() => {
      delete (globalThis as any).ResizeObserver;
    });

    it("watches the element and its content", () => {
      render(<Scroller />);
      expect(observeMock).toHaveBeenCalledWith(scroller());
      // eslint-disable-next-line testing-library/no-node-access -- the content is a plain paragraph
      expect(observeMock).toHaveBeenCalledWith(scroller().firstElementChild);
    });

    it("is a named Tab stop only while its content overflows", () => {
      render(<Scroller />);
      setWidths(300, 300);
      act(() => resized());
      expect(scroller()).not.toHaveAttribute("tabindex");
      setWidths(600, 300);
      act(() => resized());
      expect(screen.getByRole("region", { name: "Notes" })).toHaveAttribute("tabindex", "0");
      setWidths(300, 300);
      act(() => resized());
      expect(scroller()).not.toHaveAttribute("tabindex");
      expect(screen.queryByRole("region")).not.toBeInTheDocument();
    });

    it("stays a Tab stop while it has the focus, after it stops overflowing", () => {
      render(<Scroller />);
      setWidths(600, 300);
      act(() => resized());
      act(() => scroller().focus());
      setWidths(300, 300);
      act(() => resized());
      expect(screen.getByRole("region", { name: "Notes" })).toHaveFocus();
      expect(scroller()).toHaveAttribute("tabindex", "0");
      fireEvent.blur(scroller());
      expect(scroller()).not.toHaveAttribute("tabindex");
    });

    it("stops watching on unmount", () => {
      const { unmount } = render(<Scroller />);
      unmount();
      expect(disconnectMock).toHaveBeenCalled();
    });
  });
});
