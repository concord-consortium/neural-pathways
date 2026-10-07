import { test } from "./lib/base-url";
import { expect, Page } from "@playwright/test";

const LIFTED = "The network, with its 14 hidden neurons lifted out.";

async function open(page: Page, reducedMotion: "reduce" | "no-preference" = "reduce") {
  await page.emulateMedia({ reducedMotion });
  await page.goto("/#view=extract-pathways");
  await expect(page.getByRole("img", { name: "The network." })).toBeVisible();
}

test("Setup lifts the hidden neurons out of the network, animated", async ({ page }) => {
  await open(page, "no-preference");
  await page.getByRole("button", { name: "Setup" }).click();
  // Setup takes a few seconds, so the column isn't described as lifted out yet.
  await expect(page.getByRole("img", { name: "The network." })).toBeVisible();
  await expect(page.getByRole("img", { name: LIFTED })).toBeVisible({ timeout: 10_000 });
});

test("a narrow frame scales the canvas down only so far, then scrolls it sideways", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?interactive=extract-pathways");
  const canvas = page.getByRole("img", { name: "The network." });
  await expect(canvas).toBeVisible();
  // 0.75 of the 995-wide layout.
  expect((await canvas.boundingBox())!.width).toBeCloseTo(746, 0);
  const scrolls = await page.evaluate(() => {
    const scrollsSideways = (element: Element) => element.scrollWidth > element.clientWidth;
    return {
      page: scrollsSideways(document.documentElement),
      drawing: scrollsSideways(document.querySelector(".extract-drawing")!),
    };
  });
  expect(scrolls).toEqual({ page: false, drawing: true });
});

test("three collections give three deck columns", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Setup" }).click();
  const collect = page.getByRole("button", { name: "Collect a Conversation" });
  for (let i = 0; i < 3; i++) {
    await collect.click();
  }
  await expect(page.getByRole("img", { name: /and 3 conversations collected\.$/ })).toBeVisible();
  await expect(page.getByText("Conversation 3")).toBeVisible();
});

test("the stage survives switching views", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Collect a Conversation" }).click();
  await page.getByRole("button", { name: "Collect a Conversation" }).click();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(page.getByText("1 / 800")).toBeVisible();
  await nav.getByRole("link", { name: "Extract Pathways" }).click();
  await expect(page.getByRole("img", { name: /and 2 conversations collected\.$/ })).toBeVisible();
});

test("Collect a Conversation stops after ten", async ({ page }) => {
  await open(page);
  const collect = page.getByRole("button", { name: "Collect a Conversation" });
  for (let i = 0; i < 10; i++) {
    await collect.click();
  }
  // Playwright counts aria-disabled as disabled.
  await expect(collect).toBeDisabled();
  // aria-disabled, not disabled, so the focus stays on it.
  await expect(collect).toBeFocused();
  await expect(page.getByRole("button", { name: "Collect All Conversations" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Extract Pathways" })).toBeDisabled();
});

test("Reset clears everything", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Collect a Conversation" }).click();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("img", { name: "The network." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset" })).toHaveAttribute("aria-disabled", "true");
});
