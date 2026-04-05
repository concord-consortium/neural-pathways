import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "./app";
import { S3Index } from "../../shared/types/s3-data";

const mockFit = {
  source_split: "train",
  n_pathways: 2,
  explained_variance_total: 0.85,
  explained_variance_per_pathway: [0.7, 0.15],
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

const mockIndex: S3Index = {
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

beforeEach(() => {
  jest.restoreAllMocks();
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes("index.json")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockIndex) });
    }
    if (url.includes("activations/")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBucket) });
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
