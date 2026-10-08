import React from "react";
import { fireEvent, isInaccessible, render, screen } from "@testing-library/react";
import { SPEED } from "../state/animation";
import { TestSettings } from "../steps/test-helpers";
import { AnimationControls } from "./animation-controls";

const checkbox = () => screen.getByRole("checkbox", { name: "Animate" });
const slider = () => screen.getByRole("slider", { name: "Animation speed" }) as HTMLInputElement;

describe("AnimationControls", () => {
  it("shows Animate checked and the speed at Med by default", () => {
    render(<AnimationControls animated={new TestSettings()} />);
    expect(checkbox()).toBeChecked();
    expect(slider().value).toBe("1");
    expect(slider()).toHaveAttribute("aria-valuetext", "Med");
    expect(slider()).toBeEnabled();
  });

  it("stores Animate when the box is clicked", () => {
    const settings = new TestSettings();
    render(<AnimationControls animated={settings} />);
    fireEvent.click(checkbox());
    expect(settings.animate).toBe(false);
    expect(checkbox()).not.toBeChecked();
    expect(slider()).toBeDisabled();
  });

  it("disables the slider while Animate is off, keeping the speed", () => {
    render(<AnimationControls animated={new TestSettings({ animate: false, speed: SPEED.fast })} />);
    expect(slider()).toBeDisabled();
    expect(slider()).toHaveAttribute("aria-valuetext", "Fast");
  });

  it.each([
    [SPEED.slow, "Slow"],
    [SPEED.fast, "Fast"],
  ] as const)("stores speed %p, named %p, when the slider moves", (speed, name) => {
    const settings = new TestSettings();
    render(<AnimationControls animated={settings} />);
    fireEvent.change(slider(), { target: { value: String(speed) } });
    expect(settings.speed).toBe(speed);
    expect(slider()).toHaveAttribute("aria-valuetext", name);
  });

  it("names each stop under the slider, marking the current one, hidden from assistive tech", () => {
    render(<AnimationControls animated={new TestSettings({ speed: SPEED.fast })} />);
    for (const name of ["Slow", "Med", "Fast"]) {
      expect(isInaccessible(screen.getByText(name))).toBe(true);
    }
    expect(screen.getByText("Fast")).toHaveClass("animation-controls__stop--current");
    expect(screen.getByText("Slow")).not.toHaveClass("animation-controls__stop--current");
    expect(screen.getByText("Med")).not.toHaveClass("animation-controls__stop--current");
  });
});
