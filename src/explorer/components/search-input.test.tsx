import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SearchInput } from "./search-input";
import { AttributeDefinition } from "../../shared/types/attributes";
import { S3Index } from "../../shared/types/s3-data";
import { yelpDataset } from "../../shared/datasets/yelp-dataset";

const emptyIndex = { metadata: { fa_fits: {}, review_sets: {} }, items: [] } as unknown as S3Index;

const yelpNoun = { singular: "review", plural: "reviews" };
const yelpProps = {
  itemNoun: yelpNoun,
  searchPlaceholder: "stars:5 AND pathway_0:>0.8",
  searchFields: yelpDataset.searchFields,
};

describe("SearchInput", () => {
  it("renders an input with placeholder text", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()} {...yelpProps} />);
    expect(screen.getByPlaceholderText(/stars:5/)).toBeDefined();
  });

  it("takes the placeholder from the dataset rather than hard-coding it", () => {
    render(
      <SearchInput
        query="" onQueryChange={jest.fn()}
        itemNoun={{ singular: "conversation", plural: "conversations" }}
        searchPlaceholder="voices_raised:1 AND pathway_0:>1" searchFields={[]}
      />,
    );
    expect(screen.getByPlaceholderText("voices_raised:1 AND pathway_0:>1")).toBeDefined();
  });

  it("calls onQueryChange when the user types", () => {
    const onChange = jest.fn();
    render(<SearchInput query="" onQueryChange={onChange} {...yelpProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "stars:5" } });
    expect(onChange).toHaveBeenCalledWith("stars:5");
  });

  it("shows error styling when hasError is true", () => {
    render(<SearchInput query="bad[" onQueryChange={jest.fn()} hasError {...yelpProps} />);
    // eslint-disable-next-line testing-library/no-node-access -- checking CSS class on parent element
    const container = screen.getByRole("textbox").closest(".search-input-container");
    expect(container?.classList.contains("search-input-error")).toBe(true);
  });

  it("shows help dialog when help button is clicked", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()} numPathways={5} {...yelpProps} />);
    fireEvent.click(screen.getByRole("button", { name: /search help/i }));
    expect(screen.getByText("Search Syntax")).toBeDefined();
    expect(screen.getByText("pathway_0 through pathway_4")).toBeDefined();
  });

  it("shows classification fields in help dialog", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()} {...yelpProps} />);
    fireEvent.click(screen.getByRole("button", { name: /search help/i }));
    expect(screen.getByText("classification_label")).toBeDefined();
    expect(screen.getByText("classification_probability")).toBeDefined();
  });

  it("describes the classification_label field as a predicted label, not a sentiment", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()} {...yelpProps} />);
    fireEvent.click(screen.getByRole("button", { name: /search help/i }));
    expect(screen.getByText("Model's predicted label")).toBeDefined();
    expect(screen.queryByText("Model's predicted sentiment")).toBeNull();
  });

  it("names the text field using the dataset's noun", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()} {...yelpProps} />);
    fireEvent.click(screen.getByRole("button", { name: /search help/i }));
    expect(screen.getByText("Review text")).toBeDefined();
  });

  it("lists only the search fields the dataset declares", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()}
      itemNoun={{ singular: "conversation", plural: "conversations" }}
      searchPlaceholder="voices_raised:1" searchFields={[]} />);
    fireEvent.click(screen.getByLabelText("Search help"));
    expect(screen.getByText("Conversation text")).toBeInTheDocument();
    expect(screen.queryByText("Business name")).toBeNull();
    expect(screen.queryByText("Reconstruction R²")).toBeNull();
  });

  it("hides help dialog when help button is clicked again", () => {
    render(<SearchInput query="" onQueryChange={jest.fn()} {...yelpProps} />);
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
    render(<SearchInput query="" onQueryChange={() => undefined} attributes={attrs} {...yelpProps} />);
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

describe("SearchInput field/attribute key deduplication", () => {
  // Regression test: `stars` and `review_stars` are real yelpDataset attributes that
  // intentionally alias existing search fields of the same name. Before this fix, the
  // hardcoded Fields table also listed them, so they rendered twice in the help dialog.
  // A later phase hides attributes from students, so a stale duplicate row would leak
  // an answer the student was not meant to see.
  it("renders each of stars and review_stars exactly once in the help dialog", () => {
    render(
      <SearchInput
        query=""
        onQueryChange={() => undefined}
        attributes={yelpDataset.resolveAttributes(emptyIndex)}
        {...yelpProps}
      />,
    );
    fireEvent.click(screen.getByLabelText("Search help"));
    const dialog = (
      // eslint-disable-next-line testing-library/no-node-access -- scoping queries to the help dialog
      screen.getByText("Search Syntax").closest(".search-input-help-dialog")
    ) as HTMLElement;

    // getAllByText's default matcher only compares an element's own direct text nodes
    // (see testing-library/dom's getNodeText), so this matches only <code> elements whose
    // full text is exactly "stars" or "review_stars" — not ancestor <td>s or the longer
    // example query strings that merely contain these words as a substring.
    expect(within(dialog).getAllByText("stars")).toHaveLength(1);
    expect(within(dialog).getAllByText("review_stars")).toHaveLength(1);
  });
});
