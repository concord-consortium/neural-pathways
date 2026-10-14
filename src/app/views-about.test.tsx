import fs from "fs";
import path from "path";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { VIEWS } from "./views";

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

/**
 * The first line of a view's about.md, which its dialog should show. Not the first sentence: every
 * text starts with the same one.
 */
function firstLine(viewId: string) {
  return fs.readFileSync(path.join(__dirname, "../views", viewId, "about.md"), "utf8").split("\n")[0];
}

// Views without state of their own are placeholders, which render without loading data. The built
// views' About text is checked in playwright/about.test.ts.
const placeholders = VIEWS.filter(view => !view.stateModel);

describe("each placeholder view's About", () => {
  it("covers the five views not built yet", () => {
    expect(placeholders).toHaveLength(5);
  });

  it.each(placeholders.map(view => [view.title, view] as const))("shows %s's own text", (title, view) => {
    const View = view.component;
    render(<View />);
    fireEvent.click(screen.getByRole("button", { name: `About ${title}` }));
    expect(screen.getByRole("dialog", { name: `About ${title}` })).toHaveTextContent(firstLine(view.id));
  });
});
