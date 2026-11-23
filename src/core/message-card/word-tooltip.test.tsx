import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useWordTooltipEvents, WordTooltipArea } from "./word-tooltip";
import type { WordScoreNote } from "./word-score-text";

/** A word that reports its hover and focus as a pathway reading's words do. */
const Word: React.FC<{ note: WordScoreNote }> = ({ note }) => {
  const events = useWordTooltipEvents();
  return (
    <span
      tabIndex={0}
      onPointerEnter={event => events.hover({ element: event.currentTarget, note })}
      onPointerLeave={event => events.hover(undefined, event.relatedTarget)}
      onFocus={event => events.focus({ element: event.currentTarget, note })}
      onBlur={() => events.focus(undefined)}
    >
      {note.word}
    </span>
  );
};

const tarrak: WordScoreNote = { kind: "score", word: "tarrak", value: -0.0624 };
const vosh: WordScoreNote = { kind: "score", word: "vosh", value: 0.1234 };
const sooma: WordScoreNote = { kind: "score", word: "sooma", value: 0.2 };
const elsewhere: WordScoreNote = { kind: "elsewhere", word: "tarrak", pathway: 0 };

const renderArea = (...notes: WordScoreNote[]) => {
  const view = render(
    <WordTooltipArea>
      {notes.map(note => <Word key={note.word} note={note} />)}
    </WordTooltipArea>
  );
  // The tooltip is aria-hidden, with no role or name to find it by.
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  const tooltip = () => view.container.querySelector<HTMLElement>(".word-tooltip");
  return { ...view, tooltip };
};

describe("WordTooltipArea", () => {
  it("shows the hovered word's score, with a U+2212 minus", () => {
    const { tooltip } = renderArea(tarrak);
    expect(tooltip()).toBeNull();
    fireEvent.pointerEnter(screen.getByText("tarrak"));
    expect(tooltip()).toHaveTextContent("tarrak: −0.0624");
    expect(screen.getByText("−0.0624")).toHaveClass("word-tooltip__value");
  });

  it("names the pathway a word scores on when it is zero here", () => {
    const { tooltip } = renderArea(elsewhere);
    fireEvent.pointerEnter(screen.getByText("tarrak"));
    expect(tooltip()).toHaveTextContent("tarrak: a Pathway 1 word");
  });

  it("shows the focused word when nothing is hovered, and a word the pointer then moves to over it", () => {
    const { tooltip } = renderArea(tarrak, vosh);
    act(() => screen.getByText("tarrak").focus());
    expect(tooltip()).toHaveTextContent("tarrak: −0.0624");
    fireEvent.pointerEnter(screen.getByText("vosh"));
    expect(tooltip()).toHaveTextContent("vosh: +0.1234");
    fireEvent.pointerLeave(screen.getByText("vosh"), { relatedTarget: document.body });
    expect(tooltip()).toHaveTextContent("tarrak: −0.0624");
  });

  it("follows the focus when it moves on while the pointer is still over the word it left", () => {
    const { tooltip } = renderArea(tarrak, vosh);
    const a = screen.getByText("tarrak");
    fireEvent.pointerEnter(a);
    act(() => a.focus());
    act(() => screen.getByText("vosh").focus());
    expect(tooltip()).toHaveTextContent("vosh: +0.1234");
    expect(tooltip()).toHaveClass("word-tooltip--focused");
  });

  it("stays while the pointer moves from the word onto it, and goes when the pointer leaves it", () => {
    const { tooltip } = renderArea(tarrak);
    const word = screen.getByText("tarrak");
    fireEvent.pointerEnter(word);
    const shown = tooltip();
    expect(shown).not.toBeNull();
    fireEvent.pointerLeave(word, { relatedTarget: shown });
    expect(tooltip()).toHaveTextContent("tarrak: −0.0624");
    fireEvent.pointerLeave(shown!, { relatedTarget: document.body });
    expect(tooltip()).toBeNull();
  });

  it("stays when the pointer moves from it back onto the word", () => {
    const { tooltip } = renderArea(tarrak);
    const word = screen.getByText("tarrak");
    fireEvent.pointerEnter(word);
    const shown = tooltip()!;
    fireEvent.pointerLeave(word, { relatedTarget: shown });
    fireEvent.pointerLeave(shown, { relatedTarget: word });
    expect(tooltip()).toHaveTextContent("tarrak: −0.0624");
  });

  it("hides on Escape without moving the focus, until the next word", () => {
    const { tooltip } = renderArea(tarrak, vosh);
    const a = screen.getByText("tarrak");
    act(() => a.focus());
    expect(tooltip()).not.toBeNull();
    fireEvent.keyDown(a, { key: "Escape" });
    expect(tooltip()).toBeNull();
    expect(a).toHaveFocus();
    act(() => screen.getByText("vosh").focus());
    expect(tooltip()).toHaveTextContent("vosh: +0.1234");
  });

  it("after Escape, shows the next word the focus moves to while the pointer is still over the first", () => {
    const { tooltip } = renderArea(tarrak, vosh);
    const a = screen.getByText("tarrak");
    fireEvent.pointerEnter(a);
    act(() => a.focus());
    fireEvent.keyDown(a, { key: "Escape" });
    expect(tooltip()).toBeNull();
    act(() => screen.getByText("vosh").focus());
    expect(tooltip()).toHaveTextContent("vosh: +0.1234");
  });

  it("after Escape, shows the next word the pointer moves to", () => {
    const { tooltip } = renderArea(tarrak, vosh);
    const a = screen.getByText("tarrak");
    act(() => a.focus());
    fireEvent.keyDown(a, { key: "Escape" });
    fireEvent.pointerEnter(screen.getByText("vosh"));
    expect(tooltip()).toHaveTextContent("vosh: +0.1234");
  });

  it("after Escape, doesn't bring back the focused word when the pointer leaves another, until it is " +
    "moved to again", () => {
    const { tooltip } = renderArea(tarrak, vosh);
    const a = screen.getByText("tarrak");
    const b = screen.getByText("vosh");
    act(() => a.focus());
    fireEvent.keyDown(a, { key: "Escape" });
    fireEvent.pointerEnter(b);
    fireEvent.pointerLeave(b, { relatedTarget: document.body });
    expect(tooltip()).toBeNull();
    fireEvent.pointerEnter(a);
    expect(tooltip()).toHaveTextContent("tarrak: −0.0624");
  });

  it("after Escape, brings back the focused word when the pointer leaves another, if the focus moved " +
    "after the Escape", () => {
    const { tooltip } = renderArea(tarrak, vosh, sooma);
    const a = screen.getByText("tarrak");
    const c = screen.getByText("sooma");
    act(() => a.focus());
    fireEvent.keyDown(a, { key: "Escape" });
    act(() => screen.getByText("vosh").focus());
    fireEvent.pointerEnter(c);
    fireEvent.pointerLeave(c, { relatedTarget: document.body });
    expect(tooltip()).toHaveTextContent("vosh: +0.1234");
  });

  it("isn't hidden by a key other than Escape", () => {
    const { tooltip } = renderArea(tarrak);
    const word = screen.getByText("tarrak");
    act(() => word.focus());
    fireEvent.keyDown(word, { key: "a" });
    expect(tooltip()).toHaveTextContent("tarrak: −0.0624");
  });

  it("hides on Escape when the pointer opened it and the focus is outside the area", () => {
    const { tooltip } = renderArea(tarrak);
    fireEvent.pointerEnter(screen.getByText("tarrak"));
    expect(document.body).toHaveFocus();
    expect(tooltip()).not.toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(tooltip()).toBeNull();
    expect(document.body).toHaveFocus();
  });

  it("lets the pointer through when the focus opened it, but not when the pointer did", () => {
    const { tooltip } = renderArea(tarrak);
    const word = screen.getByText("tarrak");
    act(() => word.focus());
    expect(tooltip()).toHaveClass("word-tooltip--focused");
    fireEvent.pointerEnter(word);
    expect(tooltip()).not.toHaveClass("word-tooltip--focused");
  });

  it("hides when the focus leaves the word", () => {
    const { tooltip } = renderArea(tarrak);
    const word = screen.getByText("tarrak");
    act(() => word.focus());
    expect(tooltip()).not.toBeNull();
    act(() => word.blur());
    expect(tooltip()).toBeNull();
  });

  it("is hidden from screen readers", () => {
    const { tooltip } = renderArea(tarrak);
    fireEvent.pointerEnter(screen.getByText("tarrak"));
    expect(tooltip()).toHaveAttribute("aria-hidden", "true");
  });

  it("does nothing outside an area", () => {
    render(<Word note={tarrak} />);
    const word = screen.getByText("tarrak");
    expect(() => {
      fireEvent.pointerEnter(word);
      act(() => word.focus());
      fireEvent.pointerLeave(word, { relatedTarget: document.body });
      act(() => word.blur());
    }).not.toThrow();
  });
});
