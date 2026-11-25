import React, { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { wordFill } from "../colors";
import { PathwayReading } from "./pathway-reading";
import { wordTooltip } from "./test-helpers";
import { WordTooltipArea } from "./word-tooltip";

const words = ["tarrak", "blikka", "oradda", "sooma"];
const scores = [
  [0.0624, 0, 0],
  [0, 0, 0],
  [0, 0.26, -0.13],
  [-0.2, 0, 0],
];
const max = 0.26;

interface HarnessProps {
  pathways?: number[];
  words?: string[];
  scores?: number[][];
  onCurrentChange?: (index: number) => void;
  initialCurrent?: number;
}

/** Holds the current word, as the view does, for one or more readings in a tooltip area. */
const Harness: React.FC<HarnessProps> = props => {
  const [current, setCurrent] = useState<number | undefined>(props.initialCurrent);
  const onCurrentChange = (index: number) => {
    setCurrent(index);
    props.onCurrentChange?.(index);
  };
  return (
    <WordTooltipArea>
      {(props.pathways ?? [0]).map(pathway => (
        <PathwayReading key={pathway} pathway={pathway} words={props.words ?? words}
          scores={"scores" in props ? props.scores : scores} max={max}
          current={current} onCurrentChange={onCurrentChange} />
      ))}
    </WordTooltipArea>
  );
};

const options = (pathway = 1) =>
  within(screen.getByRole("listbox", { name: `Pathway ${pathway}` })).getAllByRole("option");

describe("PathwayReading", () => {
  it("shows plain words, and no listbox, while the scores load", () => {
    render(<Harness scores={undefined} />);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("option")).toBeNull();
    for (const word of words) {
      expect(screen.getByText(word)).toBeInTheDocument();
    }
    expect(screen.getByText("Pathway 1")).toBeInTheDocument();
  });

  it("is a listbox named by its pathway, with an option for every word", () => {
    render(<Harness />);
    expect(screen.getByRole("listbox", { name: "Pathway 1" })).toBeInTheDocument();
    expect(options()).toHaveLength(4);
  });

  it("colors only the words that score on its pathway", () => {
    render(<Harness />);
    const [tarrak, blikka, oradda] = options();
    const fill = wordFill(0.0624, max);
    expect(tarrak).toHaveStyle({ backgroundColor: fill.background, color: fill.text });
    expect(blikka.style.backgroundColor).toBe("");
    expect(oradda.style.backgroundColor).toBe("");
  });

  it("colors a word in every reading whose pathway it scores on", () => {
    render(<Harness pathways={[0, 1, 2]} />);
    expect(options(1)[2].style.backgroundColor).toBe("");
    expect(options(2)[2]).toHaveStyle({ backgroundColor: wordFill(0.26, max).background });
    expect(options(3)[2]).toHaveStyle({ backgroundColor: wordFill(-0.13, max).background });
  });

  it("names each option by its score here", () => {
    render(<Harness />);
    expect(options().map(option => option.textContent)).toEqual(words);
    const listbox = screen.getByRole("listbox", { name: "Pathway 1" });
    expect(within(listbox).getByRole("option", { name: "tarrak, plus 0.0624" })).toBe(options()[0]);
    expect(within(listbox).getByRole("option", { name: "blikka" })).toBe(options()[1]);
    expect(within(listbox).getByRole("option", { name: "oradda, a Pathway 2 word" })).toBe(options()[2]);
    expect(within(listbox).getByRole("option", { name: "sooma, minus 0.2000" })).toBe(options()[3]);
  });

  it("marks every word with a tooltip, colored or not, for the help cursor", () => {
    render(<Harness />);
    expect(options().map(option => option.classList.contains("pathway-reading__word--noted")))
      .toEqual([true, false, true, true]);
  });

  it("makes the first word the only Tab stop until one is current, then the current word", () => {
    const { rerender } = render(
      <PathwayReading pathway={0} words={words} scores={scores} max={max} current={undefined}
        onCurrentChange={jest.fn()} />
    );
    expect(options().map(option => option.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(options().map(option => option.getAttribute("aria-selected"))).toEqual(
      ["false", "false", "false", "false"]);
    rerender(
      <PathwayReading pathway={0} words={words} scores={scores} max={max} current={2}
        onCurrentChange={jest.fn()} />
    );
    expect(options().map(option => option.tabIndex)).toEqual([-1, -1, 0, -1]);
    expect(options().map(option => option.getAttribute("aria-selected"))).toEqual(
      ["false", "false", "true", "false"]);
  });

  it("makes the first word the Tab stop when the current word is past the end", () => {
    render(
      <PathwayReading pathway={0} words={words} scores={scores} max={max} current={7}
        onCurrentChange={jest.fn()} />
    );
    expect(options().map(option => option.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it("makes the first word current when the reading is tabbed into", () => {
    const onCurrentChange = jest.fn();
    render(<Harness onCurrentChange={onCurrentChange} />);
    act(() => options()[0].focus());
    expect(onCurrentChange).toHaveBeenCalledWith(0);
    expect(options()[0]).toHaveAttribute("aria-selected", "true");
  });

  it("moves with the arrow keys, Home and End, and stops at the ends", () => {
    render(<Harness />);
    act(() => options()[0].focus());
    let focused = 0;
    const press = (key: string, expected: number) => {
      expect(fireEvent.keyDown(options()[focused], { key })).toBe(false);
      expect(options()[expected]).toHaveFocus();
      focused = expected;
      expect(options()[expected]).toHaveAttribute("aria-selected", "true");
      expect(options()[expected].tabIndex).toBe(0);
    };
    press("ArrowRight", 1);
    press("ArrowDown", 2);
    press("ArrowLeft", 1);
    press("ArrowUp", 0);
    press("ArrowLeft", 0);
    press("ArrowUp", 0);
    press("End", 3);
    press("ArrowRight", 3);
    press("ArrowDown", 3);
    press("Home", 0);
  });

  it("leaves other keys alone, and the browser's shortcuts with a modifier", () => {
    render(<Harness />);
    // From the second word, so a key handled as ← or Home would move the focus.
    const blikka = options()[1];
    act(() => blikka.focus());
    const events = [
      { key: "a" },
      { key: "Tab" },
      { key: "Escape" },
      { key: "ArrowLeft", altKey: true },
      { key: "ArrowLeft", metaKey: true },
      { key: "Home", ctrlKey: true },
    ];
    for (const event of events) {
      expect(fireEvent.keyDown(blikka, event)).toBe(true);
      expect(blikka).toHaveFocus();
    }
  });

  it("makes a focused word current", () => {
    const onCurrentChange = jest.fn();
    render(<Harness onCurrentChange={onCurrentChange} />);
    // A browser focuses a clicked option, since it has a tabindex, so this is what a click does. jsdom's
    // click doesn't focus; the Playwright tests click for real.
    const sooma = options()[3];
    act(() => sooma.focus());
    expect(onCurrentChange).toHaveBeenLastCalledWith(3);
    expect(sooma).toHaveFocus();
    expect(sooma).toHaveAttribute("aria-selected", "true");
  });

  it("moves by index when a word repeats", () => {
    render(<Harness words={["aa", "bb", "aa"]} scores={[[0.1, 0, 0], [0, 0, 0], [0.1, 0, 0]]} />);
    act(() => options()[0].focus());
    fireEvent.keyDown(options()[0], { key: "ArrowRight" });
    expect(options()[1]).toHaveFocus();
    fireEvent.keyDown(options()[1], { key: "ArrowRight" });
    expect(options()[2]).toHaveFocus();
    expect(options()[0]).toHaveAttribute("aria-selected", "false");
  });

  it("shows a word's tooltip on hover and on focus, and none for a word that is zero everywhere", () => {
    render(<Harness />);
    const [tarrak, blikka] = options();
    fireEvent.pointerEnter(tarrak);
    expect(wordTooltip()).toHaveTextContent("tarrak: +0.0624");
    fireEvent.pointerLeave(tarrak, { relatedTarget: document.body });
    expect(wordTooltip()).toBeNull();
    fireEvent.pointerEnter(blikka);
    expect(wordTooltip()).toBeNull();
    fireEvent.pointerLeave(blikka, { relatedTarget: document.body });
    act(() => tarrak.focus());
    expect(wordTooltip()).toHaveTextContent("tarrak: +0.0624");
    act(() => tarrak.blur());
    expect(wordTooltip()).toBeNull();
  });

  it("keeps the tooltip while the pointer moves from the word onto it", () => {
    render(<Harness />);
    const tarrak = options()[0];
    fireEvent.pointerEnter(tarrak);
    fireEvent.pointerLeave(tarrak, { relatedTarget: wordTooltip() });
    expect(wordTooltip()).toHaveTextContent("tarrak: +0.0624");
  });

  it("moves the tooltip with the arrow keys from a word focused under the pointer, and after Escape", () => {
    render(<Harness />);
    const [, , oradda, sooma] = options();
    fireEvent.pointerEnter(oradda);
    act(() => oradda.focus());
    fireEvent.keyDown(oradda, { key: "ArrowRight" });
    expect(sooma).toHaveFocus();
    expect(wordTooltip()).toHaveTextContent("sooma: −0.2000");
    fireEvent.keyDown(sooma, { key: "Escape" });
    expect(wordTooltip()).toBeNull();
    fireEvent.keyDown(sooma, { key: "ArrowLeft" });
    expect(oradda).toHaveFocus();
    expect(wordTooltip()).toHaveTextContent("oradda: a Pathway 2 word");
  });

  it("shows no tooltip once the arrow keys move from a word focused under the pointer to one that is zero " +
    "everywhere", () => {
    render(<Harness />);
    const [tarrak, blikka, oradda] = options();
    fireEvent.pointerEnter(tarrak);
    act(() => tarrak.focus());
    fireEvent.keyDown(tarrak, { key: "ArrowRight" });
    expect(blikka).toHaveFocus();
    expect(wordTooltip()).toBeNull();
    fireEvent.keyDown(blikka, { key: "ArrowRight" });
    expect(oradda).toHaveFocus();
    expect(wordTooltip()).toHaveTextContent("oradda: a Pathway 2 word");
  });

  it("shows no tooltip while the pointer is over a word that is zero everywhere, even with another focused", () => {
    render(<Harness />);
    const [tarrak, blikka] = options();
    act(() => tarrak.focus());
    expect(wordTooltip()).toHaveTextContent("tarrak: +0.0624");
    fireEvent.pointerEnter(blikka);
    expect(wordTooltip()).toBeNull();
    fireEvent.pointerLeave(blikka, { relatedTarget: document.body });
    expect(wordTooltip()).toHaveTextContent("tarrak: +0.0624");
  });

  it("shares the current word between two readings", () => {
    render(<Harness pathways={[0, 1]} />);
    act(() => options(1)[2].focus());
    expect(options(2).map(option => option.tabIndex)).toEqual([-1, -1, 0, -1]);
    expect(options(2)[2]).toHaveAttribute("aria-selected", "true");
  });
});
