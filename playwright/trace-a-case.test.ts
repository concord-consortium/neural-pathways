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
  await expect(page.getByText("1 / 800")).toBeVisible();
  const filter = page.getByRole("textbox", { name: "Filter" });
  await filter.fill("model_correct:0");
  await expect(page.getByText("64 of 800")).toBeVisible();
  await expect(page.getByText("1 / 64")).toBeVisible();
  await page.getByRole("button", { name: "Next conversation" }).click();
  await expect(page.getByText("2 / 64")).toBeVisible();
});

test("a finished query is kept when switching views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800")).toBeVisible();
  await page.getByRole("textbox", { name: "Filter" }).fill("model_correct:0");
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(page.getByText("1 / 64")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Filter" })).toHaveValue("model_correct:0");
});

test("a half-typed query is kept when switching views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800")).toBeVisible();
  await page.getByRole("textbox", { name: "Filter" }).fill("(model_correct:0");
  await expect(page.getByText("Incomplete query")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(page.getByRole("textbox", { name: "Filter" })).toHaveValue("(model_correct:0");
  await expect(page.getByText("Incomplete query")).toBeVisible();
  await expect(page.getByText("1 / 800")).toBeVisible();
});

test("the filter's help lists what a query can use", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Show what you can filter on" }).click();
  const help = page.getByRole("dialog", { name: "What you can filter on" });
  await expect(help).toContainText("model_correct");
  await expect(help).toContainText("pathway_3");
  await expect(help).not.toContainText("resource_stressed");
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();
});

test("the filter searches the observer's notes, ignoring case", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800")).toBeVisible();
  const filter = page.getByRole("textbox", { name: "Filter" });
  await filter.fill("observation:\"Stores Nearby\"");
  await expect(page.getByText("212 of 800")).toBeVisible();
  await filter.fill("water");
  await expect(page.getByText("363 of 800")).toBeVisible();
});

test("a number field matches the number exactly", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800")).toBeVisible();
  await page.getByRole("textbox", { name: "Filter" }).fill("n:127");
  await expect(page.getByText("1 of 800")).toBeVisible();
});
