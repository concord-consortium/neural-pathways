import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { fetchIndex } from "../../core/data-loader";
import fixture from "../../core/network/__fixtures__/toy-network-conversations.json";
import { SharedState } from "../../core/state/shared-state";
import { ViewStateProvider } from "../../core/state/view-state-context";
import { S3Index, S3Item } from "../../core/types/s3-data";
import { clearDatasetIndexCache } from "../../core/use-dataset-index";
import { TraceACase } from "./trace-a-case";

jest.mock("../../core/data-loader", () => ({ fetchIndex: jest.fn() }));
const mockedFetchIndex = fetchIndex as jest.MockedFunction<typeof fetchIndex>;

function item(id: string, text: string, classification: number): S3Item {
  return {
    id, text, classification,
    sources: { alien3: [0] },
    target: classification,
    target_label: null,
    pathway_scores: {},
    pathway_variance_fractions: {},
  };
}

// The first is classified Wait.
const items = fixture.conversations.slice(0, 3).map(c => item(c.id, c.text, c.classification));
const ids = items.map(i => i.id);
const index: S3Index = { metadata: { fa_fits: {}, review_sets: {} }, items };

function showView(shared = new SharedState({})) {
  render(
    <ViewStateProvider viewId="trace-a-case" view={undefined} shared={shared}>
      <TraceACase />
    </ViewStateProvider>,
  );
  return shared;
}

function setReducedMotion() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn().mockReturnValue({ matches: true }),
  });
}

describe("TraceACase", () => {
  beforeEach(() => {
    clearDatasetIndexCache();
    mockedFetchIndex.mockReset();
    mockedFetchIndex.mockResolvedValue(index);
  });

  afterEach(() => {
    delete (window as any).matchMedia;
  });

  it("shows loading, then the first conversation and the network", async () => {
    showView();
    expect(screen.getByRole("heading", { name: "Trace a Case" })).toBeInTheDocument();
    expect(screen.getByText("Loading conversations…")).toBeInTheDocument();
    expect(await screen.findByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText(items[0].text.split(/\s+/).join(" "))).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The Network" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Network diagram" })).toBeInTheDocument();
  });

  it("sets the shared conversation once the conversations arrive", async () => {
    const shared = showView();
    await screen.findByText("1 / 3");
    expect(shared.conversationId).toBe(ids[0]);
  });

  it("moves the shared conversation with next and previous", async () => {
    const shared = showView();
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(shared.conversationId).toBe(ids[1]);
    fireEvent.click(screen.getByRole("button", { name: "Previous conversation" }));
    expect(shared.conversationId).toBe(ids[0]);
  });

  it("opens on the saved conversation", async () => {
    showView(new SharedState({ conversationId: ids[2] }));
    expect(await screen.findByText("3 / 3")).toBeInTheDocument();
  });

  it("falls back to the first conversation for an unknown id", async () => {
    const shared = showView(new SharedState({ conversationId: "000000000000" }));
    expect(await screen.findByText("1 / 3")).toBeInTheDocument();
    expect(shared.conversationId).toBe(ids[0]);
  });

  it("shows an error when the conversations can't load", async () => {
    mockedFetchIndex.mockReset();
    mockedFetchIndex.mockRejectedValue(new Error("offline"));
    showView();
    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
  });

  it("says so when there are no conversations", async () => {
    mockedFetchIndex.mockResolvedValue({ ...index, items: [] });
    showView();
    expect(await screen.findByText("No conversations.")).toBeInTheDocument();
  });

  it("reveals the network's answer at Step 4", async () => {
    setReducedMotion();
    showView();
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
    expect(screen.getByRole("img", { name: "Network diagram. The network predicts Wait." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step 4" })).toHaveAttribute("aria-pressed", "true");
  });

  it("starts the steps over when the conversation changes", async () => {
    setReducedMotion();
    showView();
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
    expect(screen.getByRole("button", { name: "Reset" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Step 2" })).toHaveAttribute("aria-pressed", "false");
  });
});
