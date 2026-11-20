import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApPreview } from "./ap-preview";

function setHash(hash: string) {
  window.history.replaceState(null, "", `/ap-preview.html${hash}`);
}

function iframe() {
  return document.querySelector("iframe")!;
}

describe("ApPreview", () => {
  afterEach(() => setHash(""));

  it("loads the designed preset by default and names the view in the bar", () => {
    setHash("");
    render(<ApPreview />);
    expect(iframe().getAttribute("src")).toBe("index.html?interactive=looking-inside");
    expect(iframe()).toHaveAttribute("title", "Looking Inside a Neural Network");
    expect(screen.getByRole("heading", { level: 2, name: "Looking Inside a Neural Network" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Preset" })).toHaveValue("designed");
    expect(window.location.hash).toBe(
      "#view=looking-inside&fixed_width_layout=1100px&layout=full-width" +
      "&aspect_ratio_method=MANUAL&native_width=1044&native_height=562");
    expect(screen.getByText("Iframe 1044 × 562 px")).toBeInTheDocument();
  });

  it("reads the settings from the hash", () => {
    setHash("#view=correlations&fixed_width_layout=ipad_friendly&layout=60-40&column=secondary" +
      "&aspect_ratio_method=DEFAULT");
    render(<ApPreview />);
    expect(screen.getByRole("combobox", { name: "View" })).toHaveValue("correlations");
    expect(screen.getByRole("combobox", { name: "Activity Page Fixed Width" })).toHaveValue("ipad_friendly");
    expect(screen.getByRole("combobox", { name: "Layout" })).toHaveValue("60-40");
    expect(screen.getByRole("combobox", { name: "Interactive's column" })).toHaveValue("secondary");
    expect(screen.getByRole("combobox", { name: "Aspect Ratio" })).toHaveValue("DEFAULT");
    expect(screen.getByRole("combobox", { name: "Preset" })).toHaveValue("");
    // The secondary column of 60-40 on the 960 page, at 4:3.
    expect(screen.getByText("Iframe 355.6 × 266.7 px")).toBeInTheDocument();
  });

  it("follows the hash when it changes", () => {
    setHash("");
    render(<ApPreview />);
    setHash("#view=correlations");
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(iframe().getAttribute("src")).toBe("index.html?interactive=correlations");
  });

  it("choosing a preset fills in the settings and the hash", () => {
    setHash("");
    render(<ApPreview />);
    fireEvent.change(screen.getByRole("combobox", { name: "Preset" }), { target: { value: "responsive-default" } });
    expect(screen.getByRole("combobox", { name: "Layout" })).toHaveValue("responsive-full-width");
    expect(screen.getByRole("combobox", { name: "Activity Page Fixed Width" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Activity Page Fixed Width" }))
      .toHaveAccessibleDescription("Not used: a responsive section makes the page full width");
    expect(window.location.hash).toContain("layout=responsive-full-width");
  });

  it("changing a setting by hand clears the preset", () => {
    setHash("");
    render(<ApPreview />);
    const height = screen.getByRole("spinbutton", { name: "Height" });
    fireEvent.change(height, { target: { value: "600" } });
    fireEvent.blur(height);
    expect(screen.getByRole("combobox", { name: "Preset" })).toHaveValue("");
    expect(window.location.hash).toContain("native_height=600");
  });

  it("lets a native size be cleared and retyped, applying it when the field is left", () => {
    setHash("");
    render(<ApPreview />);
    const width = screen.getByRole("spinbutton", { name: "Width" });
    fireEvent.change(width, { target: { value: "" } });
    expect(width).toHaveValue(null);
    // Typing 800 passes through 8 and 80, which would make the iframe thousands of pixels tall.
    fireEvent.change(width, { target: { value: "8" } });
    expect(window.location.hash).toContain("native_width=1044");
    fireEvent.change(width, { target: { value: "800" } });
    expect(width).toHaveValue(800);
    fireEvent.blur(width);
    expect(window.location.hash).toContain("native_width=800");
  });

  it("applies a native size on Enter", () => {
    setHash("");
    render(<ApPreview />);
    const width = screen.getByRole("spinbutton", { name: "Width" });
    fireEvent.change(width, { target: { value: "900" } });
    fireEvent.keyDown(width, { key: "Enter" });
    expect(window.location.hash).toContain("native_width=900");
  });

  it("puts the last valid native size back when the field is left empty", () => {
    setHash("");
    render(<ApPreview />);
    const height = screen.getByRole("spinbutton", { name: "Height" });
    fireEvent.change(height, { target: { value: "" } });
    fireEvent.blur(height);
    expect(height).toHaveValue(562);
  });

  it("shows Width and Height only for the manual aspect ratio", () => {
    setHash("");
    render(<ApPreview />);
    expect(screen.getByRole("spinbutton", { name: "Width" })).toHaveValue(1044);
    fireEvent.change(screen.getByRole("combobox", { name: "Aspect Ratio" }), { target: { value: "DEFAULT" } });
    expect(screen.queryByRole("spinbutton", { name: "Width" })).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: "Height" })).not.toBeInTheDocument();
  });

  it("shows the interactive's column only for two-column layouts", () => {
    setHash("");
    render(<ApPreview />);
    expect(screen.queryByRole("combobox", { name: "Interactive's column" })).not.toBeInTheDocument();
  });

  it("shows the 300 px warning where the Activity Player doesn't stretch the iframe", () => {
    setHash("#layout=responsive-full-width&aspect_ratio_method=MAX");
    render(<ApPreview />);
    expect(screen.getByText(/doesn't apply "Use all available space" in a responsive-full-width section/))
      .toBeInTheDocument();
  });

  it("announces the iframe's size and any warning, but not the window's size as it is dragged", () => {
    setHash("#layout=responsive-full-width&aspect_ratio_method=MAX");
    render(<ApPreview />);
    const live = screen.getByRole("status");
    expect(live).toHaveTextContent(/Iframe \d+ × 300 px/);
    expect(live).toHaveTextContent(/doesn't apply "Use all available space"/);
    expect(live).not.toHaveTextContent(/window/);
  });

  it("says what it assumes and the designed size", () => {
    setHash("");
    render(<ApPreview />);
    expect(screen.getByText("Views are designed for 1024 × 562 px or less.")).toBeInTheDocument();
    expect(screen.getByText("Assumes a Multiple Pages activity and a managed interactive with a name."))
      .toBeInTheDocument();
  });
});
