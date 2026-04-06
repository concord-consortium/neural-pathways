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
});
