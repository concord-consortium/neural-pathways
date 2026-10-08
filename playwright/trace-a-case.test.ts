import { test } from "./lib/base-url";
import { expect } from "@playwright/test";

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

test("Animate and the speed survive switching views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const network = page.getByRole("region", { name: "The Network" });
  const animate = network.getByRole("checkbox", { name: "Animate" });
  const speed = network.getByRole("slider", { name: "Animation speed" });
  await expect(speed).toHaveAttribute("aria-valuetext", "Med");
  await speed.focus();
  await page.keyboard.press("ArrowRight");
  await expect(speed).toHaveAttribute("aria-valuetext", "Fast");
  await animate.uncheck();
  await expect(speed).toBeDisabled();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(animate).not.toBeChecked();
  await expect(speed).toBeDisabled();
  await expect(speed).toHaveAttribute("aria-valuetext", "Fast");
});

test("clicking a speed's name moves the slider to it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const network = page.getByRole("region", { name: "The Network" });
  // The slider is stretched over the names, so a click where a name is lands on the slider.
  const name = await network.getByText("Slow", { exact: true }).boundingBox();
  await page.mouse.click(name!.x + name!.width / 2, name!.y + name!.height / 2);
  await expect(network.getByRole("slider", { name: "Animation speed" })).toHaveAttribute("aria-valuetext", "Slow");
});

test("with Animate off, Step 4 shows the answer at once", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Animate" }).uncheck();
  await page.getByRole("button", { name: "Step 4" }).click();
  // Animated at Med, Step 4 takes several seconds to name the answer.
  await expect(page.getByRole("img", { name: /The network predicts (Approach|Wait)\./ }))
    .toBeVisible({ timeout: 1_000 });
});
