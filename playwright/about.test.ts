import { test } from "./lib/base-url";
import { expect, type Locator } from "@playwright/test";

const box = async (locator: Locator) => (await locator.boundingBox())!;

test.describe("a placeholder view's About", () => {
  test("opens that view's text", async ({ page }) => {
    await page.goto("/?interactive=correlations");
    await page.getByRole("button", { name: "About Correlations" }).click();
    const dialog = page.getByRole("dialog", { name: "About Correlations" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { level: 3, name: "Histograms" })).toBeVisible();
  });

  // At 320 px the title takes two lines, which the header's 52 px holds anyway. Doubling the text, as
  // a text-only zoom does, takes it to more.
  test("grows its header for a long title in a narrow window when only the text is zoomed", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 562 });
    await page.goto("/?interactive=investigate-unknown-pathway");
    await page.getByRole("button", { name: "About Investigate Unknown Pathway" }).click();
    const heading = page.getByRole("heading", { level: 2, name: "About Investigate Unknown Pathway" });
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>("dialog *"));
      const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize));
      elements.forEach((element, i) => { element.style.fontSize = `${sizes[i] * 2}px`; });
    });
    const header = heading.locator("..");
    const headingBox = await box(heading);
    const headerBox = await box(header);
    expect(headingBox.height).toBeGreaterThan(52);
    expect(headingBox.y).toBeGreaterThanOrEqual(headerBox.y);
    expect(headingBox.y + headingBox.height).toBeLessThanOrEqual(headerBox.y + headerBox.height);
  });
});
