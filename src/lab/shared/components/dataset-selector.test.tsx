import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DatasetSelector } from "./dataset-selector";

const datasets = [
  { id: "yelp", label: "Yelp Reviews" },
  { id: "alien", label: "Alien Conversations" },
] as Parameters<typeof DatasetSelector>[0]["datasets"];

describe("DatasetSelector", () => {
  it("shows every dataset by label and marks the selection", () => {
    render(<DatasetSelector datasets={datasets} selectedId="alien" onChange={jest.fn()} />);
    expect(screen.getByRole("option", { name: "Yelp Reviews" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("alien");
  });

  it("reports the chosen id", () => {
    const onChange = jest.fn();
    render(<DatasetSelector datasets={datasets} selectedId="yelp" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "alien" } });
    expect(onChange).toHaveBeenCalledWith("alien");
  });
});
