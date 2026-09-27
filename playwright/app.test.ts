import { test } from "./lib/base-url";
import { expect } from "@playwright/test";

test("the root shows the standalone app with every view in the nav", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Views" });
  await expect(nav.getByRole("link")).toHaveCount(7);
  await expect(page.getByRole("heading", { name: "Trace a Case" })).toBeVisible();
});

test("the student app declares its language for screen readers", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("clicking a nav item selects that view and back returns", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page).toHaveURL(/#view=correlations$/);
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Trace a Case" })).toBeVisible();
});

test("the view hash selects a view on load", async ({ page }) => {
  await page.goto("/#view=correlations");
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
});

test("the interactive param embeds one view with no nav", async ({ page }) => {
  await page.goto("/?interactive=correlations");
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
});
