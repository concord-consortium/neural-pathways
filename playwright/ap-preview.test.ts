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

test("draws the page at the Activity Player's width, with its padding inside", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  for (const [layout, width] of [["1100px", 1100], ["ipad_friendly", 960]] as const) {
    await page.goto(`/ap-preview.html#fixed_width_layout=${layout}&layout=full-width&aspect_ratio_method=DEFAULT`);
    expect((await page.locator(".ap-page__activity").boundingBox())!.width).toBe(width);
  }
});

test("labels the other column in text with at least 4.5:1 contrast", async ({ page }) => {
  await page.goto("/ap-preview.html#layout=60-40&aspect_ratio_method=DEFAULT");
  const ratio = await page.getByText("Secondary column", { exact: true }).evaluate(element => {
    const rgb = (color: string) => color.match(/\d+/g)!.slice(0, 3).map(Number);
    const luminance = ([r, g, b]: number[]) => {
      const [R, G, B] = [r, g, b].map(c => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    };
    // The column has no background of its own; the page behind it is white.
    const text = luminance(rgb(getComputedStyle(element).color));
    const back = luminance(rgb(getComputedStyle(element.closest(".ap-page__activity")!).backgroundColor));
    return (Math.max(text, back) + 0.05) / (Math.min(text, back) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test("a fixed page scrolls sideways rather than shrinking", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/ap-preview.html");
  await expect.poll(() => iframeSize(page)).toEqual({ width: 1044, height: 562 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth))
    .toBe(true);
});
