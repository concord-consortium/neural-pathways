import { test } from "./lib/base-url";
import { expect } from "@playwright/test";

test("the root shows the standalone app with every view in the nav", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Views" });
  await expect(nav.getByRole("link")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Looking Inside a Neural Network" })).toBeVisible();
});

test("the student app declares its language for screen readers", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("clicking a nav item selects that view and back returns", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Views" });
  const link = nav.getByRole("link", { name: "Correlations", exact: true });
  await link.click();
  await expect(page).toHaveURL(/#view=correlations$/);
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  // Focus stays on the nav so the student can keep stepping through the views.
  await expect(link).toBeFocused();
  await expect(page).toHaveTitle("Correlations – Neural Pathways");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Looking Inside a Neural Network" })).toBeVisible();
});

test("the view hash selects a view on load", async ({ page }) => {
  await page.goto("/#view=correlations");
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
});

test("the interactive param shows one view in interactive mode, with no nav", async ({ page }) => {
  await page.goto("/?interactive=correlations");
  await expect(page.getByRole("button", { name: "About Correlations" })).toBeVisible();
  // The Activity Player's title bar names the view, so the view leaves its own title out.
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
});

test("in an Interactive, each view pads its top in place of its title", async ({ page }) => {
  // The view ids come from the nav, so a new view is checked too.
  await page.goto("/");
  const links = page.getByRole("navigation", { name: "Views" }).getByRole("link");
  // evaluateAll doesn't wait, so wait for the nav to render first.
  await expect(links.first()).toBeVisible();
  const hrefs = await links.evaluateAll(elements => elements.map(link => link.getAttribute("href")!));
  for (const href of hrefs) {
    const id = href.replace(/^#view=/, "");
    await page.goto(`/?interactive=${id}`);
    const paddingTop = await page.locator("main > *").first().evaluate(view => getComputedStyle(view).paddingTop);
    expect(paddingTop, id).toBe("9px");
  }
});
