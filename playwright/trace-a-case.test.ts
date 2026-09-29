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
  await expect(page.getByText("1 / 800")).toBeVisible();
  await page.getByRole("button", { name: "Step 4" }).click();
  await expect(page.getByRole("img", { name: /The network predicts (Approach|Wait)\./ }))
    .toBeVisible({ timeout: 10_000 });
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
