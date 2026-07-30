import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchInput } from "./search-input";
import { AttributeDefinition } from "../../shared/types/attributes";

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

describe("SearchInput attribute fields", () => {
  const attributes: AttributeDefinition[] = [
    {
      key: "model_correct",
      label: "Model was correct",
      description: "Whether the prediction matched the truth.",
      type: "binary",
    },
    {
      key: "review_stars",
      label: "Review rating",
      description: "Stars on this review.",
      type: "integer",
      min: 1,
      max: 5,
    },
  ];

  const openHelp = (attrs: AttributeDefinition[] = attributes) => {
    render(<SearchInput query="" onQueryChange={() => undefined} attributes={attrs} />);
    fireEvent.click(screen.getByLabelText("Search help"));
  };

  it("lists each attribute key in the help dialog", () => {
    openHelp();
    expect(screen.getByText("model_correct")).toBeDefined();
  });

  it("shows the attribute label and range for a numeric attribute", () => {
    openHelp();
    expect(screen.getByText(/Review rating \(1–5\)/)).toBeDefined();
  });

  it("shows the label without a range for a binary attribute", () => {
    openHelp();
    expect(screen.getByText("Model was correct (0 or 1)")).toBeDefined();
  });

  it("omits the attributes section entirely when there are none", () => {
    openHelp([]);
    expect(screen.queryByText("Attributes")).toBeNull();
  });
});
