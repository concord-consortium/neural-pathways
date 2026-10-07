import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AttributeDefinition } from "../types/attributes";
import { FilterBar, FilterBarProps } from "./filter-bar";

const attributes: AttributeDefinition[] = [
  { key: "group_size", label: "Group size", description: "", type: "integer", min: 1, max: 6 },
  { key: "model_correct", label: "Model was correct", description: "", type: "binary" },
];

function showBar(overrides: Partial<FilterBarProps> = {}) {
  const props: FilterBarProps = {
    text: "",
    status: { matched: 4, total: 4 },
    fields: ["n", "id", "text", "observation", "target_label", "group_size", "model_correct", "pathway_1"],
    attributes,
    onTextChange: jest.fn(),
    onCommit: jest.fn(),
    onDiscard: jest.fn(),
    ...overrides,
  };
  render(<FilterBar {...props} />);
  return props;
}

const input = () => screen.getByRole("textbox", { name: "Filter" });
const helpButton = () => screen.getByRole("button", { name: "Show what you can filter on" });

describe("FilterBar", () => {
  it("labels the box Filter and gives an example", () => {
    showBar();
    expect(input()).toHaveAttribute("placeholder", "Example: model_correct:0");
  });

  it("shows the text it is given", () => {
    showBar({ text: "n:2" });
    expect(input()).toHaveValue("n:2");
  });

  it("counts every conversation as one number", () => {
    showBar({ status: { matched: 800, total: 800 } });
    expect(input()).toHaveAccessibleDescription("800");
  });

  it("counts the matches out of all the conversations", () => {
    showBar({ status: { matched: 64, total: 800 } });
    expect(input()).toHaveAccessibleDescription("64 of 800");
  });

  it("counts no matches", () => {
    showBar({ status: { matched: 0, total: 800 } });
    expect(input()).toHaveAccessibleDescription("0 of 800");
  });

  it("shows an error in place of the count, and marks the box invalid", () => {
    showBar({ status: { error: "Unknown field: bogus" } });
    expect(input()).toHaveAccessibleDescription("Unknown field: bogus");
    expect(input()).toHaveAttribute("aria-invalid", "true");
  });

  it("isn't marked invalid without an error", () => {
    showBar();
    expect(input()).toHaveAttribute("aria-invalid", "false");
  });

  it("passes on what is typed", () => {
    const props = showBar();
    fireEvent.change(input(), { target: { value: "yandor" } });
    expect(props.onTextChange).toHaveBeenCalledWith("yandor");
  });

  it("commits on Enter and on blur", () => {
    const props = showBar();
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(props.onCommit).toHaveBeenCalledTimes(1);
    fireEvent.blur(input());
    expect(props.onCommit).toHaveBeenCalledTimes(2);
  });

  it("commits when focus leaves the bar", () => {
    const props = showBar();
    input().focus();
    input().blur();
    expect(props.onCommit).toHaveBeenCalledTimes(1);
  });

  it("doesn't commit when focus moves from the box to the help button", () => {
    const props = showBar();
    input().focus();
    helpButton().focus();
    expect(props.onCommit).not.toHaveBeenCalled();
  });

  it("keeps focus in the box when the help button is pressed", () => {
    showBar();
    // false: the mousedown's default, moving focus, was prevented.
    expect(fireEvent.mouseDown(helpButton())).toBe(false);
  });

  it("doesn't commit when focus moves into the open help", () => {
    const props = showBar();
    fireEvent.click(helpButton());
    input().focus();
    screen.getByRole("dialog").focus();
    expect(screen.getByRole("dialog")).toHaveFocus();
    expect(props.onCommit).not.toHaveBeenCalled();
  });

  it("discards on Escape", () => {
    const props = showBar();
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(props.onDiscard).toHaveBeenCalledTimes(1);
  });

  it("leaves Enter and Escape to an IME composition in progress", () => {
    const props = showBar();
    fireEvent.keyDown(input(), { key: "Enter", isComposing: true });
    fireEvent.keyDown(input(), { key: "Escape", isComposing: true });
    // Safari ends a composition with keyCode 229 and isComposing false.
    fireEvent.keyDown(input(), { key: "Enter", keyCode: 229 });
    expect(props.onCommit).not.toHaveBeenCalled();
    expect(props.onDiscard).not.toHaveBeenCalled();
  });

  describe("help", () => {
    it("starts closed", () => {
      showBar();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(helpButton()).toHaveAttribute("aria-expanded", "false");
    });

    it("opens and closes from its button", () => {
      showBar();
      fireEvent.click(helpButton());
      expect(screen.getByRole("dialog", { name: "What you can filter on" })).toBeInTheDocument();
      expect(helpButton()).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(helpButton());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("lists every field, with what it holds", () => {
      showBar();
      fireEvent.click(helpButton());
      const dialog = screen.getByRole("dialog");
      for (const field of ["n", "id", "text", "observation", "target_label", "group_size", "model_correct",
        "pathway_1"]) {
        expect(dialog).toHaveTextContent(field);
      }
      expect(dialog).toHaveTextContent("The observer's notes");
      expect(dialog).toHaveTextContent("Group size (1–6)");
      expect(dialog).toHaveTextContent("Model was correct");
      expect(dialog).toHaveTextContent("Score on Pathway 1");
    });

    it("says the operators must be capitals, and gives examples", () => {
      showBar();
      fireEvent.click(helpButton());
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveTextContent("Write AND, OR and NOT in capitals");
      expect(dialog).toHaveTextContent("voices_raised:1 AND pathway_1:<0");
      expect(dialog).toHaveTextContent("observation:\"stores nearby\"");
    });

    it("closes from its close button and returns focus to the help button", () => {
      showBar();
      fireEvent.click(helpButton());
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(helpButton()).toHaveFocus();
    });

    it("closes on Escape and returns focus to the help button", () => {
      showBar();
      fireEvent.click(helpButton());
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(helpButton()).toHaveFocus();
    });

    it("closes on a mousedown outside it, but not inside it", () => {
      showBar();
      fireEvent.click(helpButton());
      fireEvent.mouseDown(screen.getByRole("dialog"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("doesn't discard the draft when Escape closes it", () => {
      const props = showBar();
      fireEvent.click(helpButton());
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(props.onDiscard).not.toHaveBeenCalled();
    });

    it("closes on Escape when the help button was clicked and focus stayed on the page", () => {
      showBar();
      fireEvent.click(helpButton());
      fireEvent.keyDown(document.body, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes first on Escape in the box, keeping the draft and the caret", () => {
      const props = showBar();
      input().focus();
      fireEvent.click(helpButton());
      fireEvent.keyDown(input(), { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(props.onDiscard).not.toHaveBeenCalled();
      expect(input()).toHaveFocus();
    });

    it("stays open when Escape ends an IME composition in the box", () => {
      const props = showBar();
      input().focus();
      fireEvent.click(helpButton());
      fireEvent.keyDown(input(), { key: "Escape", isComposing: true });
      fireEvent.keyDown(input(), { key: "Escape", keyCode: 229 });
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(props.onDiscard).not.toHaveBeenCalled();
    });
  });
});
