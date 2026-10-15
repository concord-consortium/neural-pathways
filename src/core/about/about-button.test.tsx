import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AboutButton } from "./about-button";

const MARKDOWN = "What the view is for.\n\n### The point\n\nWhy it matters.";

const aboutButton = () => screen.getByRole("button", { name: "About Trace a Case" });
const dialog = () => screen.getByRole("dialog", { name: "About Trace a Case" });

function open() {
  render(<AboutButton title="Trace a Case" markdown={MARKDOWN} />);
  fireEvent.click(aboutButton());
}

describe("AboutButton", () => {
  it("is named for the view, starting with its visible word, and says it opens a dialog", () => {
    render(<AboutButton title="Trace a Case" markdown={MARKDOWN} />);
    expect(aboutButton()).toHaveTextContent("About");
    expect(aboutButton()).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a dialog named by its heading, showing the markdown, with focus on Close", () => {
    open();
    expect(dialog()).toHaveAttribute("open");
    expect(screen.getByRole("heading", { level: 2, name: "About Trace a Case" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "The point" })).toBeInTheDocument();
    expect(screen.getByText("Why it matters.").tagName).toBe("P");
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("shows the text in a group named by the dialog's heading, for when it scrolls", () => {
    open();
    expect(screen.getByRole("group", { name: "About Trace a Case" })).toHaveTextContent("What the view is for.");
  });

  it("marks the button as pressed while the dialog is open", () => {
    open();
    expect(aboutButton()).toHaveClass("about-button--open");
  });

  it("closes with Close and puts focus back on About", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(aboutButton()).toHaveFocus();
    expect(aboutButton()).not.toHaveClass("about-button--open");
  });

  // Escape closes a modal dialog in the browser, and it ends in the same close event.
  it("puts focus back on About when the browser closes the dialog, as Escape does", () => {
    open();
    act(() => (dialog() as HTMLDialogElement).close());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(aboutButton()).toHaveFocus();
  });

  // jsdom's box is empty, at 0, 0.
  it("closes on a click outside it", () => {
    open();
    fireEvent.mouseDown(dialog(), { clientX: 500, clientY: 300 });
    fireEvent.click(dialog(), { clientX: 500, clientY: 300 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(aboutButton()).toHaveFocus();
  });

  it("stays open when a text selection is dragged out of it", () => {
    open();
    fireEvent.mouseDown(screen.getByText("Why it matters."));
    fireEvent.click(dialog(), { clientX: 500, clientY: 300 });
    expect(dialog()).toHaveAttribute("open");
  });

  // Only the dialog's border is the dialog element itself and inside its box.
  it("stays open on a click on the dialog element inside its box", () => {
    open();
    jest.spyOn(dialog(), "getBoundingClientRect").mockReturnValue(
      { left: 100, right: 500, top: 100, bottom: 400, width: 400, height: 300, x: 100, y: 100 } as DOMRect);
    fireEvent.click(dialog(), { clientX: 101, clientY: 200 });
    expect(dialog()).toHaveAttribute("open");
  });

  it("stays open on a click on its text", () => {
    open();
    fireEvent.click(screen.getByText("Why it matters."));
    expect(dialog()).toHaveAttribute("open");
  });

  // jsdom doesn't move focus on Tab, so these check that the browser's move is replaced.
  it("wraps Tab from its last control to its first, rather than letting it leave", () => {
    open();
    const close = screen.getByRole("button", { name: "Close" });
    // The text doesn't scroll in jsdom, so Close is the only control: first and last.
    expect(fireEvent.keyDown(close, { key: "Tab" })).toBe(false);
    expect(fireEvent.keyDown(close, { key: "Tab", shiftKey: true })).toBe(false);
    expect(close).toHaveFocus();
  });

  // A click on the dialog's text moves focus to the dialog itself, which is neither of its controls.
  it("keeps Tab inside it when focus is on none of its controls", () => {
    open();
    act(() => screen.getByRole("button", { name: "Close" }).blur());
    expect(fireEvent.keyDown(dialog(), { key: "Tab", shiftKey: true })).toBe(false);
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("lets Tab reach a link in its text", () => {
    render(<AboutButton title="Trace a Case" markdown="See [the glossary](https://example.org)." />);
    fireEvent.click(aboutButton());
    // Close comes before the text, so Tab from it is the browser's to move on to the link.
    expect(fireEvent.keyDown(screen.getByRole("button", { name: "Close" }), { key: "Tab" })).toBe(true);
    const link = screen.getByRole("link", { name: "the glossary" });
    act(() => link.focus());
    expect(fireEvent.keyDown(link, { key: "Tab" })).toBe(false);
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("wraps Shift+Tab from its first control to its last", () => {
    render(<AboutButton title="Trace a Case" markdown="See [the glossary](https://example.org)." />);
    fireEvent.click(aboutButton());
    const link = screen.getByRole("link", { name: "the glossary" });
    act(() => link.focus());
    // The link is the last control, so Shift+Tab from it is the browser's to move back to Close.
    expect(fireEvent.keyDown(link, { key: "Tab", shiftKey: true })).toBe(true);
    const close = screen.getByRole("button", { name: "Close" });
    act(() => close.focus());
    expect(fireEvent.keyDown(close, { key: "Tab", shiftKey: true })).toBe(false);
    expect(link).toHaveFocus();
  });

  it("starts Tab at its first control, and Shift+Tab at its last, when focus is on none of them", () => {
    render(<AboutButton title="Trace a Case" markdown="See [the glossary](https://example.org)." />);
    fireEvent.click(aboutButton());
    const close = screen.getByRole("button", { name: "Close" });
    act(() => close.blur());
    const link = screen.getByRole("link", { name: "the glossary" });
    expect(fireEvent.keyDown(dialog(), { key: "Tab", shiftKey: true })).toBe(false);
    expect(link).toHaveFocus();
    act(() => link.blur());
    expect(fireEvent.keyDown(dialog(), { key: "Tab" })).toBe(false);
    expect(close).toHaveFocus();
  });

  it("leaves other keys alone", () => {
    open();
    expect(fireEvent.keyDown(screen.getByRole("button", { name: "Close" }), { key: "a" })).toBe(true);
  });

  it("can be opened again after closing", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(aboutButton());
    expect(dialog()).toHaveAttribute("open");
  });
});
