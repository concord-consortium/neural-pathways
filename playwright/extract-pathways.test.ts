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

/** What a frame takes from the canvas's width: its 16 px gutters and the panel's borders. */
const FRAME_EXTRA = 34;

/**
 * Opens the view alone in a frame `width` wide, waits until the canvas is laid out at
 * `canvasWidth` (the first frame is drawn before the panel is measured), and returns what scrolls.
 */
async function canvasIn(page: Page, width: number, canvasWidth: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?interactive=extract-pathways");
  const canvas = page.getByRole("img", { name: "The network." });
  await expect(canvas).toHaveAttribute("width", String(canvasWidth));
  expect((await canvas.boundingBox())!.width).toBe(canvasWidth);
  return page.evaluate(() => {
    const scrollsSideways = (element: Element) => element.scrollWidth > element.clientWidth;
    return {
      page: scrollsSideways(document.documentElement),
      drawing: scrollsSideways(document.querySelector(".extract-drawing")!),
    };
  });
}

/** The drawing's scroll region: a group named by its panel's heading. */
const scrollRegion = (page: Page) => page.getByRole("group", { name: "The Network → Activated Pathways" });

// 909 is the narrowest the canvas is laid out (minCanvasWidth).

test("a frame just wide enough holds the canvas at full size without scrolling", async ({ page }) => {
  expect(await canvasIn(page, 909 + FRAME_EXTRA, 909)).toEqual({ page: false, drawing: false });
  await expect(scrollRegion(page)).not.toHaveAttribute("tabindex");
});

test("a wider frame widens the canvas to fill it", async ({ page }) => {
  expect(await canvasIn(page, 1200 + FRAME_EXTRA, 1200)).toEqual({ page: false, drawing: false });
});

test("a frame a pixel too narrow scrolls the canvas sideways rather than scaling it down", async ({ page }) => {
  expect(await canvasIn(page, 908 + FRAME_EXTRA, 909)).toEqual({ page: false, drawing: true });
  await expect(scrollRegion(page)).toHaveAttribute("tabindex", "0");
});

test("a much narrower frame scrolls only the canvas", async ({ page }) => {
  expect(await canvasIn(page, 600, 909)).toEqual({ page: false, drawing: true });
});

test("the keyboard can reach and scroll a canvas too wide for its frame", async ({ page }) => {
  await canvasIn(page, 600, 909);
  await page.getByRole("button", { name: "Reset" }).focus();
  await page.keyboard.press("Tab");
  await expect(scrollRegion(page)).toBeFocused();
  await expect(scrollRegion(page)).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => scrollRegion(page).evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
});

test("unavailable steps look unavailable in forced-colors mode", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await open(page);
  const color = (name: string) =>
    page.getByRole("button", { name }).evaluate(element => getComputedStyle(element).color);
  // Setup is available; Collect All Conversations and Reset aren't, at the start.
  expect(await color("Collect All Conversations")).not.toBe(await color("Setup"));
  expect(await color("Reset")).toBe(await color("Collect All Conversations"));
});

test("the drawing keeps the focus when its frame widens and it stops scrolling", async ({ page }) => {
  await canvasIn(page, 600, 909);
  await scrollRegion(page).focus();
  await page.setViewportSize({ width: 1300, height: 900 });
  await expect.poll(() => page.locator(".extract-drawing").evaluate(e => e.scrollWidth > e.clientWidth)).toBe(false);
  await expect(scrollRegion(page)).toBeFocused();
  // Once the focus leaves, there's nothing to scroll, so it's no longer a Tab stop.
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".extract-drawing")).not.toHaveAttribute("tabindex");
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
