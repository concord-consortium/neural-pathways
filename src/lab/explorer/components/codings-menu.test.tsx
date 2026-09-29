import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttributeDefinition } from "../../shared/types/attributes";
import { CodingsMenu } from "./codings-menu";

const codings: AttributeDefinition[] = [
  {
    key: "resource_stressed", label: "Resource stressed",
    description: "Whether the surroundings showed scarcity rather than abundance.",
    type: "binary", hidden: true,
  },
  {
    key: "young_present", label: "Young present",
    description: "Whether any juvenile was among the individuals recorded.",
    type: "binary", hidden: true,
  },
];

const defaultProps = {
  codings,
  commissioned: new Set<string>(),
  itemCount: 800,
  itemNoun: { singular: "conversation", plural: "conversations" },
  onCommission: jest.fn(),
  onReset: jest.fn(),
};

function open() {
  fireEvent.click(screen.getByRole("button", { name: /codings/i }));
}

describe("CodingsMenu", () => {
  it("counts what is still available on the trigger", () => {
    render(<CodingsMenu {...defaultProps} />);
    expect(screen.getByRole("button", { name: /codings/i })).toHaveTextContent("2");
  });

  it("drops the count once everything is commissioned", () => {
    render(<CodingsMenu {...defaultProps}
      commissioned={new Set(["resource_stressed", "young_present"])} />);
    expect(screen.getByRole("button", { name: /codings/i })).not.toHaveTextContent("2");
  });

  it("shows each available coding with its full description", () => {
    render(<CodingsMenu {...defaultProps} />);
    open();
    expect(screen.getByText("Resource stressed")).toBeInTheDocument();
    expect(screen.getByText(/surroundings showed scarcity/)).toBeInTheDocument();
  });

  it("names how much reading a coder would do", () => {
    render(<CodingsMenu {...defaultProps} />);
    open();
    expect(screen.getByTestId("codings-framing").textContent).toContain("800 conversations");
  });

  it("reports the commissioned key", () => {
    const onCommission = jest.fn();
    render(<CodingsMenu {...defaultProps} onCommission={onCommission} />);
    open();
    fireEvent.click(screen.getByTestId("commission-resource_stressed"));
    expect(onCommission).toHaveBeenCalledWith("resource_stressed");
  });

  it("moves a commissioned coding out of the available group", () => {
    render(<CodingsMenu {...defaultProps} commissioned={new Set(["resource_stressed"])} />);
    open();
    expect(screen.queryByTestId("commission-resource_stressed")).toBeNull();
    expect(screen.getByTestId("codings-commissioned").textContent).toContain("Resource stressed");
    expect(screen.getByTestId("commission-young_present")).toBeInTheDocument();
  });

  it("offers reset only once something has been commissioned", () => {
    const { rerender } = render(<CodingsMenu {...defaultProps} />);
    open();
    expect(screen.queryByRole("button", { name: /reset/i })).toBeNull();
    rerender(<CodingsMenu {...defaultProps} commissioned={new Set(["young_present"])} />);
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<CodingsMenu {...defaultProps} />);
    open();
    expect(screen.getByTestId("codings-dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("codings-dialog")).toBeNull();
  });
});
