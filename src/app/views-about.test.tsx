import fs from "fs";
import path from "path";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { VIEWS } from "./views";

/**
 * The first line of a view's about.md, which its dialog should show. Not the first sentence: every
 * text starts with the same one.
 */
function firstLine(viewId: string) {
  return fs.readFileSync(path.join(__dirname, "../views", viewId, "about.md"), "utf8").split("\n")[0];
}

// The views built so far load data before they show About, so their About text is checked in
// playwright/about.test.ts. Every other view is a placeholder, which renders without loading data.
const BUILT_VIEWS = ["looking-inside", "extract-pathways", "model-reasoning"];
const placeholders = VIEWS.filter(view => !BUILT_VIEWS.includes(view.id));

describe("each placeholder view's About", () => {
  it("covers the three views not built yet", () => {
    expect(placeholders).toHaveLength(3);
  });

  it.each(placeholders.map(view => [view.title, view] as const))("shows %s's own text", (title, view) => {
    const View = view.component;
    render(<View />);
    fireEvent.click(screen.getByRole("button", { name: `About ${title}` }));
    expect(screen.getByRole("dialog", { name: `About ${title}` })).toHaveTextContent(firstLine(view.id));
  });
});
