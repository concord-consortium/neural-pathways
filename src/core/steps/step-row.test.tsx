import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { action, makeObservable, observable } from "mobx";
import { StepButton } from "./step-buttons";
import { StepPlayer, StepProgress, StepTimeline } from "./step-player";
import { StepRow } from "./step-row";

const timeline: StepTimeline<number> = {
  duration: (from, to) => (to - from) * 1000,
  sceneAt: done => done,
};

class Progress implements StepProgress {
  done = 0;

  constructor(done = 0) {
    this.done = done;
    makeObservable(this, { done: observable, setDone: action });
  }

  setDone(n: number) {
    this.done = n;
  }
}

/** One: always from 0 to 1, pressed when 1 is done. Next: one more, up to 3. Later: always disabled. */
const BUTTONS: StepButton[] = [
  { key: "one", label: "One", run: () => ({ from: 0, to: 1 }), showsDone: done => done === 1 },
  { key: "next", label: "Next", run: done => (done < 3 ? { from: done, to: done + 1 } : undefined) },
  { key: "later", label: "Later", run: () => undefined },
];

function renderRow(done = 0, buttons = BUTTONS) {
  const player = new StepPlayer(timeline, new Progress(done));
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
    renderRow();
    const group = screen.getByRole("group", { name: "Steps" });
    // eslint-disable-next-line testing-library/no-node-access -- need to verify order
    expect(Array.from(group.querySelectorAll("button")).map(b => b.textContent))
      .toEqual(["One", "Next", "Later", "Reset"]);
  });

  it("disables a button with no run, and makes Reset unavailable while nothing is done", () => {
    renderRow();
    expect(button("Later")).toBeDisabled();
    expect(button("Next")).toBeEnabled();
    expect(button("Reset")).toHaveAttribute("aria-disabled", "true");
    expect(button("Reset")).toBeEnabled();
  });

  it("presses the button that shows the steps done while nothing runs", () => {
    renderRow(1);
    expect(button("One")).toHaveAttribute("aria-pressed", "true");
    expect(button("Next")).toHaveAttribute("aria-pressed", "false");
    expect(button("Reset")).toHaveAttribute("aria-disabled", "false");
  });

  it("plays a button's run when it is pressed, and presses it while it runs", () => {
    // eslint-disable-next-line testing-library/render-result-naming-convention -- renderRow returns StepPlayer
    const player = renderRow(1);
    const play = jest.spyOn(player, "play");
    fireEvent.click(button("Next"));
    expect(play).toHaveBeenCalledWith("next", 1, 2);
    expect(button("Next")).toHaveAttribute("aria-pressed", "true");
    expect(button("One")).toHaveAttribute("aria-pressed", "false");
    act(() => jest.advanceTimersByTime(1100));
    expect(button("Next")).toHaveAttribute("aria-pressed", "false");
    expect(player.done).toBe(2);
  });

  it("never disables the button that is running, and pressing it replays its run", () => {
    const jumpAhead: StepButton = {
      key: "jump",
      label: "Jump",
      run: done => (done === 0 ? { from: 1, to: 2 } : undefined),
    };
    // eslint-disable-next-line testing-library/render-result-naming-convention -- renderRow returns StepPlayer
    const player = renderRow(0, [jumpAhead]);
    fireEvent.click(button("Jump"));
    expect(button("Jump")).toBeEnabled();
    expect(button("Jump")).toHaveAttribute("aria-pressed", "true");
    const play = jest.spyOn(player, "play");
    fireEvent.click(button("Jump"));
    expect(play).toHaveBeenCalledWith("jump", 1, 2);
  });

  it("makes Reset available while the first step runs, and resets", () => {
    // eslint-disable-next-line testing-library/render-result-naming-convention -- renderRow returns StepPlayer
    const player = renderRow();
    fireEvent.click(button("One"));
    expect(button("Reset")).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(button("Reset"));
    expect(player.done).toBe(0);
    expect(player.running).toBeUndefined();
  });

  it("does nothing when Reset is unavailable", () => {
    // eslint-disable-next-line testing-library/render-result-naming-convention -- renderRow returns StepPlayer
    const player = renderRow();
    const reset = jest.spyOn(player, "reset");
    fireEvent.click(button("Reset"));
    expect(reset).not.toHaveBeenCalled();
  });
});
