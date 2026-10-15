import { test } from "./lib/base-url";
import { expect, Page } from "@playwright/test";

const LIFTED = "The network, with its 14 hidden neurons lifted out.";
const DECK = "The network's 14 hidden neurons lifted out, and all 800 conversations collected.";

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

/** What an Interactive takes from the canvas's width: its 16 px gutters and the panel's borders. */
const INTERACTIVE_EXTRA = 34;
/**
 * The narrowest the canvas is laid out (`minCanvasWidth`): the finished deck needs the room. It
 * depends on the network the view draws, so it changes when the real network replaces the toy one.
 */
const NARROWEST_CANVAS = 959;

/**
 * Opens the view as an Interactive `width` wide, waits until the canvas is laid out at
 * `canvasWidth` (the first animation frame is drawn before the panel is measured), and returns what
 * scrolls.
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

/** The drawing's scroller: a group named by its panel's heading. */
const drawingGroup = (page: Page) => page.getByRole("group", { name: "The Network → Activated Pathways" });

test("an Interactive just wide enough holds the canvas at full size without scrolling", async ({ page }) => {
  const scrolls = await canvasIn(page, NARROWEST_CANVAS + INTERACTIVE_EXTRA, NARROWEST_CANVAS);
  expect(scrolls).toEqual({ page: false, drawing: false });
  await expect(drawingGroup(page)).not.toHaveAttribute("tabindex");
});

test("a wider Interactive widens the canvas to fill it", async ({ page }) => {
  expect(await canvasIn(page, 1200 + INTERACTIVE_EXTRA, 1200)).toEqual({ page: false, drawing: false });
});

test("an Interactive a pixel too narrow scrolls the canvas sideways rather than scaling it down", async ({ page }) => {
  const scrolls = await canvasIn(page, NARROWEST_CANVAS - 1 + INTERACTIVE_EXTRA, NARROWEST_CANVAS);
  expect(scrolls).toEqual({ page: false, drawing: true });
  await expect(drawingGroup(page)).toHaveAttribute("tabindex", "0");
});

test("a much narrower Interactive scrolls only the canvas", async ({ page }) => {
  expect(await canvasIn(page, 600, NARROWEST_CANVAS)).toEqual({ page: false, drawing: true });
});

test("the keyboard can reach and scroll a canvas too wide for its Interactive", async ({ page }) => {
  await canvasIn(page, 600, NARROWEST_CANVAS);
  // The speed slider is the last control in the panel's head that takes focus, just before the
  // canvas.
  await page.getByRole("slider", { name: "Animation speed" }).focus();
  await page.keyboard.press("Tab");
  await expect(drawingGroup(page)).toBeFocused();
  await expect(drawingGroup(page)).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => drawingGroup(page).evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
});

test("unavailable steps look unavailable in forced-colors mode", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await open(page);
  const color = (name: string) =>
    page.getByRole("button", { name }).evaluate(element => getComputedStyle(element).color);
  // Setup is available and Reset isn't, at the start.
  expect(await color("Reset")).not.toBe(await color("Setup"));
});

test("the drawing keeps the focus when its Interactive widens and it stops scrolling", async ({ page }) => {
  await canvasIn(page, 600, NARROWEST_CANVAS);
  await drawingGroup(page).focus();
  await page.setViewportSize({ width: 1300, height: 900 });
  await expect.poll(() => page.locator(".extract-drawing").evaluate(e => e.scrollWidth > e.clientWidth)).toBe(false);
  await expect(drawingGroup(page)).toBeFocused();
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
  await expect(page.getByRole("button", { name: "Collect All Conversations" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Extract Pathways" })).toBeDisabled();
});

test("Reset clears everything", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Collect a Conversation" }).click();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("img", { name: "The network." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset" })).toHaveAttribute("aria-disabled", "true");
});

test("Animate and the speed survive switching views", async ({ page }) => {
  await open(page, "no-preference");
  const panel = page.getByRole("region", { name: "The Network → Activated Pathways" });
  const animate = panel.getByRole("checkbox", { name: "Animate" });
  const speed = panel.getByRole("slider", { name: "Animation speed" });
  await speed.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(speed).toHaveAttribute("aria-valuetext", "Slow");
  await animate.uncheck();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(page.getByText("1 / 800")).toBeVisible();
  await nav.getByRole("link", { name: "Extract Pathways" }).click();
  await expect(animate).not.toBeChecked();
  await expect(speed).toHaveAttribute("aria-valuetext", "Slow");
  await page.getByRole("button", { name: "Setup" }).click();
  // Animated, Setup takes a few seconds.
  await expect(page.getByRole("img", { name: LIFTED })).toBeVisible({ timeout: 1_000 });
});

test("in a narrow window, Animate and the speed wrap below the panel's title", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await open(page);
  const head = await page.locator(".extract-pathways__network-head").boundingBox();
  const controls = await page.locator(".animation-controls").boundingBox();
  const title = await page.getByRole("heading", { name: "The Network → Activated Pathways" }).boundingBox();
  expect(controls!.x + controls!.width).toBeLessThanOrEqual(head!.x + head!.width);
  expect(controls!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
});

test("Collect All Conversations builds the deck of all 800", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Collect All Conversations" }).click();
  await expect(page.getByRole("img", { name: DECK })).toBeVisible();
  await expect(page.getByText("800 Conversations")).toBeVisible();
});

test("from five collected, Collect All ends on the deck", async ({ page }) => {
  await open(page);
  const collect = page.getByRole("button", { name: "Collect a Conversation" });
  for (let i = 0; i < 5; i++) {
    await collect.click();
  }
  await page.getByRole("button", { name: "Collect All Conversations" }).click();
  await expect(page.getByRole("img", { name: DECK })).toBeVisible();
});

test("the deck survives switching views", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Collect All Conversations" }).click();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(page.getByText("1 / 800")).toBeVisible();
  await nav.getByRole("link", { name: "Extract Pathways" }).click();
  await expect(page.getByRole("img", { name: DECK })).toBeVisible();
});

test("after the deck, Collect a Conversation starts the collecting over", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Collect All Conversations" }).click();
  await page.getByRole("button", { name: "Collect a Conversation" }).click();
  await expect(page.getByRole("img", { name: /and 1 conversation collected\.$/ })).toBeVisible();
  await expect(page.getByText("Conversation 1")).toBeVisible();
});

test("at the narrowest canvas, the finished deck fits its room", async ({ page }) => {
  await canvasIn(page, NARROWEST_CANVAS + INTERACTIVE_EXTRA, NARROWEST_CANVAS);
  await page.getByRole("button", { name: "Collect All Conversations" }).click();
  const canvas = (await page.getByRole("img", { name: DECK }).boundingBox())!;
  const deck = (await page.getByTestId("deck").boundingBox())!;
  const lifted = (await page.getByTestId("lifted-copies").boundingBox())!;
  expect(deck.x).toBeGreaterThanOrEqual(canvas.x);
  expect(deck.x + deck.width).toBeLessThanOrEqual(lifted.x);
});
