import { test } from "./lib/base-url";
import { expect, type Page } from "@playwright/test";

test("renders the landing page with links to visualizations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Neural Pathways")).toBeVisible();
  await expect(page.getByRole("link", { name: "Heatmap" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explorer", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Alien Explorer" })).toBeVisible();
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

test("regression panel fits a model for a pathway", async ({ page }) => {
  await page.goto("/explorer.html#view=correlations");
  await expect(page.getByTestId("regression-panel")).toBeVisible();

  await expect(page.getByTestId("regression-method")).toContainText("Least squares");
  await expect(page.getByTestId("regression-fit")).toContainText("R²");
  await expect(page.getByTestId("regression-rows")).toContainText("of 6427 rows");
});

test("unchecking a sparse predictor recovers most of the row count", async ({ page }) => {
  await page.goto("/explorer.html#view=correlations");

  const rows = page.getByTestId("regression-rows");
  await expect(rows).toContainText("2998");

  // Unchecking model_correct does not fully restore to 6427: 432 of the reviews are
  // synthetic-GPT rows that also lack review_stars/stars/target (the ground-truth
  // fields those reviews were never given), and those 432 are a subset of the 3429
  // rows model_correct itself drops. So the remaining predictors still listwise-delete
  // those 432 rows, landing on 5995 rather than the full 6427. Confirmed against the
  // live index.json: 6427 total reviews, 3429 missing classification/model_correct,
  // and — among those — 432 synthetic reviews additionally missing target/review_stars/
  // stars, leaving 6427 - 432 = 5995 once model_correct is excluded.
  await page.getByTestId("predictor-toggle-model_correct").click();
  await expect(rows).toContainText("5995 of 6427");
});

test("regression switches to logistic for a binary target", async ({ page }) => {
  await page.goto("/explorer.html#view=correlations");

  await page.getByTestId("regression-target").selectOption("target");
  await expect(page.getByTestId("regression-method")).toContainText("Logistic");
  await expect(page.getByTestId("regression-fit")).toContainText("baseline");
  // The target must not be offered as a predictor of itself.
  await expect(page.getByTestId("predictor-toggle-target")).toHaveCount(0);
});

test("interaction terms appear only when switched on", async ({ page }) => {
  await page.goto("/explorer.html#view=correlations");

  await expect(page.getByTestId("interactions-caution")).toHaveCount(0);
  await page.getByTestId("interactions-toggle").click();
  await expect(page.getByTestId("interactions-caution")).toBeVisible();
});

test("explorer loads the alien dataset and selects a conversation", async ({ page }) => {
  await page.goto("/explorer.html#dataset=alien");
  await expect(page.getByText("Pathway Explorer")).toBeVisible();

  // 800 conversations, and the noun comes from the dataset.
  await expect(page.locator(".results-panel-count")).toContainText("800");

  await page.getByTestId("result-card").first().click();
  await expect(page.getByTestId("item-observation")).toBeVisible();
  // voices_raised, not resource_stressed: resource_stressed is one of the alien
  // dataset's four hidden attributes (see the commissioning test below) and has
  // no chip until commissioned.
  await expect(page.getByTestId("attribute-chip-voices_raised")).toBeVisible();
});

test("explorer commissions a hidden coding", async ({ page }) => {
  await page.goto("/explorer.html#dataset=alien");
  await expect(page.getByText("Pathway Explorer")).toBeVisible();

  // Hidden before commissioning: the search finds nothing and no chip exists.
  // toHaveText (exact), not toContainText: the post-commission count turns out
  // to be 240 of 800, and "240 of 800" contains "0 of 800" as a substring, so
  // a toContainText check below would pass even if commissioning had done
  // nothing.
  const countText = page.locator(".results-panel-count");
  await expect(countText).toHaveText("800 of 800");
  await page.getByPlaceholder("voices_raised").fill("resource_stressed:1");
  await expect(countText).toHaveText("0 of 800");

  await page.getByRole("button", { name: /codings/i }).click();
  await page.getByTestId("commission-resource_stressed").click();

  await expect(countText).not.toHaveText("0 of 800");
  // The app writes the hash from a useEffect that fires a render pass after the
  // click commits, so a one-shot page.url() check can race ahead of
  // history.replaceState — poll instead, matching the pattern used below for
  // the dataset-switch hash check.
  await expect.poll(() => page.url()).toContain("coded=resource_stressed");
});

test("explorer switches back to Yelp and drops the dataset param", async ({ page }) => {
  await page.goto("/explorer.html#dataset=alien");
  await expect(page.getByTestId("result-card").first()).toBeVisible();

  await page.getByLabel("Dataset:").selectOption("yelp");
  await expect(page.getByPlaceholder("stars:5")).toBeVisible();

  // The hash is written from a useEffect that only fires once the fetched Yelp index
  // has committed to state, a render pass after the placeholder becomes visible, so a
  // one-shot page.url() check can race ahead of history.replaceState. Poll instead.
  await expect.poll(() => page.url()).not.toContain("dataset=");
});
