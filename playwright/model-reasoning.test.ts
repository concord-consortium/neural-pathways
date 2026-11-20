import { test } from "./lib/base-url";
import { expect, type Locator, type Page } from "@playwright/test";

const card = (page: Page) => page.getByRole("region", { name: "Message", exact: true });
const reading = (page: Page, pathway: number) => page.getByRole("listbox", { name: `Pathway ${pathway}` });
const options = (page: Page, pathway: number) => reading(page, pathway).getByRole("option");
/** The words colored on a reading's pathway, which always have a tooltip. */
const coloredOptions = (page: Page, pathway: number) =>
  reading(page, pathway).locator(".pathway-reading__word--colored");
const tooltip = (page: Page) => page.locator(".word-tooltip");
const scroller = (page: Page) => page.locator(".model-reasoning__scroller");
const box = async (locator: Locator) => (await locator.boundingBox())!;

/** What a tooltip says: the word, then its score, or the pathway it scores on. */
const TOOLTIP_TEXT = /^\S+: ([+−]\d\.\d{4}|a Pathway \d word)$/;

/**
 * Opens the view as an Interactive, by default at the designed size, and waits for the readings to be
 * listboxes, which they become once the word scores load.
 */
async function openView(page: Page, width = 1024, height = 562) {
  await page.setViewportSize({ width, height });
  await page.goto("/?interactive=model-reasoning");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await expect(reading(page, 3)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** Filters to a long message, whose readings run well below the bottom of the card. */
async function showLongMessage(page: Page) {
  await page.getByRole("textbox", { name: "Filter" }).fill("n:500");
  await expect(page.getByText("1 / 1", { exact: true })).toBeVisible();
  await expect(reading(page, 3)).toBeVisible();
}

/** Whether a box lies within another, give or take half a pixel. */
function within(inner: { x: number; y: number; width: number; height: number },
  outer: { x: number; y: number; width: number; height: number }) {
  return inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 &&
    inner.x + inner.width <= outer.x + outer.width + 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;
}

/**
 * Tabs from the card's arrows into Pathway 1, then arrows to its first colored word, since the first
 * word may score on no pathway and have no tooltip. Returns that word.
 */
async function tabToFirstColoredWord(page: Page) {
  await page.getByRole("button", { name: "Next message" }).focus();
  await page.keyboard.press("Tab");
  await expect(options(page, 1).first()).toBeFocused();
  const colored = await options(page, 1).evaluateAll(elements =>
    elements.findIndex(element => element.classList.contains("pathway-reading__word--colored")));
  for (let i = 0; i < colored; i++) {
    await page.keyboard.press("ArrowRight");
  }
  const word = options(page, 1).nth(colored);
  await expect(word).toBeFocused();
  return word;
}

/** Whether the element at the tooltip's center is the tooltip, so nothing clips or covers it there. */
const tooltipOnTop = (page: Page) => tooltip(page).evaluate(el => {
  const { left, top, width, height } = el.getBoundingClientRect();
  return el.contains(document.elementFromPoint(left + width / 2, top + height / 2));
});

test("the tooltip shows a word's score on hover and on keyboard focus", async ({ page }) => {
  await openView(page);
  await coloredOptions(page, 1).first().hover();
  await expect(tooltip(page)).toBeVisible();
  await expect(tooltip(page)).toHaveText(TOOLTIP_TEXT);

  await page.mouse.move(0, 0);
  await expect(tooltip(page)).toBeHidden();
  const focused = await tabToFirstColoredWord(page);
  await expect(tooltip(page)).toBeVisible();
  await expect(tooltip(page)).toHaveText(TOOLTIP_TEXT);
  expect(await tooltip(page).textContent()).toMatch(new RegExp(`^${await focused.textContent()}: `));
});

test("clicking a word focuses it and makes it current", async ({ page }) => {
  await openView(page);
  const word = options(page, 1).nth(2);
  await word.click();
  await expect(word).toBeFocused();
  await expect(word).toHaveAttribute("aria-selected", "true");
  await expect(options(page, 2).nth(2)).toHaveAttribute("tabindex", "0");
  await expect(options(page, 2).first()).toHaveAttribute("tabindex", "-1");
});

test("the tooltip stays while the pointer moves onto it, and hides on Escape", async ({ page }) => {
  await openView(page);
  const next = page.getByRole("button", { name: "Next message" });
  await next.focus();
  await coloredOptions(page, 1).first().hover();
  await expect(tooltip(page)).toBeVisible();
  const tooltipBox = await box(tooltip(page));
  await page.mouse.move(tooltipBox.x + tooltipBox.width / 2, tooltipBox.y + tooltipBox.height / 2, { steps: 5 });
  await expect(tooltip(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip(page)).toBeHidden();
  await expect(next).toBeFocused();
});

test("the tooltip follows its word when the readings scroll", async ({ page }) => {
  await openView(page);
  await showLongMessage(page);
  // A colored word far enough down the scroller to stay in view when it scrolls 40 px, and far enough
  // from its sides that the tooltip is centered on it rather than kept inside the card.
  const index = await options(page, 1).evaluateAll((elements, view) => elements.findIndex(element => {
    const { top, left, right } = element.getBoundingClientRect();
    return element.classList.contains("pathway-reading__word--colored") && top >= view.y + 80 &&
      left >= view.x + 100 && right <= view.x + view.width - 100;
  }), await box(scroller(page)));
  expect(index).toBeGreaterThanOrEqual(0);
  const word = options(page, 1).nth(index);
  await word.focus();
  await expect(tooltip(page)).toBeVisible();

  /** How far the tooltip's center is from the word's, and its bottom from the word's top. */
  const offsets = async () => {
    const wordBox = await box(word);
    const tooltipBox = await box(tooltip(page));
    return {
      center: tooltipBox.x + tooltipBox.width / 2 - (wordBox.x + wordBox.width / 2),
      gap: wordBox.y - (tooltipBox.y + tooltipBox.height),
    };
  };
  const centered = async () => {
    const { center, gap } = await offsets();
    return Math.abs(center) <= 1 && Math.abs(gap - 6) <= 1;
  };
  expect(await centered()).toBe(true);
  const before = await box(word);
  await scroller(page).evaluate(el => { el.scrollTop += 40; });
  await expect.poll(async () => (await box(word)).y).toBeCloseTo(before.y - 40, 0);
  await expect.poll(centered).toBe(true);
  await expect(tooltip(page)).toBeVisible();

  // Scrolled until the word's bottom is just above the scroller's top.
  await scroller(page).evaluate((el, focused) => {
    el.scrollTop += focused.getBoundingClientRect().bottom - el.getBoundingClientRect().top + 1;
  }, await word.elementHandle());
  await expect(tooltip(page)).toBeHidden();
});

test("the tooltip of a word on the first line stays inside the card", async ({ page }) => {
  await openView(page);
  const cardBox = await box(card(page));
  const first = coloredOptions(page, 1).first();
  expect((await box(first)).y).toBeCloseTo((await box(options(page, 1).first())).y, 0);
  await first.hover();
  await expect(tooltip(page)).toBeVisible();
  expect(within(await box(tooltip(page)), cardBox)).toBe(true);
  // Neither the scroller nor the card's body clips it.
  expect(await tooltipOnTop(page)).toBe(true);

  // With the readings scrolled so the first line's word is just inside the scroller's top, its
  // tooltip reaches up over the legend, and paints above it.
  await page.mouse.move(0, 0);
  await expect(tooltip(page)).toBeHidden();
  await scroller(page).evaluate((el, hovered) => {
    el.scrollTop += hovered.getBoundingClientRect().top - el.getBoundingClientRect().top - 4;
  }, await first.elementHandle());
  const scrollTop = await scroller(page).evaluate(el => el.scrollTop);
  expect(scrollTop).toBeGreaterThan(0);
  await first.hover();
  // Hovering a word in view doesn't scroll the readings.
  expect(await scroller(page).evaluate(el => el.scrollTop)).toBe(scrollTop);
  await expect(tooltip(page)).toBeVisible();
  expect(within(await box(tooltip(page)), cardBox)).toBe(true);
  expect(await tooltipOnTop(page)).toBe(true);
});

// The long message has many lines, so some colored word starts a line and some ends one, close
// enough to the readings' sides that a tooltip centered on it would run past them.
test("the tooltip of a word at either side is kept inside the readings, its pointer over the word",
  async ({ page }) => {
    await openView(page);
    await showLongMessage(page);
    const [leftmost, rightmost] = await coloredOptions(page, 1).evaluateAll(elements => {
      const lefts = elements.map(element => element.getBoundingClientRect().left);
      const rights = elements.map(element => element.getBoundingClientRect().right);
      return [lefts.indexOf(Math.min(...lefts)), rights.indexOf(Math.max(...rights))];
    });
    for (const [side, index] of [["left", leftmost], ["right", rightmost]] as const) {
      const word = coloredOptions(page, 1).nth(index);
      await word.hover();
      await expect(tooltip(page)).toBeVisible();
      const wordBox = await box(word);
      const tooltipBox = await box(tooltip(page));
      const areaBox = await box(page.locator(".word-tooltip-area"));
      // Centered on the word, it would run past this side, so it has to be moved in.
      const wordCenter = wordBox.x + wordBox.width / 2;
      if (side === "left") {
        expect(wordCenter - tooltipBox.width / 2).toBeLessThan(areaBox.x);
      } else {
        expect(wordCenter + tooltipBox.width / 2).toBeGreaterThan(areaBox.x + areaBox.width);
      }
      // Kept within the readings from side to side. It may rise above them, over the legend.
      expect(tooltipBox.x).toBeGreaterThanOrEqual(areaBox.x - 0.5);
      expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(areaBox.x + areaBox.width + 0.5);
      // The pointer, which is centered at its left, over the tooltip's padding box, is centered on the
      // word.
      const pointerCenter = await tooltip(page).evaluate(el =>
        el.getBoundingClientRect().left + el.clientLeft + parseFloat(getComputedStyle(el, "::after").left));
      expect(pointerCenter).toBeCloseTo(wordCenter, 0);
      expect(await tooltipOnTop(page)).toBe(true);
    }
  });

test("Tab goes from the card's arrows to one stop per reading, landing on the same word", async ({ page }) => {
  await openView(page);
  expect(await scroller(page).evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);
  await options(page, 1).nth(1).click();
  await page.getByRole("button", { name: "Next message" }).focus();
  for (const pathway of [1, 2, 3]) {
    await page.keyboard.press("Tab");
    await expect(options(page, pathway).nth(1)).toBeFocused();
  }
  // Then out of the readings: the scroller itself isn't a stop.
  await page.keyboard.press("Tab");
  expect(await scroller(page).evaluate(el => el.contains(document.activeElement))).toBe(false);
  // Nor on the way back.
  for (const pathway of [3, 2, 1]) {
    await page.keyboard.press("Shift+Tab");
    await expect(options(page, pathway).nth(1)).toBeFocused();
  }
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Next message" })).toBeFocused();
});

test("About sits at the right end of the filter row and comes between the filter and the card's arrows " +
  "in the tab order", async ({ page }) => {
  await openView(page);
  const about = page.getByRole("button", { name: "About Neural Pathway View of Model Reasoning" });
  const aboutBox = await box(about);
  const rowBox = await box(page.locator(".model-reasoning__filter-row"));
  const filterBox = await box(page.locator(".filter-bar"));
  expect(aboutBox.x + aboutBox.width).toBeCloseTo(rowBox.x + rowBox.width, 0);
  expect(aboutBox.x).toBeGreaterThan(filterBox.x + filterBox.width);
  // The row is as wide as the card under it.
  expect(rowBox.width).toBeCloseTo((await box(card(page))).width, 0);

  await about.focus();
  await page.keyboard.press("Shift+Tab");
  expect(await page.locator(".filter-bar").evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  await expect(about).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Previous message" })).toBeFocused();
});

// The minimum layout size is in the README's Size section: the card's width inside the gutters, and
// at that width a two-line title.
const SIZES = [["the designed size", 1024, 562], ["the minimum layout size", 479, 483]] as const;
for (const [name, width, height] of SIZES) {
  test(`at ${name}, only the readings scroll`, async ({ page }) => {
    await openView(page, width, height);
    await showLongMessage(page);
    const overflow = (locator: Locator) => locator.evaluate(el => el.scrollHeight - el.clientHeight);
    expect(await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight))
      .toBe(0);
    expect(await overflow(page.getByRole("main"))).toBeLessThanOrEqual(0);
    expect(await overflow(card(page))).toBeLessThanOrEqual(0);
    expect(await overflow(page.locator(".message-card__body"))).toBeLessThanOrEqual(0);
    expect(await overflow(scroller(page))).toBeGreaterThan(0);
  });
}

test("at 320 px the card takes the full width and nothing scrolls sideways", async ({ page }) => {
  await openView(page, 320, 562);
  await showLongMessage(page);
  const cardBox = await box(card(page));
  // The app's 16 px gutters are all that's beside it.
  expect(cardBox.x).toBeCloseTo(16, 0);
  expect(cardBox.width).toBeCloseTo(320 - 2 * 16, 0);
  const scrollsSideways = await page.evaluate(() => [
    "html", "main", ".message-card", ".message-card__body", ".model-reasoning__scroller",
  ].filter(selector => {
    const element = document.querySelector(selector)!;
    return element.scrollWidth > element.clientWidth;
  }));
  expect(scrollsSideways).toEqual([]);
  expect(await options(page, 1).first().evaluate(el => getComputedStyle(el).fontSize)).toBe("13px");
});

// Like Firefox's "Zoom text only": every font twice its size, nothing else.
test("when only the text is zoomed, the words and the tooltip double and stay inside the card", async ({ page }) => {
  await openView(page);
  // The focus, not the pointer, opens it, so the pointer can't land on another word as the text grows.
  const word = coloredOptions(page, 1).first();
  await word.focus();
  await expect(tooltip(page)).toBeVisible();
  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("body *"));
    const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, i) => { element.style.fontSize = `${sizes[i] * 2}px`; });
  });
  expect(await word.evaluate(el => getComputedStyle(el).fontSize)).toBe("26px");
  expect(await tooltip(page).evaluate(el => getComputedStyle(el).fontSize)).toBe("25px");
  await expect(tooltip(page)).toBeVisible();
  const cardBox = await box(card(page));
  await expect.poll(async () => within(await box(tooltip(page)), cardBox)).toBe(true);
});

test("in forced-colors mode the focused word has an outline and the tooltip a border", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await openView(page);
  const word = await tabToFirstColoredWord(page);
  expect(await word.evaluate(el => getComputedStyle(el).outlineStyle)).toBe("solid");
  await expect(tooltip(page)).toBeVisible();
  const border = await tooltip(page).evaluate(el => {
    const style = getComputedStyle(el);
    return { style: style.borderTopStyle, width: parseFloat(style.borderTopWidth), color: style.borderTopColor };
  });
  expect(border.style).toBe("solid");
  expect(border.width).toBeGreaterThanOrEqual(1);
  expect(border.color).not.toBe(await tooltip(page).evaluate(el => getComputedStyle(el).backgroundColor));
  // The pointer is its top border. Sides painted the same color would draw a bar.
  const pointer = await tooltip(page).evaluate(el => {
    const style = getComputedStyle(el, "::after");
    return { top: style.borderTopColor, left: style.borderLeftColor, right: style.borderRightColor };
  });
  expect(pointer.top).toBe(border.color);
  expect(pointer.left).not.toBe(pointer.top);
  expect(pointer.right).not.toBe(pointer.top);
});
