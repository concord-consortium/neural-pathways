import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { App } from "./app";

const mockFit = {
  source_split: "train",
  n_pathways: 2,
  explained_variance_total: 0.85,
  explained_variance_per_pathway: [0.7, 0.15],
  pathway_importance: [1.2, -0.3],
  loadings: [
    Array(780).fill(0.1),
    Array(780).fill(-0.05),
  ],
  noise_variance: Array(780).fill(0.2),
  scaler_mean: Array(780).fill(0.0),
  scaler_scale: Array(780).fill(1.0),
  pathway_score_min: [-1.0, -1.0],
  pathway_score_max: [1.0, 1.0],
};

const mockIndexWire = {
  metadata: {
    fa_fits: { "train-fa-2": mockFit },
    review_sets: { train: { count: 1, description: "Train" } },
  },
  reviews: [
    {
      id: "a3f7c2d81e09",
      sources: { train: [0] },
      text: "Great food and excellent service at this restaurant",
      target: 1,
      target_label: "positive",
      pathway_scores: { "train-fa-2": [0.5, -0.3] },
      reconstruction_r2: { "train-fa-2": 0.9 },
      pathway_variance_fractions: { "train-fa-2": [0.6, 0.3] },
    },
  ],
};

const mockBucket = {
  reviews: [
    { id: "a3f7c2d81e09", activations: Array(780).fill(0.5) },
  ],
};

const alienFit = {
  ...mockFit,
  loadings: [Array(14).fill(0.3), Array(14).fill(-0.2)],
  noise_variance: Array(14).fill(0.1),
  scaler_mean: Array(14).fill(0.0),
  scaler_scale: Array(14).fill(1.0),
};

const alienIndexWire = {
  metadata: {
    fa_fits: { "alien-fa-2": alienFit },
    review_sets: { alien: { count: 1, description: "Alien" } },
  },
  reviews: [
    {
      id: "b1c2d3e4f5a6",
      sources: { alien: [0] },
      text: "tarrak vosh krenn",
      target: 1,
      target_label: "approach",
      pathway_scores: { "alien-fa-2": [0.5, -0.3] },
      reconstruction_r2: { "alien-fa-2": 0.8 },
      pathway_variance_fractions: { "alien-fa-2": [0.6, 0.3] },
    },
  ],
};

const alienBucket = {
  reviews: [{ id: "b1c2d3e4f5a6", activations: Array(14).fill(0.5) }],
};

beforeEach(() => {
  jest.restoreAllMocks();
  window.location.hash = "";
  global.fetch = jest.fn().mockImplementation((url: string) => {
    const alien = url.startsWith("alien-data");
    if (url.includes("index.json")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(alien ? alienIndexWire : mockIndexWire) });
    }
    if (url.includes("activations/")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(alien ? alienBucket : mockBucket) });
    }
    return Promise.resolve({ ok: false, status: 404, statusText: "Not Found" });
  });
});

describe("App component", () => {
  it("shows loading state initially", () => {
    render(<App />);
    expect(screen.getByText("Loading index data...")).toBeDefined();
  });

  it("renders the FA fit selector after loading", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("train-fa-2")).toBeDefined();
    });
  });

  it("renders pathway headers after loading", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("P1")).toBeDefined();
      expect(screen.getByText("P2")).toBeDefined();
    });
  });

  it("renders the scale selector after loading", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Fixed size: blue → white → red")).toBeDefined();
    });
  });

  it("renders a 'Show Scaler' checkbox that is unchecked by default", async () => {
    render(<App />);
    await waitFor(() => {
      const checkbox = screen.getByLabelText("Show Scaler");
      expect(checkbox).toBeDefined();
      expect((checkbox as HTMLInputElement).checked).toBe(false);
    });
  });
});

describe("dataset selection", () => {
  it("defaults to yelp and offers every dataset", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Dataset:" })).toHaveValue("yelp"));
    expect(screen.getByRole("option", { name: "Alien Conversations (4 pathways)" })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("neural-pathways/data/v1/index.json"));
  });

  it("reads the dataset from the hash", async () => {
    window.location.hash = "#dataset=alien";
    render(<App />);
    expect(await screen.findByText("alien-fa-2")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith("alien-data/index.json");
    expect(global.fetch).toHaveBeenCalledWith("alien-data/activations/b1.json");
  });

  it("refetches when the selector changes and writes the choice to the hash", async () => {
    render(<App />);
    expect(await screen.findByText("train-fa-2")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Dataset:" }), { target: { value: "alien3" } });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("alien-data-3/index.json"));
    await waitFor(() => expect(window.location.hash).toContain("dataset=alien3"));
  });

  it("keeps the hash on the chosen dataset when that dataset's index fails to load", async () => {
    render(<App />);
    expect(await screen.findByText("train-fa-2")).toBeInTheDocument();
    // The first hash write is a passive effect, so it can still be pending when
    // the fit renders. Waiting for it means the assertion below is about what
    // the dataset switch did, not about a write that had not happened yet.
    await waitFor(() => expect(window.location.hash).toContain("fit=train-fa-2"));
    (global.fetch as jest.Mock).mockImplementation((url: string) => (
      url.startsWith("alien-data-3")
        ? Promise.resolve({ ok: false, status: 404, statusText: "Not Found" })
        : Promise.resolve({ ok: true, json: () => Promise.resolve(mockIndexWire) })
    ));
    fireEvent.change(screen.getByRole("combobox", { name: "Dataset:" }), { target: { value: "alien3" } });
    expect(await screen.findByText(/Error loading data/)).toBeInTheDocument();
    // The selector reads alien3, so the URL has to as well: reloading the page
    // must reopen the dataset that was chosen, not the one that last loaded.
    expect(screen.getByRole("combobox", { name: "Dataset:" })).toHaveValue("alien3");
    expect(window.location.hash).toContain("dataset=alien3");
  });

  it("uses the dataset's item noun and target label", async () => {
    window.location.hash = "#dataset=alien";
    render(<App />);
    expect(await screen.findByText("Target: approach")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Current conversation" })).toBeInTheDocument();
    expect(screen.getByText("Pathway activations for this conversation")).toBeInTheDocument();
  });

  it("still says review for yelp", async () => {
    render(<App />);
    expect(await screen.findByText("Target: positive")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Current review" })).toBeInTheDocument();
    expect(screen.getByText("Pathway activations for this review")).toBeInTheDocument();
  });

  it("falls back to yelp when dataset= is deleted from the hash by hand", async () => {
    window.location.hash = "#dataset=alien";
    render(<App />);
    expect(await screen.findByText("alien-fa-2")).toBeInTheDocument();

    await act(async () => {
      window.location.hash = "";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(await screen.findByText("train-fa-2")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("neural-pathways/data/v1/index.json"));
  });
});
