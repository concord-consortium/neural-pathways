import React from "react";
import { act, render, screen } from "@testing-library/react";
import { useElementSize } from "./use-element-size";

const Probe: React.FC = () => {
  const [ref, size] = useElementSize<HTMLDivElement>({ width: 10, height: 20 });
  return <div ref={ref}>{`${size.width}x${size.height}`}</div>;
};

describe("useElementSize", () => {
  it("uses the fallback where ResizeObserver is missing", () => {
    render(<Probe />);
    expect(screen.getByText("10x20")).toBeInTheDocument();
  });

  describe("with ResizeObserver", () => {
    let report: (entries: { contentRect: { width: number; height: number } }[]) => void;
    const observeMock = jest.fn();
    const disconnectMock = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      (globalThis as any).ResizeObserver = class {
        constructor(callback: typeof report) {
          report = callback;
        }
        observe = observeMock;
        disconnect = disconnectMock;
      };
    });

    afterEach(() => {
      delete (globalThis as any).ResizeObserver;
      jest.clearAllMocks();
    });

    it("follows the element's size", () => {
      render(<Probe />);
      expect(observeMock).toHaveBeenCalledTimes(1);
      act(() => report([{ contentRect: { width: 300, height: 200 } }]));
      expect(screen.getByText("300x200")).toBeInTheDocument();
    });

    it("stops observing on unmount", () => {
      const { unmount } = render(<Probe />);
      unmount();
      expect(disconnectMock).toHaveBeenCalledTimes(1);
    });
  });
});
