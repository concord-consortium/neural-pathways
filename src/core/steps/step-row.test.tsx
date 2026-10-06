import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { action, makeObservable, observable } from "mobx";
import { StepButton } from "./step-buttons";
import { Marker, StepPlayer, StepProgress, StepTimeline } from "./step-player";
import { StepRow } from "./step-row";

const timeline: StepTimeline<number> = {
  duration: ({ from, to }) => (to - from) * 1000,
  sceneAt: marker => marker,
};

class Progress implements StepProgress {
  marker = 0;

  constructor(marker = 0) {
    this.marker = marker;
    makeObservable(this, { marker: observable, setMarker: action });
  }

  setMarker(marker: Marker) {
    this.marker = marker;
  }
}

/** One: always from 0 to 1, pressed at 1. Next: on one marker, up to 3. Later: always disabled. */
const BUTTONS: StepButton[] = [
  {
    key: "one",
    label: "One",
    segmentToPlayWhenAt: () => ({ from: 0, to: 1 }),
    showAsPressedWhenAt: marker => marker === 1,
  },
  {
    key: "next",
    label: "Next",
    segmentToPlayWhenAt: marker => (marker < 3 ? { from: marker, to: marker + 1 } : undefined),
  },
  { key: "later", label: "Later", segmentToPlayWhenAt: () => undefined },
];

function showRow(marker = 0, buttons = BUTTONS) {
  const player = new StepPlayer(timeline, new Progress(marker));
  render(<StepRow player={player} buttons={buttons} />);
  return player;
}

const button = (name: string) => screen.getByRole("button", { name });

describe("StepRow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true, writable: true, value: jest.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (window as any).matchMedia;
  });

  it("shows the buttons in order, then Reset, in a group named Steps", () => {
    showRow();
    const group = screen.getByRole("group", { name: "Steps" });
    // eslint-disable-next-line testing-library/no-node-access -- need to verify order
    expect(Array.from(group.querySelectorAll("button")).map(b => b.textContent))
      .toEqual(["One", "Next", "Later", "Reset"]);
  });

  it("disables a button with no segment, and makes Reset unavailable at the start", () => {
    showRow();
    expect(button("Later")).toBeDisabled();
    expect(button("Next")).toBeEnabled();
    expect(button("Reset")).toHaveAttribute("aria-disabled", "true");
    expect(button("Reset")).toBeEnabled();
  });

  it("presses the button that says to at the marker while nothing runs", () => {
    showRow(1);
    expect(button("One")).toHaveAttribute("aria-pressed", "true");
    expect(button("Next")).toHaveAttribute("aria-pressed", "false");
    expect(button("Reset")).toHaveAttribute("aria-disabled", "false");
  });

  it("plays a button's run when it is pressed, and presses it while it runs", () => {
    const player = showRow(1);
    const play = jest.spyOn(player, "play");
    fireEvent.click(button("Next"));
    expect(play).toHaveBeenCalledWith("next", { from: 1, to: 2 });
    expect(button("Next")).toHaveAttribute("aria-pressed", "true");
    expect(button("One")).toHaveAttribute("aria-pressed", "false");
    act(() => jest.advanceTimersByTime(1100));
    expect(button("Next")).toHaveAttribute("aria-pressed", "false");
    expect(player.marker).toBe(2);
  });

  it("never disables the button that is running, and pressing it replays its run", () => {
    const jumpAhead: StepButton = {
      key: "jump",
      label: "Jump",
      segmentToPlayWhenAt: marker => (marker === 0 ? { from: 1, to: 2 } : undefined),
    };
    const player = showRow(0, [jumpAhead]);
    fireEvent.click(button("Jump"));
    expect(button("Jump")).toBeEnabled();
    expect(button("Jump")).toHaveAttribute("aria-pressed", "true");
    const play = jest.spyOn(player, "play");
    fireEvent.click(button("Jump"));
    expect(play).toHaveBeenCalledWith("jump", expect.objectContaining({ from: 1, to: 2 }));
  });

  it("makes Reset available while the first step runs, and resets", () => {
    const player = showRow();
    fireEvent.click(button("One"));
    expect(button("Reset")).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(button("Reset"));
    expect(player.marker).toBe(0);
    expect(player.running).toBeUndefined();
  });

  it("does nothing when Reset is unavailable", () => {
    const player = showRow();
    const reset = jest.spyOn(player, "reset");
    fireEvent.click(button("Reset"));
    expect(reset).not.toHaveBeenCalled();
  });
});
