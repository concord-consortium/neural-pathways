import { test } from "./lib/base-url";
import { expect } from "@playwright/test";

test("renders the landing page with links to visualizations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Neural Pathways")).toBeVisible();
  await expect(page.getByRole("link", { name: "Heatmap" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explorer" })).toBeVisible();
});

test("heatmap renders the visualization", async ({ page }) => {
  await page.goto("/heatmap.html");
  await expect(page.getByText("P1")).toBeVisible();
  await expect(page.getByText("Sentiment:")).toBeVisible();
});

test("explorer renders the app", async ({ page }) => {
  await page.goto("/explorer.html");
  await expect(page.getByText("Pathway Explorer")).toBeVisible();
  await expect(page.getByText("Search by review")).toBeVisible();
});
