import { test } from "./lib/base-url";
import { expect, type Page } from "@playwright/test";

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

test("explorer switches to the correlations view and drills into a cell", async ({ page }) => {
  await page.goto("/explorer.html");
  await expect(page.getByText("Pathway Explorer")).toBeVisible();

  await page.getByRole("button", { name: "Correlations" }).click();
  await expect(page.getByTestId("correlations-view")).toBeVisible();
  await expect(page.getByTestId("correlation-matrix")).toBeVisible();
  await expect(page.getByTestId("drilldown-prompt")).toBeVisible();

  // A binary attribute against a pathway gives the group-comparison drill-down,
  // labelled from the dataset config rather than a hardcoded yes/no.
  await page.getByTestId("cell-target-pathway_0").click();
  await expect(page.getByTestId("distribution-comparison")).toBeVisible();
  await expect(page.getByTestId("group-row-1")).toContainText("positive");
  await expect(page.getByTestId("drilldown-summary")).toContainText("n =");

  // review_stars is declared "integer" but has only five distinct values, so the
  // drill-down routes on cardinality and gives the group comparison too.
  await page.getByTestId("cell-review_stars-pathway_0").click();
  await expect(page.getByTestId("distribution-comparison")).toBeVisible();
  await expect(page.getByTestId("group-row-5")).toBeVisible();
  await expect(page.getByTestId("scatter-plot")).toHaveCount(0);

  // A genuinely continuous row — a pathway — gives the scatter drill-down.
  await page.getByTestId("cell-pathway_1-pathway_0").click();
  await expect(page.getByTestId("scatter-plot")).toBeVisible();
});

test("correlation matrix is scoped to the search results", async ({ page }) => {
  await page.goto("/explorer.html");
  await page.getByPlaceholder("stars:5").fill("model_correct:0");
  await page.getByRole("button", { name: "Correlations" }).click();

  // The 145 misclassified test-split reviews. Anchor to the scope element's resultCount
  // slot (rendered as "Correlations over <strong>145</strong> of {total} reviews") rather
  // than matching "145" anywhere in the view, so this can't be satisfied by the total count.
  await expect(page.getByTestId("correlations-scope")).toContainText("145 of ");
});

test("correlations view survives a reload via the url hash", async ({ page }) => {
  await page.goto("/explorer.html#view=correlations");
  await expect(page.getByTestId("correlations-view")).toBeVisible();
});

/** Measures how the correlations panel sits inside .explorer-body. */
async function measureCorrelationsLayout(page: Page) {
  return page.evaluate(() => {
    const view = document.querySelector(".explorer-correlations-view") as HTMLElement;
    const body = document.querySelector(".explorer-body") as HTMLElement;
    const results = document.querySelector(".results-panel") as HTMLElement;
    const wrapper = document.querySelector(".explorer-correlations-matrix-wrapper") as HTMLElement;
    const gap = parseFloat(getComputedStyle(body).columnGap) || 0;
    return {
      pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      wrapperScrolls: wrapper.scrollWidth > wrapper.clientWidth,
      viewWidth: view.getBoundingClientRect().width,
      availableWidth: body.getBoundingClientRect().width - results.getBoundingClientRect().width - gap,
    };
  });
}

test("the correlations panel fills the body row beside the results panel", async ({ page }) => {
  // Wide enough that the matrix is narrower than the space beside the results
  // panel. Without flex: 1 the panel is sized to its content and stops short,
  // leaving a ragged gap at the right edge of the body.
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/explorer.html#view=correlations");
  await expect(page.getByTestId("correlation-matrix")).toBeVisible();

  const layout = await measureCorrelationsLayout(page);
  expect(layout.wrapperScrolls).toBe(false);
  expect(layout.viewWidth).toBeCloseTo(layout.availableWidth, 0);
  expect(layout.pageOverflows).toBe(false);
});

test("a matrix too wide to fit scrolls inside its wrapper, not the page", async ({ page }) => {
  // Narrow enough that the matrix cannot fit, so the scroll container has to engage.
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto("/explorer.html#view=correlations");
  await expect(page.getByTestId("correlation-matrix")).toBeVisible();

  const layout = await measureCorrelationsLayout(page);
  expect(layout.wrapperScrolls).toBe(true);
  expect(layout.viewWidth).toBeCloseTo(layout.availableWidth, 0);
  expect(layout.pageOverflows).toBe(false);
});

test("a discrete drill-down shows one labelled bar per value, with no gaps", async ({ page }) => {
  await page.goto("/explorer.html");
  await page.getByRole("button", { name: "Correlations" }).click();
  await page.getByTestId("cell-review_stars-stars").click();

  await expect(page.getByTestId("distribution-comparison")).toBeVisible();

  // One shared axis under the whole stack, not one per row.
  await expect(page.getByTestId("histogram-axis")).toHaveCount(1);

  // Business rating is half-star valued, so every bar is a real value and none of
  // the bins are the empty spacers that 20 continuous bins used to produce.
  const firstRow = page.getByTestId("group-row-1");
  const bars = firstRow.getByTestId("group-bar-hit");
  const barCount = await bars.count();
  expect(barCount).toBeGreaterThan(1);
  expect(barCount).toBeLessThanOrEqual(20);

  const axisTicks = await page.getByTestId("axis-tick").count();
  expect(axisTicks).toBe(barCount);
});

test("histogram bars report their value and count on hover", async ({ page }) => {
  await page.goto("/explorer.html");
  await page.getByRole("button", { name: "Correlations" }).click();
  await page.getByTestId("cell-review_stars-stars").click();

  const firstBar = page.getByTestId("group-row-1").getByTestId("group-bar-hit").first();
  await expect(firstBar.locator("title")).toContainText("Business rating");
  await expect(firstBar.locator("title")).toContainText("reviews");
});

test("a continuous drill-down labels both scatter axes", async ({ page }) => {
  await page.goto("/explorer.html");
  await page.getByRole("button", { name: "Correlations" }).click();
  await page.getByTestId("cell-pathway_1-pathway_0").click();

  await expect(page.getByTestId("scatter-plot")).toBeVisible();
  await expect(page.getByTestId("scatter-x-min")).not.toBeEmpty();
  await expect(page.getByTestId("scatter-x-max")).not.toBeEmpty();
  await expect(page.getByTestId("scatter-y-min")).not.toBeEmpty();
  await expect(page.getByTestId("scatter-y-max")).not.toBeEmpty();
});
