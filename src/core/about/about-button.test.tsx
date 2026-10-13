import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AboutButton } from "./about-button";

const MARKDOWN = "What the view is for.\n\n### The point\n\nWhy it matters.";

// jsdom has <dialog> but none of its methods. These do what the browser's do, short of the top layer.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

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

  // A click on the backdrop lands on the dialog element itself, outside its box. jsdom's box is
  // empty, at 0, 0.
  it("closes on a click outside it", () => {
    open();
    fireEvent.click(dialog(), { clientX: 500, clientY: 300 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(aboutButton()).toHaveFocus();
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
