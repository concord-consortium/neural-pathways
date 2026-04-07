import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchInput } from "./search-input";

describe("SearchInput", () => {
  it("renders an input with placeholder text", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()} />);
    expect(screen.getByPlaceholderText(/stars:5/)).toBeDefined();
  });

  it("calls onQueryChange when the user types", () => {
    const onChange = jest.fn();
    render(<SearchInput query="" onQueryChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "stars:5" } });
    expect(onChange).toHaveBeenCalledWith("stars:5");
  });

  it("shows error styling when hasError is true", () => {
    render(<SearchInput query="bad[" onQueryChange={jest.fn()} hasError />);
    // eslint-disable-next-line testing-library/no-node-access -- checking CSS class on parent element
    const container = screen.getByRole("textbox").closest(".search-input-container");
    expect(container?.classList.contains("search-input-error")).toBe(true);
  });

  it("shows help dialog when help button is clicked", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()} numPathways={5} />);
    fireEvent.click(screen.getByRole("button", { name: /search help/i }));
    expect(screen.getByText("Search Syntax")).toBeDefined();
    expect(screen.getByText("pathway_0 through pathway_4")).toBeDefined();
  });

  it("shows classification fields in help dialog", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /search help/i }));
    expect(screen.getByText("classification_label")).toBeDefined();
    expect(screen.getByText("classification_probability")).toBeDefined();
  });

  it("hides help dialog when help button is clicked again", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()} />);
    const helpButton = screen.getByRole("button", { name: /search help/i });
    fireEvent.click(helpButton);
    expect(screen.getByText("Search Syntax")).toBeDefined();
    fireEvent.click(helpButton);
    expect(screen.queryByText("Search Syntax")).toBeNull();
  });
});
