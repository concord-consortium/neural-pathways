import React from "react";
import { act, render, screen } from "@testing-library/react";
import { alien3Dataset } from "./datasets/alien3-dataset";
import { S3Item } from "./types/s3-data";
import { clearWordScoresCache, useWordScores } from "./use-word-scores";

const FIT = "alien-fa-3";
const originalFetch = global.fetch;

function itemWith(id: string, text: string): S3Item {
  return {
    id, text, sources: {}, target: null, target_label: null, pathway_scores: {}, pathway_variance_fractions: {},
  };
}

function shapReview(id: string, words: string[]) {
  return {
    id,
    words: words.map((word, i) => ({ word, scores: [i, 0, -i] })),
    base_values: [0, 0, 0],
    unmasked_values: [0, 0, 0],
  };
}

const ok = (body: unknown) => ({ ok: true, json: async () => body });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

const Probe: React.FC<{ item: S3Item }> = ({ item }) => {
  const state = useWordScores(alien3Dataset, FIT, item);
  const text = state.status === "error" ? `error: ${state.error.message}`
    : state.status === "ready" ? `ready ${JSON.stringify(state.scores)}`
    : state.status;
  return <p>{text}</p>;
};

describe("useWordScores", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    clearWordScoresCache();
    mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("loads, then gives one row per message word", async () => {
    mockFetch.mockResolvedValue(ok({ reviews: [shapReview("aa1", ["[CLS]", "hi", "there", "[SEP]"])] }));
    render(<Probe item={itemWith("aa1", "hi there")} />);
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("ready [[1,0,-1],[2,0,-2]]")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(`${alien3Dataset.baseUrl}shap/${FIT}/aa.json`);
  });

  it("is an error when the fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" });
    render(<Probe item={itemWith("aa1", "hi there")} />);
    expect(await screen.findByText(/^error: .*shap\/alien-fa-3\/aa\.json.*404 Not Found/)).toBeInTheDocument();
  });

  it("is an error when the words don't line up", async () => {
    mockFetch.mockResolvedValue(ok({ reviews: [shapReview("aa1", ["[CLS]", "hi", "zz", "[SEP]"])] }));
    render(<Probe item={itemWith("aa1", "hi there")} />);
    expect(await screen.findByText(
      'error: The word scores don\'t match the message: word 2 is "zz" in the scores but "there" in the message.',
    )).toBeInTheDocument();
  });

  it("fetches a bucket once for two messages in it", async () => {
    mockFetch.mockResolvedValue(ok({
      reviews: [shapReview("aa1", ["[CLS]", "hi", "[SEP]"]), shapReview("aa2", ["[CLS]", "yo", "[SEP]"])],
    }));
    const { unmount } = render(<Probe item={itemWith("aa1", "hi")} />);
    await screen.findByText("ready [[1,0,-1]]");
    unmount();
    render(<Probe item={itemWith("aa2", "yo")} />);
    await screen.findByText("ready [[1,0,-1]]");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("ignores a message's scores that arrive after the message changed", async () => {
    const slow = deferred<unknown>();
    mockFetch.mockImplementation((url: string) => url.endsWith("/aa.json")
      ? slow.promise
      : Promise.resolve(ok({ reviews: [shapReview("bb1", ["[CLS]", "b", "b", "[SEP]"])] })));
    const { rerender } = render(<Probe item={itemWith("aa1", "a")} />);
    rerender(<Probe item={itemWith("bb1", "b b")} />);
    await screen.findByText("ready [[1,0,-1],[2,0,-2]]");
    await act(async () => slow.resolve(ok({ reviews: [shapReview("aa1", ["[CLS]", "a", "[SEP]"])] })));
    expect(screen.getByText("ready [[1,0,-1],[2,0,-2]]")).toBeInTheDocument();
  });

  it("shows loading, not the previous message's scores, when the message changes", async () => {
    const slow = deferred<unknown>();
    mockFetch.mockImplementation((url: string) => url.endsWith("/bb.json")
      ? slow.promise
      : Promise.resolve(ok({ reviews: [shapReview("aa1", ["[CLS]", "a", "[SEP]"])] })));
    const { rerender } = render(<Probe item={itemWith("aa1", "a")} />);
    await screen.findByText("ready [[1,0,-1]]");
    rerender(<Probe item={itemWith("bb1", "b")} />);
    expect(screen.getByText("loading")).toBeInTheDocument();
    await act(async () => slow.resolve(ok({ reviews: [shapReview("bb1", ["[CLS]", "b", "[SEP]"])] })));
  });
});
