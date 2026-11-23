import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { fetchIndex, fetchShap } from "../../core/data-loader";
import fixture from "../../core/network/__fixtures__/alien3-messages.json";
import { fixtureMetadata } from "../../core/network/__fixtures__/alien3-network";
import { SharedState } from "../../core/state/shared-state";
import { ViewStateProvider } from "../../core/state/view-state-context";
import { ItemShapData, S3FaFit, S3Index, S3Item } from "../../core/types/s3-data";
import { clearDatasetIndexCache } from "../../core/use-dataset-index";
import { clearWordScoresCache } from "../../core/use-word-scores";
import { ModelReasoning } from "./model-reasoning";

jest.mock("../../core/data-loader", () => ({ fetchIndex: jest.fn(), fetchShap: jest.fn() }));
const mockedFetchIndex = fetchIndex as jest.MockedFunction<typeof fetchIndex>;
const mockedFetchShap = fetchShap as jest.MockedFunction<typeof fetchShap>;

function item(id: string, text: string, classification: number): S3Item {
  return {
    id, text, classification,
    sources: { alien3: [0] },
    target: classification,
    target_label: null,
    observation: `Notes on ${id}.`,
    pathway_scores: {},
    pathway_variance_fractions: {},
  };
}

const items = [0, 6, 1].map(i => fixture.messages[i])
  .map(c => item(c.id, c.text, c.classification));
const index: S3Index = { metadata: fixtureMetadata, items };

/** A word scores 0.1 on one pathway, chosen by its first letter, so every reading has colored words. */
function scoresFor(word: string): number[] {
  const scores = [0, 0, 0];
  scores[word.charCodeAt(0) % 3] = 0.1;
  return scores;
}

/** The message's SHAP words as the generator writes them: [CLS], then each line's words and a [SEP]. */
function shapFor(message: S3Item): ItemShapData {
  const words = [{ word: "[CLS]", scores: [0, 0, 0] }];
  for (const line of message.text.split("\n")) {
    for (const word of line.split(" ")) {
      words.push({ word, scores: scoresFor(word) });
    }
    words.push({ word: "[SEP]", scores: [0, 0, 0] });
  }
  return { words, base_values: [0, 0, 0], unmasked_values: [0, 0, 0] };
}

function showView(shared = new SharedState({})) {
  return render(
    <ViewStateProvider viewId="model-reasoning" view={undefined} shared={shared}>
      <ModelReasoning />
    </ViewStateProvider>,
  );
}

const filterBox = () => screen.getByRole("textbox", { name: "Filter" });
const card = () => screen.getByRole("region", { name: "Message" });
const nextMessage = () => fireEvent.click(screen.getByRole("button", { name: "Next message" }));
const wordsOf = (i: number) => items[i].text.split(/\s+/).join(" ");
const options = (pathway: number) =>
  within(screen.getByRole("listbox", { name: `Pathway ${pathway}` })).getAllByRole("option");
const readings = () => screen.findAllByRole("listbox");

// The tooltip is aria-hidden, with no role or name to find it by.
// eslint-disable-next-line testing-library/no-node-access
const tooltip = () => document.querySelector<HTMLElement>(".word-tooltip");

describe("ModelReasoning", () => {
  beforeEach(() => {
    clearDatasetIndexCache();
    clearWordScoresCache();
    mockedFetchIndex.mockReset();
    mockedFetchIndex.mockResolvedValue(index);
    mockedFetchShap.mockReset();
    mockedFetchShap.mockImplementation(async (_dataset, id) => shapFor(items.find(i => i.id === id)!));
  });

  it("shows loading, then the filter and About above a card with three readings", async () => {
    showView();
    expect(screen.getByRole("heading", { name: "Neural Pathway View of Model Reasoning" })).toBeInTheDocument();
    expect(screen.getByText("Loading messages…")).toBeInTheDocument();
    expect(await screen.findByText("1 / 3")).toBeInTheDocument();
    const about = screen.getByRole("button", { name: "About Neural Pathway View of Model Reasoning" });
    // Neither contains the other, so each follows the one before it and nothing more.
    expect(filterBox().compareDocumentPosition(about)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(about.compareDocumentPosition(card())).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(within(card()).getByRole("img", { name: /^Word contribution/ })).toBeInTheDocument();
    expect(await within(card()).findAllByRole("listbox")).toHaveLength(3);
    for (const pathway of [1, 2, 3]) {
      expect(within(card()).getByRole("listbox", { name: `Pathway ${pathway}` })).toBeInTheDocument();
    }
  });

  it("shows the words uncolored while their scores load", async () => {
    mockedFetchShap.mockReturnValue(new Promise(() => undefined));
    showView();
    await screen.findByText("1 / 3");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(card()).toHaveTextContent(wordsOf(0));
    expect(within(card()).getByRole("img", { name: /^Word contribution/ })).toBeInTheDocument();
    for (const pathway of [1, 2, 3]) {
      expect(within(card()).getByText(`Pathway ${pathway}`)).toBeInTheDocument();
    }
  });

  it("says when the word scores can't be loaded, and still steps", async () => {
    mockedFetchShap.mockRejectedValue(new Error("offline"));
    showView();
    await screen.findByText("1 / 3");
    expect(await within(card()).findByRole("alert"))
      .toHaveTextContent(/^The word scores could not be loaded: offline$/);
    expect(within(card()).getByRole("img", { name: /^Word contribution/ })).toBeInTheDocument();
    nextMessage();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(await within(card()).findByRole("alert")).toHaveTextContent("The word scores could not be loaded:");
  });

  it("says the word scores can't be shown when they don't match the message", async () => {
    mockedFetchShap.mockResolvedValue({ words: [], base_values: [], unmasked_values: [] });
    showView();
    expect(await within(await screen.findByRole("region", { name: "Message" })).findByRole("alert"))
      .toHaveTextContent(/^The word scores could not be shown: The word scores have 0 words but the message has/);
  });

  it("says when the data has no word score maximum", async () => {
    const [fitName, fit] = Object.entries(fixtureMetadata.fa_fits)[0];
    const { word_score_max: _max, ...fitWithoutMax } = fit;
    mockedFetchIndex.mockResolvedValue({
      ...index,
      metadata: { ...fixtureMetadata, fa_fits: { [fitName]: fitWithoutMax as S3FaFit } },
    });
    showView();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The messages could not be shown: " +
      "The alien3 data has no word score maximum. Run npm run generate:alien to generate it.");
    expect(screen.queryByRole("region", { name: "Message" })).toBeNull();
  });

  it("says the messages can't be shown when the filter's attributes are bad, on every mount", async () => {
    const badAttribute = { key: "pathway_1", label: "Pathway 1", description: "", type: "binary" as const };
    mockedFetchIndex.mockResolvedValue({ ...index, metadata: { ...fixtureMetadata, attributes: [badAttribute] } });
    const alert = "The messages could not be shown: " +
      'Attribute key "pathway_1" collides with the reserved pathway_<n> pattern';
    const { unmount } = showView();
    expect(await screen.findByRole("alert")).toHaveTextContent(alert);
    unmount();
    // The index is cached now, so this mount starts ready and renders before onLoaded runs.
    showView();
    expect(screen.getByRole("alert")).toHaveTextContent(alert);
  });

  it("shares the current word across the three readings", async () => {
    showView();
    await readings();
    const word = options(1)[3];
    act(() => word.focus());
    fireEvent.click(word);
    for (const pathway of [2, 3]) {
      expect(options(pathway)[3].tabIndex).toBe(0);
      expect(options(pathway)[3]).toHaveAttribute("aria-selected", "true");
    }
  });

  it("clears the current word when the message changes", async () => {
    showView();
    await readings();
    const word = options(1)[3];
    act(() => word.focus());
    fireEvent.click(word);
    nextMessage();
    await readings();
    for (const pathway of [1, 2, 3]) {
      expect(options(pathway)[0].tabIndex).toBe(0);
      expect(options(pathway).filter(option => option.getAttribute("aria-selected") === "true")).toEqual([]);
    }
  });

  it("drops the tooltip when the message changes", async () => {
    showView();
    await readings();
    fireEvent.pointerEnter(options(1)[0]);
    expect(tooltip()).not.toBeNull();
    nextMessage();
    expect(tooltip()).toBeNull();
    await readings();
  });

  it("says no messages match when the filter matches none", async () => {
    showView();
    await readings();
    fireEvent.change(filterBox(), { target: { value: "n:9" } });
    fireEvent.keyDown(filterBox(), { key: "Enter" });
    expect(card()).toHaveTextContent("No messages match that search.");
  });
});
