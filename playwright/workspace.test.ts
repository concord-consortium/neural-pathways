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
  await expect(page.getByPlaceholder("stars:5")).toBeVisible();
});

test("explorer shows attribute chips for a selected review", async ({ page }) => {
  await page.goto("/explorer.html");
  await expect(page.getByText("Pathway Explorer")).toBeVisible();

  // Capture the unfiltered "N of M" count before filtering, so we can wait for it to
  // change. The results panel header renders this via results-panel.tsx.
  const countText = page.locator(".results-panel-count");
  const initialCount = await countText.textContent();

  // Restrict to reviews that carry a model prediction, so model_correct is defined.
  await page.getByPlaceholder("stars:5").fill("model_correct:1");

  // The app filters via useDeferredValue, so the results list re-renders a beat after
  // the query changes. Wait for the header count to change before clicking the first
  // card, otherwise the click can land on the pre-filter card that briefly remains.
  await expect(countText).not.toHaveText(initialCount ?? "");
  await page.locator("[data-testid='result-card']").first().click();

  await expect(page.getByTestId("attribute-chips")).toBeVisible();
  await expect(page.getByTestId("attribute-chip-model_correct")).toContainText("yes");
});

test("explorer search help lists attribute fields", async ({ page }) => {
  await page.goto("/explorer.html");
  await page.getByLabel("Search help").click();
  await expect(page.getByText("Attributes")).toBeVisible();
  await expect(page.getByText("is_synthetic")).toBeVisible();
});
