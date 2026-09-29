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

// The first and third are classified Wait, the second Approach.
const items = [0, 6, 1].map(i => fixture.conversations[i]).map(c => item(c.id, c.text, c.classification));
const ids = items.map(i => i.id);
const index: S3Index = { metadata: { fa_fits: {}, review_sets: {} }, items };

function viewWith(shared: SharedState) {
  return (
    <ViewStateProvider viewId="trace-a-case" view={undefined} shared={shared}>
      <TraceACase />
    </ViewStateProvider>
  );
}

function showView(shared = new SharedState({})) {
  render(viewWith(shared));
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

  it("draws the network for the conversation shown", async () => {
    setReducedMotion();
    showView();
    await screen.findByText("1 / 3");
    const stepToAnswer = () => fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
    stepToAnswer();
    expect(screen.getByRole("img", { name: /predicts Wait/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    stepToAnswer();
    expect(screen.getByRole("img", { name: /predicts Approach/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous conversation" }));
    stepToAnswer();
    expect(screen.getByRole("img", { name: /predicts Wait/ })).toBeInTheDocument();
  });

  it("names the network's section by its heading", async () => {
    showView();
    await screen.findByText("1 / 3");
    expect(screen.getByRole("region", { name: "The Network" })).toBeInTheDocument();
  });

  it("opens straight on the saved conversation when the conversations are already loaded", async () => {
    const shared = new SharedState({});
    const { unmount } = render(viewWith(shared));
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    unmount();
    showView(shared);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.queryByText("Loading conversations…")).not.toBeInTheDocument();
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
    expect(await screen.findByRole("alert")).toHaveTextContent("The conversations could not be loaded: offline");
  });

  it("says the conversations couldn't be shown when correcting the conversation fails", async () => {
    const shared = new SharedState({});
    jest.spyOn(shared, "ensureValidConversation").mockImplementation(() => {
      throw new Error("bad list");
    });
    showView(shared);
    expect(await screen.findByRole("alert")).toHaveTextContent("The conversations could not be shown: bad list");
  });

  it("says so when there are no conversations, and leaves the saved conversation alone", async () => {
    mockedFetchIndex.mockResolvedValue({ ...index, items: [] });
    const shared = showView(new SharedState({ conversationId: ids[1] }));
    expect(await screen.findByText("No conversations.")).toBeInTheDocument();
    expect(shared.conversationId).toBe(ids[1]);
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
