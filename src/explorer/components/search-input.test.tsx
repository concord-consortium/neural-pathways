import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchInput } from "./search-input";

describe("SearchInput", () => {
  it("renders an input with placeholder text", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()} resultCount={0} totalCount={0} />);
    expect(screen.getByPlaceholderText(/stars:5/)).toBeDefined();
  });

  it("calls onQueryChange when the user types", () => {
    const onChange = jest.fn();
    render(<SearchInput query="" onQueryChange={onChange} resultCount={0} totalCount={0} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "stars:5" } });
    expect(onChange).toHaveBeenCalledWith("stars:5");
  });

  it("displays the result count", () => {
    render(<SearchInput query="test" onQueryChange={jest.fn()} resultCount={247} totalCount={7012} />);
    expect(screen.getByText("247 of 7012")).toBeDefined();
  });

  it("shows error styling when hasError is true", () => {
    render(<SearchInput query="bad[" onQueryChange={jest.fn()} resultCount={0} totalCount={0} hasError />);
    // eslint-disable-next-line testing-library/no-node-access -- checking CSS class on parent element
    const container = screen.getByRole("textbox").closest(".search-input-container");
    expect(container?.classList.contains("search-input-error")).toBe(true);
  });
});
