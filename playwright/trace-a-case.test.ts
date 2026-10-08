import { test } from "./lib/base-url";
import { expect, type Locator, type Page } from "@playwright/test";

test("Trace a Case steps through the 800 conversations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next conversation" }).click();
  await expect(page.getByText("2 / 800", { exact: true })).toBeVisible();
});

test("Step 4 animates to the network's answer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Step 4" }).click();
  // The step takes a few seconds, so the answer isn't named yet.
  await expect(page.getByRole("img", { name: "Network diagram", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /The network predicts (Approach|Wait)\./ }))
    .toBeVisible({ timeout: 10_000 });
});

test("each conversation's steps survive switching views", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Step 3" }).click();
  await page.getByRole("button", { name: "Next conversation" }).click();
  await page.getByRole("button", { name: "Step 1" }).click();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(page.getByText("2 / 800", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Step 1" })).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: "Previous conversation" }).click();
  await expect(page.getByRole("button", { name: "Step 3" })).toHaveAttribute("aria-current", "step");
});

test("the conversation survives switching views", async ({ page }) => {
  await page.goto("/");
  const next = page.getByRole("button", { name: "Next conversation" });
  await next.click();
  await next.click();
  await expect(page.getByText("3 / 800", { exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(page.getByText("3 / 800", { exact: true })).toBeVisible();
});

test("the filter narrows the conversations Trace a Case steps through", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const filter = page.getByRole("textbox", { name: "Filter" });
  await filter.fill("model_correct:0");
  await expect(page.getByText("64 of 800", { exact: true })).toBeVisible();
  await expect(page.getByText("1 / 64", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next conversation" }).click();
  await expect(page.getByText("2 / 64", { exact: true })).toBeVisible();
});

test("a finished query is kept when switching views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Filter" }).fill("model_correct:0");
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(page.getByText("1 / 64", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Filter" })).toHaveValue("model_correct:0");
});

test("a half-typed query is kept when switching views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Filter" }).fill("(model_correct:0");
  await expect(page.getByText("Incomplete query", { exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(page.getByRole("textbox", { name: "Filter" })).toHaveValue("(model_correct:0");
  await expect(page.getByText("Incomplete query", { exact: true })).toBeVisible();
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
});

test("the filter's help lists what a query can use", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Show what you can filter on" }).click();
  const help = page.getByRole("region", { name: "What you can filter on" });
  await expect(help).toContainText("model_correct");
  await expect(help).toContainText("pathway_3");
  await expect(help).not.toContainText("resource_stressed");
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();
});

test("the filter searches the observer's notes, ignoring case", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const filter = page.getByRole("textbox", { name: "Filter" });
  await filter.fill("observation:\"Stores Nearby\"");
  await expect(page.getByText("212 of 800", { exact: true })).toBeVisible();
  await filter.fill("water");
  await expect(page.getByText("363 of 800", { exact: true })).toBeVisible();
});

test("a number field matches the number exactly", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Filter" }).fill("n:12");
  await expect(page.getByText("1 of 800", { exact: true })).toBeVisible();
});

test("a query is stored when the help closes on a click outside it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const filter = page.getByRole("textbox", { name: "Filter" });
  await filter.fill("model_correct:0");
  await page.getByRole("button", { name: "Show what you can filter on" }).click();
  // A click inside moves focus into the help, which must not lose the commit when it closes.
  await page.getByText("The observer's notes", { exact: true }).click();
  await page.getByRole("heading", { name: "Trace a Case" }).click();
  // Escape discards only an unstored draft, so the count stays if the query was stored.
  await filter.focus();
  await page.keyboard.press("Escape");
  await expect(page.getByText("64 of 800", { exact: true })).toBeVisible();
});

test("clicking the Filter label doesn't store a half-typed query", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const filter = page.getByRole("textbox", { name: "Filter" });
  await filter.fill("water");
  await page.getByText("Filter", { exact: true }).click();
  await expect(filter).toBeFocused();
  // Escape discards an unstored draft, so the count returns to every conversation.
  await page.keyboard.press("Escape");
  await expect(page.getByText("800", { exact: true })).toBeVisible();
});

test("the filter bar shows focus in forced-colors mode", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const bar = page.locator(".filter-bar");
  const outline = () => bar.evaluate(element => getComputedStyle(element).outlineStyle);
  expect(await outline()).toBe("none");
  await page.getByRole("textbox", { name: "Filter" }).focus();
  expect(await outline()).toBe("solid");
});

test("the card shows the conversation's label, notes and attribute indicators", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: "Conversation", exact: true });
  await expect(card.getByRole("status")).toHaveText("Conversation 1 of 800");
  await expect(card.getByText("wait", { exact: true })).toBeVisible();
  await expect(card.getByText(/^At least one juvenile was present\./)).toBeVisible();
  const indicators = card.getByRole("listitem");
  await expect(indicators).toHaveCount(5);
  // Each of the data's attributes has a drawing.
  await expect(indicators.locator("svg")).toHaveCount(5);
  // The cells share the row equally, so a long label wraps rather than widening its cell.
  const widths = await indicators.evaluateAll(items =>
    items.map(item => Math.round(item.getBoundingClientRect().width)));
  expect(new Set(widths).size).toBe(1);
  // What a screen reader reads of each indicator; the check mark or count is hidden from it.
  const spoken = () => indicators.evaluateAll(items => items.map(item => {
    const copy = item.cloneNode(true) as Element;
    copy.querySelectorAll('[aria-hidden="true"]').forEach(hidden => hidden.remove());
    return copy.textContent;
  }));
  expect(await spoken()).toEqual([
    "Voices raised: no", "Engaged in a task: yes", "Group size: 2", "Near water: yes", "Food present: no",
  ]);
  // A hidden attribute gets no attribute indicator until it is commissioned.
  await expect(card.getByText("Resource stressed")).toHaveCount(0);

  await page.getByRole("button", { name: "Next conversation" }).click();
  await expect(card.getByRole("status")).toHaveText("Conversation 2 of 800");
  await expect(card.getByText("approach", { exact: true })).toBeVisible();
  expect(await spoken()).toEqual([
    "Voices raised: yes", "Engaged in a task: no", "Group size: 3", "Near water: yes", "Food present: yes",
  ]);
});

test("the card fits the stacked layout without scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto("/");
  const card = page.getByRole("region", { name: "Conversation", exact: true });
  await expect(card.getByRole("listitem")).toHaveCount(5);
  const overflow = await card.evaluate(el => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test.describe("the card and network panels", () => {
  const panels = (page: Page) => ({
    card: page.getByRole("region", { name: "Conversation", exact: true }),
    network: page.getByRole("region", { name: "The Network" }),
  });
  const rect = (locator: Locator) => locator.evaluate(el => {
    const { top, bottom, height } = el.getBoundingClientRect();
    return { top, bottom, height };
  });

  test("have heads of the same height", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/");
    const { card, network } = panels(page);
    const cardHead = await rect(card.getByRole("heading", { name: "Conversation" }).locator(".."));
    const networkHead = await rect(network.getByRole("heading", { name: "The Network" }));
    expect(networkHead.height).toBeCloseTo(cardHead.height, 0);
  });

  test("match each other and fill the window", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const { card, network } = panels(page);
    await expect(card.getByRole("listitem")).toHaveCount(5);
    const cardBox = await rect(card);
    const networkBox = await rect(network);
    expect(networkBox.height).toBeCloseTo(cardBox.height, 0);
    // The view's 16 px bottom padding is all that's left below them.
    expect(cardBox.bottom).toBeCloseTo(800 - 16, 0);
  });

  test("stop growing at 800 px on a tall window", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto("/");
    const { card, network } = panels(page);
    await expect(card.getByRole("listitem")).toHaveCount(5);
    expect((await rect(card)).height).toBeCloseTo(800, 0);
    expect((await rect(network)).height).toBeCloseTo(800, 0);
  });

  test("scroll the notes, not the card, on a short window", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 620 });
    await page.goto("/");
    const { card } = panels(page);
    const notes = card.getByRole("region", { name: "Observation notes" });
    await expect(notes).toBeVisible();
    const overflow = (locator: Locator) => locator.evaluate(el => el.scrollHeight - el.clientHeight);
    expect(await overflow(notes)).toBeGreaterThan(0);
    expect(await overflow(card)).toBeLessThanOrEqual(0);
  });

  test("keep their natural height when stacked, with the view's padding below", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 500 });
    await page.goto("/");
    const { card, network } = panels(page);
    const notes = card.getByRole("region", { name: "Observation notes" });
    await expect(notes).toBeVisible();
    expect(await notes.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(0);
    // The box ends its 10 px padding below the attribute indicators, so nothing stretched it.
    const below = await notes.evaluate(el =>
      el.getBoundingClientRect().bottom - el.querySelector("ul")!.getBoundingClientRect().bottom);
    expect(below).toBeCloseTo(10, 0);
    await page.getByRole("main").evaluate(el => el.scrollTo(0, el.scrollHeight));
    expect((await rect(network)).bottom).toBeCloseTo(500 - 16, 0);
  });

  test("stop shrinking at 380 px, and the page scrolls instead", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 450 });
    await page.goto("/");
    const { card, network } = panels(page);
    await expect(card.getByRole("listitem")).toHaveCount(5);
    expect((await rect(card)).height).toBeCloseTo(380, 0);
    const networkBox = await rect(network);
    expect(networkBox.height).toBeCloseTo(380, 0);
    // The drawing still fits in the panel at its smallest.
    expect((await rect(network.locator("svg").first())).bottom).toBeLessThanOrEqual(networkBox.bottom);
    const view = page.getByRole("main");
    expect(await view.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);
  });
});
