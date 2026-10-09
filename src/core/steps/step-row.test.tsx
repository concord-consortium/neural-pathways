import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StepButton } from "./step-button";
import { StepPlayer, StepTimeline } from "./step-player";
import { StepRow } from "./step-row";
import { clearReducedMotion, setReducedMotion, TestProgress } from "./test-helpers";

const timeline: StepTimeline<number> = {
  duration: ({ from, to }) => (to - from) * 1000,
  sceneAt: marker => marker,
};

/**
 * One: always from 0 to 1, current at 1. Next: on one marker, up to 3. Later: always unavailable.
 */
const BUTTONS: StepButton[] = [
  {
    key: "one",
    label: "One",
    segmentToPlayWhenAt: () => ({ from: 0, to: 1 }),
    showAsCurrentWhenAt: marker => marker === 1,
  },
  {
    key: "next",
    label: "Next",
    segmentToPlayWhenAt: marker => (marker < 3 ? { from: marker, to: marker + 1 } : undefined),
  },
  { key: "later", label: "Later", segmentToPlayWhenAt: () => undefined },
];

function showRow(marker = 0, buttons = BUTTONS) {
  const player = new StepPlayer(timeline, new TestProgress(marker));
  render(<StepRow player={player} buttons={buttons} />);
  return player;
}

const button = (name: string) => screen.getByRole("button", { name });

describe("StepRow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setReducedMotion(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    clearReducedMotion();
  });

  it("shows the buttons in order, then Reset, in a group named Steps", () => {
    showRow();
    const group = screen.getByRole("group", { name: "Steps" });
    // eslint-disable-next-line testing-library/no-node-access -- need to verify order
    expect(Array.from(group.querySelectorAll("button")).map(b => b.textContent))
      .toEqual(["One", "Next", "Later", "Reset"]);
  });

  it("marks no button as current at the start, makes one with no segment unavailable, and Reset too", () => {
    showRow();
    for (const name of ["One", "Next", "Later"]) {
      expect(button(name)).not.toHaveAttribute("aria-current");
    }
    expect(button("Later")).toHaveAttribute("aria-disabled", "true");
    expect(button("Next")).toHaveAttribute("aria-disabled", "false");
    expect(button("Reset")).toHaveAttribute("aria-disabled", "true");
    // Not disabled, so it stays in the tab order.
    expect(button("Reset")).toBeEnabled();
  });

  it("keeps an unavailable button focusable, and does nothing when it is pressed", () => {
    // eslint-disable-next-line testing-library/render-result-naming-convention -- showRow returns StepPlayer
    const player = showRow();
    const play = jest.spyOn(player, "play");
    expect(button("Later")).toBeEnabled();
    fireEvent.click(button("Later"));
    expect(play).not.toHaveBeenCalled();
  });

  it("keeps the focus on a button that becomes unavailable when its run ends", () => {
    showRow(2);
    button("Next").focus();
    fireEvent.click(button("Next"));
    act(() => jest.advanceTimersByTime(1100));
    expect(button("Next")).toHaveAttribute("aria-disabled", "true");
    // jsdom doesn't move the focus off a button that becomes disabled, as a browser does, so this
    // checks it isn't; the Playwright tests check the focus stays in a browser.
    expect(button("Next")).toBeEnabled();
    expect(button("Next")).toHaveFocus();
  });

  it("marks as current the button that says to at the marker while nothing runs", () => {
    showRow(1);
    expect(button("One")).toHaveAttribute("aria-current", "step");
    expect(button("Next")).not.toHaveAttribute("aria-current");
    expect(button("Reset")).toHaveAttribute("aria-disabled", "false");
  });

  it("plays a button's run when it is pressed, and marks it as current while it runs", () => {
    const player = showRow(1);
    const play = jest.spyOn(player, "play");
    fireEvent.click(button("Next"));
    expect(play).toHaveBeenCalledWith("next", { from: 1, to: 2 });
    expect(button("Next")).toHaveAttribute("aria-current", "step");
    expect(button("One")).not.toHaveAttribute("aria-current");
    act(() => jest.advanceTimersByTime(1100));
    expect(button("Next")).not.toHaveAttribute("aria-current");
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
    expect(button("Jump")).toHaveAttribute("aria-disabled", "false");
    expect(button("Jump")).toHaveAttribute("aria-current", "step");
    const play = jest.spyOn(player, "play");
    fireEvent.click(button("Jump"));
    expect(play).toHaveBeenCalledWith("jump", expect.objectContaining({ from: 1, to: 2 }));
  });

  it("re-renders when a run starts or ends, not on every frame", () => {
    const segmentAt = jest.fn((marker: number) => (marker < 3 ? { from: marker, to: marker + 1 } : undefined));
    showRow(1, [{ key: "next", label: "Next", segmentToPlayWhenAt: segmentAt }]);
    fireEvent.click(button("Next"));
    const callsOnceStarted = segmentAt.mock.calls.length;
    // Halfway through the run: many frames, each a new `currentFrame`.
    act(() => jest.advanceTimersByTime(500));
    expect(segmentAt).toHaveBeenCalledTimes(callsOnceStarted);
  });

  it("makes Reset available while a run plays, and resets", () => {
    const player = showRow();
    fireEvent.click(button("One"));
    expect(button("Reset")).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(button("Reset"));
    expect(player.marker).toBe(0);
    expect(player.currentFrame).toBeUndefined();
  });

  it("does nothing when Reset is unavailable", () => {
    const player = showRow();
    const reset = jest.spyOn(player, "reset");
    fireEvent.click(button("Reset"));
    expect(reset).not.toHaveBeenCalled();
  });
});
