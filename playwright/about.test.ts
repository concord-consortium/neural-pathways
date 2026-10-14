import { test } from "./lib/base-url";
import { expect, type Locator, type Page } from "@playwright/test";

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

// The placeholder views' text is checked in src/app/views-about.test.tsx, which can't load data.
for (const [id, title, text] of [
  ["trace-a-case", "Trace a Case", "Students follow a single alien conversation through the model"],
  ["extract-pathways", "Extract Pathways", "Students stack many cases’ activations"],
]) {
  test(`${title}'s About opens its own text`, async ({ page }) => {
    await page.goto(`/?interactive=${id}`);
    await page.getByRole("button", { name: `About ${title}` }).click();
    await expect(page.getByRole("dialog", { name: `About ${title}` })).toContainText(text);
  });
}

test.describe("the About dialog", () => {
  const about = (page: Page) => page.getByRole("button", { name: "About Trace a Case" });
  const dialog = (page: Page) => page.getByRole("dialog", { name: "About Trace a Case" });

  async function openTrace(page: Page, width = 1024, height = 562) {
    await page.setViewportSize({ width, height });
    await page.goto("/?interactive=trace-a-case");
    await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  }

  test("opens below its button, right edges aligned, with focus on Close", async ({ page }) => {
    await openTrace(page);
    await about(page).click();
    await expect(dialog(page)).toBeVisible();
    const buttonBox = await box(about(page));
    const dialogBox = await box(dialog(page));
    expect(dialogBox.y).toBeCloseTo(buttonBox.y + buttonBox.height + 6, 0);
    expect(dialogBox.x + dialogBox.width).toBeCloseTo(buttonBox.x + buttonBox.width, 0);
    await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
  });

  // Trace a Case's text is taller than the room below its button at the designed size.
  test("at the designed size, hangs below its button inside the window, and scrolls its text", async ({ page }) => {
    await openTrace(page);
    await about(page).click();
    const buttonBox = await box(about(page));
    const dialogBox = await box(dialog(page));
    expect(dialogBox.y).toBeCloseTo(buttonBox.y + buttonBox.height + 6, 0);
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(552 + 0.5);
    await expect(page.getByRole("group", { name: "About Trace a Case" })).toHaveAttribute("tabindex", "0");
  });

  test("Enter opens the dialog and it stays open", async ({ page }) => {
    await openTrace(page);
    await about(page).focus();
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
  });

  test("keeps Tab inside it", async ({ page }) => {
    await openTrace(page);
    await about(page).click();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);
    }
  });

  test("closes on Escape and puts focus back on About", async ({ page }) => {
    await openTrace(page);
    await about(page).click();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(about(page)).toBeFocused();
  });

  test("closes on a click outside it and puts focus back on About", async ({ page }) => {
    await openTrace(page);
    await about(page).click();
    await page.mouse.click(5, 5);
    await expect(dialog(page)).toBeHidden();
    await expect(about(page)).toBeFocused();
  });

  test("stays inside the window when it narrows", async ({ page }) => {
    await openTrace(page);
    await about(page).click();
    await page.setViewportSize({ width: 360, height: 562 });
    await expect.poll(async () => {
      const b = await box(dialog(page));
      return b.x >= 10 - 0.5 && b.x + b.width <= 350 + 0.5 && b.y >= 10 - 0.5 && b.y + b.height <= 552 + 0.5;
    }).toBe(true);
  });

  test("fits a 320 × 562 window, and its text scrolls from the keyboard", async ({ page }) => {
    await openTrace(page, 320, 562);
    await about(page).click();
    const b = await box(dialog(page));
    expect(b.x).toBeGreaterThanOrEqual(10 - 0.5);
    expect(b.x + b.width).toBeLessThanOrEqual(310 + 0.5);
    expect(b.y).toBeGreaterThanOrEqual(10 - 0.5);
    expect(b.y + b.height).toBeLessThanOrEqual(552 + 0.5);
    const text = page.getByRole("group", { name: "About Trace a Case" });
    await page.keyboard.press("Tab");
    await expect(text).toBeFocused();
    await page.keyboard.press("PageDown");
    await expect.poll(() => text.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  });
});
