import { expect, Page } from "@playwright/test";
import { test } from "./lib/base-url";

const iframe = (page: Page) => page.locator("iframe");

async function iframeSize(page: Page) {
  const box = (await iframe(page).boundingBox())!;
  return { width: box.width, height: box.height };
}

test("sizes the iframe as the Activity Player does in a short window", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 600 });
  await page.goto("/ap-preview.html#view=correlations&fixed_width_layout=1100px&layout=full-width" +
    "&aspect_ratio_method=DEFAULT");
  // Measured in the Activity Player at this window size: 98% of 600 less 15 tall, 98% of 600 × 4/3 wide.
  await expect.poll(() => iframeSize(page)).toEqual({ width: 784, height: 573 });
  const frame = page.frameLocator("iframe");
  await expect(frame.getByRole("button", { name: "About Correlations" })).toBeVisible();
  await expect(frame.getByRole("heading", { level: 1 })).toHaveCount(0);
});

test("a responsive layout follows the window's width", async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 900 });
  await page.goto("/ap-preview.html#view=correlations&fixed_width_layout=1100px&layout=responsive-full-width" +
    "&aspect_ratio_method=MANUAL&native_width=1044&native_height=562");
  for (const width of [1300, 1100]) {
    await page.setViewportSize({ width, height: 900 });
    const W = await page.evaluate(() => document.documentElement.clientWidth);
    await expect.poll(async () => (await iframeSize(page)).width).toBeCloseTo(W - 140, 0);
    expect((await iframeSize(page)).height).toBeCloseTo((W - 140) * 562 / 1044, 0);
  }
});

test("a fixed page scrolls sideways rather than shrinking", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/ap-preview.html");
  await expect.poll(() => iframeSize(page)).toEqual({ width: 1044, height: 562 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth))
    .toBe(true);
});
