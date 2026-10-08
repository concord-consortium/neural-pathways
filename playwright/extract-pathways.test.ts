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

/** Opens the view alone in a frame `width` wide, and returns the canvas's width and what scrolls. */
async function canvasIn(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?interactive=extract-pathways");
  const canvas = page.getByRole("img", { name: "The network." });
  await expect(canvas).toBeVisible();
  const scrolls = await page.evaluate(() => {
    const scrollsSideways = (element: Element) => element.scrollWidth > element.clientWidth;
    return {
      page: scrollsSideways(document.documentElement),
      drawing: scrollsSideways(document.querySelector(".extract-drawing")!),
    };
  });
  return { width: (await canvas.boundingBox())!.width, ...scrolls };
}

/** The drawing's scroll region, which is a named group only while it scrolls. */
const scrollRegion = (page: Page) => page.getByRole("group", { name: "The Network → Activated Pathways" });

test("the canvas fills a 980 px panel, as an iPad's standalone layout leaves, at full size", async ({ page }) => {
  // The frame's 16 px gutters and the panel's borders leave 980 for the canvas.
  expect(await canvasIn(page, 1014)).toEqual({ width: 980, page: false, drawing: false });
  await expect(scrollRegion(page)).toHaveCount(0);
});

test("a narrower frame scrolls the canvas sideways rather than scaling it down", async ({ page }) => {
  // 909 is the narrowest the canvas is laid out.
  expect(await canvasIn(page, 600)).toEqual({ width: 909, page: false, drawing: true });
});

test("the keyboard can reach and scroll a canvas too wide for its frame", async ({ page }) => {
  await canvasIn(page, 600);
  await page.getByRole("button", { name: "Reset" }).focus();
  await page.keyboard.press("Tab");
  await expect(scrollRegion(page)).toBeFocused();
  await expect(scrollRegion(page)).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => scrollRegion(page).evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
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
