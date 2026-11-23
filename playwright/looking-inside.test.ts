import { test } from "./lib/base-url";
import { expect, type Locator, type Page } from "@playwright/test";

test("Looking Inside a Neural Network steps through the 800 messages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next message" }).click();
  await expect(page.getByText("2 / 800", { exact: true })).toBeVisible();
});

test("Step 4 animates to the network's answer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Step 4" }).click();
  // The step takes a few seconds, so the answer isn't named yet.
  await expect(page.getByRole("group", { name: "Network diagram", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: /The network predicts (Approach|Wait)\./ }))
    .toBeVisible({ timeout: 10_000 });
});

test("each message's steps survive switching views", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Step 3" }).click();
  await page.getByRole("button", { name: "Next message" }).click();
  await page.getByRole("button", { name: "Step 1" }).click();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Looking Inside a Neural Network" }).click();
  await expect(page.getByText("2 / 800", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Step 1" })).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: "Previous message" }).click();
  await expect(page.getByRole("button", { name: "Step 3" })).toHaveAttribute("aria-current", "step");
});

test("the message survives switching views", async ({ page }) => {
  await page.goto("/");
  const next = page.getByRole("button", { name: "Next message" });
  await next.click();
  await next.click();
  await expect(page.getByText("3 / 800", { exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Looking Inside a Neural Network" }).click();
  await expect(page.getByText("3 / 800", { exact: true })).toBeVisible();
});

test("the filter narrows the messages Looking Inside a Neural Network steps through", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const filter = page.getByRole("textbox", { name: "Filter" });
  await filter.fill("model_correct:0");
  await expect(page.getByText("64 of 800", { exact: true })).toBeVisible();
  await expect(page.getByText("1 / 64", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next message" }).click();
  await expect(page.getByText("2 / 64", { exact: true })).toBeVisible();
});

test("a finished query is kept when switching views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Filter" }).fill("model_correct:0");
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Looking Inside a Neural Network" }).click();
  await expect(page.getByText("1 / 64", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Filter" })).toHaveValue("model_correct:0");
});

test("a half-typed query is kept when switching views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Filter" }).fill("(model_correct:0");
  await expect(page.getByText("Incomplete query", { exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Looking Inside a Neural Network" }).click();
  await expect(page.getByRole("textbox", { name: "Filter" })).toHaveValue("(model_correct:0");
  await expect(page.getByText("Incomplete query", { exact: true })).toBeVisible();
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
});

test("the filter's help lists what a query can use", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Show what you can filter on" }).click();
  const help = page.getByRole("region", { name: "What you can filter on" });
  await expect(help).toContainText("model_correct");
  await expect(help).toContainText("pathway_3");
  await expect(help).not.toContainText("resource_stressed");
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();
});

test("the filter searches the observer's notes, ignoring case", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const filter = page.getByRole("textbox", { name: "Filter" });
  await filter.fill("observation:\"Stores Nearby\"");
  await expect(page.getByText("212 of 800", { exact: true })).toBeVisible();
  await filter.fill("water");
  await expect(page.getByText("363 of 800", { exact: true })).toBeVisible();
});

test("a number field matches the number exactly", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Filter" }).fill("n:12");
  await expect(page.getByText("1 of 800", { exact: true })).toBeVisible();
});

test("a query is stored when the help closes on a click outside it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const filter = page.getByRole("textbox", { name: "Filter" });
  await filter.fill("model_correct:0");
  await page.getByRole("button", { name: "Show what you can filter on" }).click();
  // A click inside moves focus into the help, which must not lose the commit when it closes.
  await page.getByText("The observer's notes", { exact: true }).click();
  await page.getByRole("heading", { name: "Looking Inside a Neural Network" }).click();
  // Escape discards only an unstored draft, so the count stays if the query was stored.
  await filter.focus();
  await page.keyboard.press("Escape");
  await expect(page.getByText("64 of 800", { exact: true })).toBeVisible();
});

test("clicking the Filter label doesn't store a half-typed query", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const filter = page.getByRole("textbox", { name: "Filter" });
  await filter.fill("water");
  await page.getByText("Filter", { exact: true }).click();
  await expect(filter).toBeFocused();
  // Escape discards an unstored draft, so the count returns to every message.
  await page.keyboard.press("Escape");
  await expect(page.getByText("800", { exact: true })).toBeVisible();
});

test("the filter bar shows focus in forced-colors mode", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const bar = page.locator(".filter-bar");
  const outline = () => bar.evaluate(element => getComputedStyle(element).outlineStyle);
  expect(await outline()).toBe("none");
  await page.getByRole("textbox", { name: "Filter" }).focus();
  expect(await outline()).toBe("solid");
});

// Every browser Playwright runs supports :has(), so the stylesheet's fallback for older browsers is
// checked by hand.
test("the Animate checkbox shows keyboard focus around its label", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const animate = page.getByRole("checkbox", { name: "Animate" });
  // About, at the end of the steps, is the last control before Animate.
  await page.getByRole("button", { name: "About Looking Inside a Neural Network" }).focus();
  await page.keyboard.press("Tab");
  await expect(animate).toBeFocused();
  const outline = (element: Element) => getComputedStyle(element).outlineStyle;
  expect(await page.locator(".animation-controls__animate").evaluate(outline)).toBe("solid");
  expect(await animate.evaluate(outline)).toBe("none");
});

test("the speed slider shows focus in forced-colors mode", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const speed = page.getByRole("slider", { name: "Animation speed" });
  const outline = () => speed.evaluate(element => getComputedStyle(element).outlineStyle);
  expect(await outline()).toBe("none");
  await page.getByRole("checkbox", { name: "Animate" }).focus();
  await page.keyboard.press("Tab");
  await expect(speed).toBeFocused();
  expect(await outline()).toBe("solid");
});

test("Animate and the speed survive switching views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const network = page.getByRole("region", { name: "The Neural Network" });
  const animate = network.getByRole("checkbox", { name: "Animate" });
  const speed = network.getByRole("slider", { name: "Animation speed" });
  await expect(speed).toHaveAttribute("aria-valuetext", "Medium");
  await speed.focus();
  await page.keyboard.press("ArrowRight");
  await expect(speed).toHaveAttribute("aria-valuetext", "Fast");
  await animate.uncheck();
  await expect(speed).toBeDisabled();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Looking Inside a Neural Network" }).click();
  await expect(animate).not.toBeChecked();
  await expect(speed).toBeDisabled();
  await expect(speed).toHaveAttribute("aria-valuetext", "Fast");
});

test("clicking a speed's name moves the slider to it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const network = page.getByRole("region", { name: "The Neural Network" });
  // The slider is stretched over the names, so a click where a name is lands on the slider.
  const name = await network.getByText("Slow", { exact: true }).boundingBox();
  await page.mouse.click(name!.x + name!.width / 2, name!.y + name!.height / 2);
  await expect(network.getByRole("slider", { name: "Animation speed" })).toHaveAttribute("aria-valuetext", "Slow");
});

test("with Animate off, Step 4 shows the answer at once", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Animate" }).uncheck();
  await page.getByRole("button", { name: "Step 4" }).click();
  // Animated at Medium, Step 4 takes several seconds to name the answer.
  await expect(page.getByRole("group", { name: /The network predicts (Approach|Wait)\./ }))
    .toBeVisible({ timeout: 1_000 });
});

test("in a narrow window, Animate and the speed wrap below the network's title", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  // Measured once the web font has loaded, since the fallback font is wider and wraps the head
  // differently.
  await page.evaluate(() => document.fonts.ready);
  const head = await page.locator(".looking-inside__network-head").boundingBox();
  const controls = await page.locator(".animation-controls").boundingBox();
  const title = await page.getByRole("heading", { name: "The Neural Network" }).boundingBox();
  expect(controls!.x + controls!.width).toBeLessThanOrEqual(head!.x + head!.width);
  expect(controls!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
});

test("Animate and the speed sit at the right end of the network's head", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const head = await page.locator(".looking-inside__network-head").boundingBox();
  const controls = await page.locator(".animation-controls").boundingBox();
  // Only the head's 14 px side padding is to the right of the control.
  expect(head!.x + head!.width - (controls!.x + controls!.width)).toBeCloseTo(14, 0);
});

/** Opens the card's observation notes, which start closed. */
async function openNotes(page: Page) {
  const toggle = page.getByRole("button", { name: "Observation notes" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

test("the card shows the message's label, and its notes once opened", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: "Message", exact: true });
  await expect(card.getByRole("status")).toHaveText("Message 1 of 800");
  await expect(card.getByText("wait", { exact: true })).toBeVisible();
  const notes = card.getByText(/^At least one juvenile was present\./);
  await expect(notes).toBeHidden();
  await openNotes(page);
  await expect(notes).toBeVisible();

  await page.getByRole("button", { name: "Next message" }).click();
  await expect(card.getByRole("status")).toHaveText("Message 2 of 800");
  await expect(card.getByText("approach", { exact: true })).toBeVisible();
  await expect(card.getByRole("region", { name: "Observation notes" })).toBeVisible();
});

test("the observation notes open and close from the keyboard", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Observation notes" });
  const notes = page.getByRole("region", { name: "Observation notes" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(notes).toBeVisible();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(notes).toBeHidden();
});

test("the observation notes stay open when switching views", async ({ page }) => {
  await page.goto("/");
  await openNotes(page);
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Looking Inside a Neural Network" }).click();
  const toggle = page.getByRole("button", { name: "Observation notes" });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
});

// As on a school network that blocks Google Fonts, where Lato and Barlow Condensed fall back.
test("the message's words are set in Spline Sans Mono even with Google Fonts blocked", async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.goto("/");
  const words = page.locator(".message-words");
  await expect(words).toBeVisible();
  expect(await words.evaluate(el => getComputedStyle(el).fontFamily)).toMatch(/^"Spline Sans Mono"/);
  const statuses = await page.evaluate(async () => {
    await document.fonts.ready;
    return Array.from(document.fonts)
      .filter(face => face.family.replace(/"/g, "") === "Spline Sans Mono")
      .map(face => face.status);
  });
  // A face per character range, and the browser loads only the ranges the page uses.
  expect(statuses).toContain("loaded");
});

test("the card's unavailable arrow looks unavailable in forced-colors mode", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  // The arrow is the button's only face, so compare what it is filled with.
  const fill = (name: string) =>
    page.getByRole("button", { name }).locator("path").evaluate(element => getComputedStyle(element).fill);
  // On the first message Previous is unavailable and Next isn't.
  expect(await fill("Previous message")).not.toBe(await fill("Next message"));
});

test("the observation notes' caret stays a triangle in forced-colors mode", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  const caret = page.locator(".observation-notes__caret");
  // The triangle is its left border. Top and bottom painted the same color would make a square.
  const borders = await caret.evaluate(el => {
    const style = getComputedStyle(el);
    return { top: style.borderTopColor, bottom: style.borderBottomColor, left: style.borderLeftColor };
  });
  expect(borders.top).not.toBe(borders.left);
  expect(borders.bottom).not.toBe(borders.left);
});

test("the card fits the stacked layout without scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto("/");
  const card = page.getByRole("region", { name: "Message", exact: true });
  await openNotes(page);
  // The notes box scrolls on its own, so what overflows inside it doesn't widen the card.
  const notes = card.getByRole("region", { name: "Observation notes" });
  for (const box of [card, notes]) {
    expect(await box.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  }
});

test.describe("the card and network panels", () => {
  const panels = (page: Page) => ({
    card: page.getByRole("region", { name: "Message", exact: true }),
    network: page.getByRole("region", { name: "The Neural Network" }),
  });
  const rect = (locator: Locator) => locator.evaluate(el => {
    const { top, bottom, height } = el.getBoundingClientRect();
    return { top, bottom, height };
  });
  /** How far the notes box ends below its text: its 10 px padding, unless something stretched it. */
  const belowNotesText = (notes: Locator) => notes.evaluate(el =>
    el.getBoundingClientRect().bottom - el.querySelector("p")!.getBoundingClientRect().bottom);

  // On a short window the card's body has to give up height, and its head mustn't.
  for (const height of [1000, 450]) {
    test(`have heads of the same height on a ${height} px window`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height });
      await page.goto("/");
      const { card, network } = panels(page);
      await expect(card.getByRole("status")).toHaveText("Message 1 of 800");
      const cardHead = await rect(card.getByRole("heading", { name: "Message" }).locator(".."));
      const networkHead = await rect(network.getByRole("heading", { name: "The Neural Network" }).locator(".."));
      expect(networkHead.height).toBeCloseTo(cardHead.height, 0);
    });
  }

  test("match each other and fill the window", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const { card, network } = panels(page);
    await expect(card.getByRole("status")).toHaveText("Message 1 of 800");
    const cardBox = await rect(card);
    const networkBox = await rect(network);
    expect(networkBox.height).toBeCloseTo(cardBox.height, 0);
    // The view's 16 px bottom padding is all that's left below them.
    expect(cardBox.bottom).toBeCloseTo(800 - 16, 0);
  });

  test("leave the notes box as tall as its notes when the card has room to spare", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const { card } = panels(page);
    await openNotes(page);
    expect(await belowNotesText(card.getByRole("region", { name: "Observation notes" }))).toBeCloseTo(10, 0);
  });

  test("stop growing at 800 px on a tall window", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto("/");
    const { card, network } = panels(page);
    await expect(card.getByRole("status")).toHaveText("Message 1 of 800");
    expect((await rect(card)).height).toBeCloseTo(800, 0);
    expect((await rect(network)).height).toBeCloseTo(800, 0);
  });

  test("scroll the notes, not the card, on a short window", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 450 });
    await page.goto("/");
    const { card } = panels(page);
    // The message with the longest notes, which run about 15 px below the bottom of the card at its
    // smallest. Shorter notes fit in the card at its smallest.
    await page.getByRole("textbox", { name: "Filter" }).fill("n:44");
    await expect(page.getByText("1 / 1", { exact: true })).toBeVisible();
    await openNotes(page);
    const notes = card.getByRole("region", { name: "Observation notes" });
    await expect(notes).toBeVisible();
    const overflow = (locator: Locator) => locator.evaluate(el => el.scrollHeight - el.clientHeight);
    expect(await overflow(notes)).toBeGreaterThan(0);
    expect(await overflow(card)).toBeLessThanOrEqual(0);
    // It scrolls, so the keyboard can reach it.
    await expect(notes).toHaveAttribute("tabindex", "0");
  });

  // Like Firefox's "Zoom text only": every font twice its size, nothing else.
  test("keep the card's content inside it when only the text is zoomed", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 450 });
    await page.goto("/");
    const { card } = panels(page);
    // Open, so the card is as full as it gets.
    await openNotes(page);
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>("body *"));
      const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize));
      elements.forEach((element, i) => { element.style.fontSize = `${sizes[i] * 2}px`; });
    });
    await card.evaluate(el => el.scrollIntoView({ block: "start" }));
    const inCardBelowIt = await card.evaluate(el => {
      const { left, bottom } = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(left + 20, bottom + 10));
    });
    expect(inCardBelowIt).toBe(false);
  });

  test("keep their natural height when stacked, with the view's padding below", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 500 });
    await page.goto("/");
    const { card, network } = panels(page);
    await openNotes(page);
    const notes = card.getByRole("region", { name: "Observation notes" });
    expect(await notes.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(0);
    // Nothing to scroll, so it isn't a Tab stop.
    await expect(notes).not.toHaveAttribute("tabindex");
    expect(await belowNotesText(notes)).toBeCloseTo(10, 0);
    await page.getByRole("main").evaluate(el => el.scrollTo(0, el.scrollHeight));
    expect((await rect(network)).bottom).toBeCloseTo(500 - 16, 0);
  });

  test("stop shrinking at the diagram's smallest with its chrome, and the page scrolls instead", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 450 });
    await page.goto("/");
    const { card, network } = panels(page);
    await expect(card.getByRole("status")).toHaveText("Message 1 of 800");
    // The diagram at MIN_HEIGHT (331) with its 8 px padding above and below, and the panels the same
    // height.
    expect((await rect(network.locator(".looking-inside__diagram"))).height).toBeCloseTo(331 + 16, 0);
    const networkBox = await rect(network);
    expect((await rect(card)).height).toBeCloseTo(networkBox.height, 0);
    // The drawing and the readout box still fit in the panel at its smallest.
    expect((await rect(network.locator("svg").first())).bottom).toBeLessThanOrEqual(networkBox.bottom);
    expect((await rect(page.getByTestId("readout-box"))).bottom).toBeLessThanOrEqual(networkBox.bottom);
    const view = page.getByRole("main");
    expect(await view.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);
  });
});

/** What an Interactive takes from the diagram's width: its 16 px gutters and the network panel's borders. */
const INTERACTIVE_EXTRA = 34;

/**
 * Opens the view as an Interactive `width` wide, waits until the diagram is laid out at
 * `diagramWidth`, and returns what scrolls, and whether anything runs past the network panel's
 * border. The Interactive's gutter would hide a small spill from the page.
 */
async function diagramIn(page: Page, width: number, diagramWidth: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/?interactive=looking-inside");
  const diagram = page.getByRole("group", { name: "Network diagram", exact: true });
  await expect(diagram).toHaveAttribute("width", String(diagramWidth));
  return page.evaluate(() => {
    const scrollsSideways = (element: Element) => element.scrollWidth > element.clientWidth;
    return {
      page: scrollsSideways(document.documentElement),
      panel: scrollsSideways(document.querySelector(".looking-inside__network")!),
      diagram: scrollsSideways(document.querySelector(".network-diagram")!),
    };
  });
}

/** The diagram's scroller: a group named by its panel's heading. */
const diagramGroup = (page: Page) => page.getByRole("group", { name: "The Neural Network" });

// 380 is the narrowest the diagram is laid out (MIN_WIDTH in layout.ts).

test("an Interactive just wide enough holds the diagram without scrolling", async ({ page }) => {
  expect(await diagramIn(page, 380 + INTERACTIVE_EXTRA, 380)).toEqual({ page: false, panel: false, diagram: false });
  await expect(diagramGroup(page)).not.toHaveAttribute("tabindex");
});

test("an Interactive a pixel too narrow scrolls the diagram inside its panel, not the page", async ({ page }) => {
  expect(await diagramIn(page, 379 + INTERACTIVE_EXTRA, 380)).toEqual({ page: false, panel: false, diagram: true });
  await expect(diagramGroup(page)).toHaveAttribute("tabindex", "0");
});

test("a 320 px Interactive scrolls only the diagram", async ({ page }) => {
  expect(await diagramIn(page, 320, 380)).toEqual({ page: false, panel: false, diagram: true });
});

test("the keyboard can reach and scroll a diagram too wide for its Interactive", async ({ page }) => {
  await diagramIn(page, 320, 380);
  // The speed slider in the network panel's head is the last control before the diagram.
  await page.getByRole("slider", { name: "Animation speed" }).focus();
  await page.keyboard.press("Tab");
  await expect(diagramGroup(page)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => diagramGroup(page).evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
});

// Widening past 910 px also switches the view to two columns.
test("the diagram keeps the focus when its Interactive widens and it stops scrolling", async ({ page }) => {
  await diagramIn(page, 320, 380);
  await diagramGroup(page).focus();
  await page.setViewportSize({ width: 1300, height: 900 });
  await expect.poll(() => page.locator(".network-diagram").evaluate(e => e.scrollWidth > e.clientWidth)).toBe(false);
  await expect(diagramGroup(page)).toBeFocused();
  // Once the focus leaves, there's nothing to scroll, so it's no longer a Tab stop.
  await page.keyboard.press("Shift+Tab");
  await expect(diagramGroup(page)).not.toHaveAttribute("tabindex");
});

// Classic scrollbars, as on Windows, take room from the box they appear in. A drawing a fraction of
// a pixel bigger than its box would show them, shrink to fit the smaller box, lose them, and grow
// back, on every animation frame. The padding nudges move the panel's height through a whole
// pixel's fractions.
test("the diagram is never drawn bigger than its box, even by a fraction of a pixel", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?interactive=looking-inside");
  const diagram = page.getByRole("group", { name: "Network diagram", exact: true });
  await expect(diagram).toBeVisible();
  for (const padding of [16.2, 16.4, 16.6, 16.8]) {
    await page.locator(".looking-inside").evaluate((el, px) => { el.style.paddingBottom = `${px}px`; }, padding);
    await expect.poll(async () => {
      const box = (await diagramGroup(page).boundingBox())!;
      const width = Number(await diagram.getAttribute("width"));
      const height = Number(await diagram.getAttribute("height"));
      // Within a pixel of the box's height, so it has caught up with the new padding.
      return width <= box.width && height <= box.height && box.height - height < 1;
    }, { message: `with ${padding} px of padding` }).toBe(true);
  }
});

test.describe("About", () => {
  /**
   * The narrowest Interactive the view is designed for, which holds the network's head on one line with
   * room to spare for text drawn wider: see the README's Size section.
   */
  const MIN_LAYOUT_WIDTH = 990;
  /** The narrowest Interactive with two columns, where the head wraps. */
  const TWO_COLUMN_WIDTH = 910;
  /** The shortest Interactive the view fits without scrolling down: see the README's Size section. */
  const MIN_LAYOUT_HEIGHT = 562;
  const about = (page: Page) => page.getByRole("button", { name: "About Looking Inside a Neural Network" });
  const box = async (locator: Locator) => (await locator.boundingBox())!;

  async function openAt(page: Page, width: number, height: number) {
    await page.setViewportSize({ width, height });
    await page.goto("/?interactive=looking-inside");
    await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
  }

  test("ends the step row at the minimum layout size, and nothing scrolls", async ({ page }) => {
    await openAt(page, MIN_LAYOUT_WIDTH, MIN_LAYOUT_HEIGHT);
    const aboutBox = await box(about(page));
    const resetBox = await box(page.getByRole("button", { name: "Reset" }));
    const cellBox = await box(page.locator(".looking-inside__step-row"));
    expect(aboutBox.y).toBeCloseTo(resetBox.y, 0);
    expect(aboutBox.x + aboutBox.width).toBeCloseTo(cellBox.x + cellBox.width, 0);
    // The step row is no taller than the filter row beside it.
    expect(cellBox.height).toBeCloseTo((await box(page.locator(".looking-inside__filter-row"))).height, 0);
    // Still two columns: the card and the network start on the same line.
    const card = await box(page.getByRole("region", { name: "Message", exact: true }));
    const network = await box(page.getByRole("region", { name: "The Neural Network" }));
    expect(network.y).toBeCloseTo(card.y, 0);
    const scrolls = await page.evaluate(() => [document.documentElement, document.querySelector("main")!]
      .some(element => element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight));
    expect(scrolls).toBe(false);
  });

  test("holds the network's head on one line at the minimum layout size", async ({ page }) => {
    await openAt(page, MIN_LAYOUT_WIDTH, MIN_LAYOUT_HEIGHT);
    const title = await box(page.getByRole("heading", { name: "The Neural Network" }));
    const controls = await box(page.locator(".animation-controls"));
    const center = (b: { y: number; height: number }) => b.y + b.height / 2;
    expect(Math.abs(center(title) - center(controls))).toBeLessThanOrEqual(4);
  });

  test("wraps the network's head, without overflowing, below the minimum layout width", async ({ page }) => {
    await openAt(page, TWO_COLUMN_WIDTH, 900);
    const head = await box(page.locator(".looking-inside__network-head"));
    const title = await box(page.getByRole("heading", { name: "The Neural Network" }));
    const legend = await box(page.locator(".activation-legend"));
    const rule = await box(page.locator(".looking-inside__network-rule"));
    const controls = await box(page.locator(".animation-controls"));
    // The legend, the rule and the controls drop below the title together, the controls still last.
    expect(legend.y).toBeGreaterThanOrEqual(title.y + title.height);
    expect(controls.y).toBeGreaterThanOrEqual(title.y + title.height);
    expect(rule.x + rule.width).toBeLessThanOrEqual(controls.x);
    expect(controls.x + controls.width).toBeLessThanOrEqual(head.x + head.width);
    expect(controls.y + controls.height).toBeLessThanOrEqual(head.y + head.height);
  });

  // A wrapped head is taller than one line, and the panels' smallest grows with it rather than
  // pushing the readout box past the panel's border.
  for (const [where, width, blockFonts] of [["where the head wraps", 950, false],
    ["with Google Fonts blocked", 1024, true]] as const) {
    test(`keeps the readout box inside the network panel ${where}, at the minimum layout height`,
      async ({ page }) => {
        if (blockFonts) await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
        await openAt(page, width, MIN_LAYOUT_HEIGHT);
        const network = await box(page.getByRole("region", { name: "The Neural Network" }));
        const head = await box(page.locator(".looking-inside__network-head"));
        expect(head.height).toBeGreaterThan(62);
        const readoutBox = await box(page.getByTestId("readout-box"));
        expect(readoutBox.y + readoutBox.height).toBeLessThanOrEqual(network.y + network.height);
        // Read together, since the box measures its texts again as the layout settles.
        await expect.poll(() => page.evaluate(() => {
          const height = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().height;
          return Math.abs(height(".message-card") - height(".looking-inside__network"));
        })).toBeLessThan(0.5);
      });
  }

  test("stays beside the steps when a pixel narrower stacks the columns", async ({ page }) => {
    await openAt(page, TWO_COLUMN_WIDTH - 1, 900);
    const card = await box(page.getByRole("region", { name: "Message", exact: true }));
    const network = await box(page.getByRole("region", { name: "The Neural Network" }));
    expect(network.y).toBeGreaterThan(card.y + card.height);
    const aboutBox = await box(about(page));
    const resetBox = await box(page.getByRole("button", { name: "Reset" }));
    expect(aboutBox.y).toBeCloseTo(resetBox.y, 0);
  });

  test("wraps below the steps in a 320 px Interactive without scrolling sideways", async ({ page }) => {
    await openAt(page, 320, 562);
    const aboutBox = await box(about(page));
    const resetBox = await box(page.getByRole("button", { name: "Reset" }));
    const cellBox = await box(page.locator(".looking-inside__step-row"));
    expect(aboutBox.y).toBeGreaterThanOrEqual(resetBox.y + resetBox.height);
    expect(aboutBox.x + aboutBox.width).toBeLessThanOrEqual(cellBox.x + cellBox.width + 0.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth))
      .toBe(false);
  });

  test("stays when the filter matches nothing", async ({ page }) => {
    await openAt(page, 1024, 562);
    await page.getByRole("textbox", { name: "Filter" }).fill("zzzzqqqq");
    await expect(page.getByText("No messages match that search.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).toHaveCount(0);
    await expect(about(page)).toBeVisible();
  });
});

test.describe("Step 1's word flights", () => {
  const chips = (page: Page) => page.locator(".word-flight-overlay__chip");

  async function openMessage(page: Page) {
    await page.goto("/");
    await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  }

  async function cardWords(page: Page): Promise<string[]> {
    return page.locator(".message-words__word").allTextContents();
  }

  test("fly the message's words into the input layer, then clear them", async ({ page }) => {
    await openMessage(page);
    await page.getByRole("button", { name: "Step 1" }).click();
    await expect(chips(page).first()).toBeVisible({ timeout: 500 });
    const words = await cardWords(page);
    expect(words).toContain(await chips(page).first().textContent());
    await expect(page.getByRole("button", { name: "Step 1" })).toHaveAttribute("aria-current", "step");
    await expect(chips(page)).toHaveCount(0, { timeout: 10_000 });
  });

  test("fly when the columns are stacked too", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await openMessage(page);
    await page.getByRole("button", { name: "Step 1" }).click();
    await expect(chips(page).first()).toBeVisible({ timeout: 500 });
    await expect(chips(page)).toHaveCount(0, { timeout: 10_000 });
  });

  test("are skipped with Animate off", async ({ page }) => {
    await openMessage(page);
    await page.getByRole("checkbox", { name: "Animate" }).uncheck();
    await page.getByRole("button", { name: "Step 1" }).click();
    await expect(page.getByRole("button", { name: "Step 1" })).toHaveAttribute("aria-current", "step");
    // Poll over the time a flight would have taken to start.
    for (let i = 0; i < 5; i++) {
      await expect(chips(page)).toHaveCount(0);
      await page.waitForTimeout(100);
    }
  });

  test("vanish at once when the message changes", async ({ page }) => {
    await openMessage(page);
    await page.getByRole("button", { name: "Step 1" }).click();
    await expect(chips(page).first()).toBeVisible({ timeout: 500 });
    await page.getByRole("button", { name: "Next message" }).click();
    await expect(page.getByText("2 / 800", { exact: true })).toBeVisible();
    await expect(chips(page)).toHaveCount(0);
  });

  test("re-aim at the neurons' new places when the window resizes", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openMessage(page);
    await page.getByRole("button", { name: "Step 1" }).click();
    await expect(chips(page).first()).toBeVisible({ timeout: 500 });
    await page.setViewportSize({ width: 600, height: 900 });
    expect(await aLandingChipIsOnItsNeuron(page)).toBe(true);
  });

  test("re-aim at the neurons' new places when the diagram scrolls", async ({ page }) => {
    // Narrow enough that the diagram scrolls sideways in its panel.
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/?interactive=looking-inside");
    await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Step 1" }).click();
    await expect(chips(page).first()).toBeVisible({ timeout: 500 });
    await page.locator(".network-diagram").evaluate(scroller => { scroller.scrollLeft = scroller.scrollWidth; });
    expect(await page.locator(".network-diagram").evaluate(scroller => scroller.scrollLeft)).toBeGreaterThan(50);
    expect(await aLandingChipIsOnItsNeuron(page)).toBe(true);
  });

  /** Waits for a chip about to land, which has faded a little, to sit on an input neuron. */
  async function aLandingChipIsOnItsNeuron(page: Page) {
    const near = await page.waitForFunction(() => {
      const outlines = Array.from(document.querySelectorAll(".network-diagram__node[data-column='0']"), node => {
        const rect = node.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
      for (const chip of document.querySelectorAll<HTMLElement>(".word-flight-overlay__chip")) {
        if (Number(chip.style.opacity) >= 1) {
          continue;
        }
        const rect = chip.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        if (outlines.some(o => Math.hypot(o.x - x, o.y - y) <= 20)) {
          return true;
        }
      }
      return false;
    }, undefined, { timeout: 10_000, polling: "raf" });
    return near.jsonValue();
  }
});

test.describe("the neurons' readouts", () => {
  const neuron = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^${name},`) });
  /** What the readout box says: the prompt or the readout. */
  const readoutBox = (page: Page) => page.getByTestId("readout-box").getByRole("status");

  /** Opens the view with Animate off, so a step ends at once, and plays the steps up to `step`. */
  async function stepTo(page: Page, step: number) {
    await page.goto("/");
    await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
    await page.getByRole("checkbox", { name: "Animate" }).uncheck();
    await page.getByRole("button", { name: `Step ${step}` }).click();
    await expect(page.getByRole("button", { name: `Step ${step}` })).toHaveAttribute("aria-current", "step");
  }

  test("hovering a reached neuron dims the other connections in its gaps", async ({ page }) => {
    await stepTo(page, 2);
    await neuron(page, "Hidden Layer 1 Neuron 1").hover();
    // From input 1 to Hidden Layer 1 Neuron 2: in the gap, but not touching the neuron.
    await expect(page.getByTestId("edge-near-0-0-1")).toHaveAttribute("opacity", "0.1");
    // From input 1 into Neuron 1 itself.
    await expect(page.getByTestId("edge-near-0-0-0")).not.toHaveAttribute("opacity");
  });

  test("clicking a neuron pins its readout, and the keyboard can do the same", async ({ page }) => {
    await stepTo(page, 4);
    await expect(readoutBox(page)).toHaveText("Click any neuron in any layer to see how data flows.");

    await page.getByRole("checkbox", { name: "Animate" }).focus();
    // The speed slider is disabled and the diagram doesn't scroll, so the neurons are next.
    await page.keyboard.press("Tab");
    await expect(neuron(page, "Input Layer Neuron 1")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(neuron(page, "Hidden Layer 1 Neuron 1")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(readoutBox(page)).toContainText("Hidden Layer 1 Neuron 1: Activation = ");
    await page.keyboard.press("Escape");
    await expect(readoutBox(page)).toHaveText("Click any neuron in any layer to see how data flows.");

    await neuron(page, "Hidden Layer 2 Neuron 1").click();
    await expect(readoutBox(page)).toContainText("Hidden Layer 2 Neuron 1: Activation = ");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(neuron(page, "Hidden Layer 2 Neuron 1")).toBeFocused();
    await expect(readoutBox(page)).toHaveText("Click any neuron in any layer to see how data flows.");
  });

  // The pill covers the output's circle, so most clicks on an output land on it.
  test("a click on an output's circle focuses that neuron, so Escape then unpins it", async ({ page }) => {
    await stepTo(page, 4);
    const circle = (await page.getByTestId("neuron-target-3-1").boundingBox())!;
    await page.mouse.click(circle.x + circle.width / 2, circle.y + circle.height / 2);
    await expect(neuron(page, "Output Layer: Approach")).toHaveAttribute("aria-pressed", "true");
    await expect(neuron(page, "Output Layer: Approach")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(neuron(page, "Output Layer: Approach")).toHaveAttribute("aria-pressed", "false");
  });

  // Safari doesn't focus a button it clicks, and element.click() doesn't either.
  test("keeps focus in the diagram when a step press that doesn't move focus leaves the neuron unreached",
    async ({ page }) => {
      await stepTo(page, 4);
      await neuron(page, "Output Layer: Wait").focus();
      await page.getByRole("button", { name: "Step 2" }).evaluate(button => (button as HTMLElement).click());
      await expect(page.getByRole("button", { name: "Step 2" })).toHaveAttribute("aria-current", "step");
      await expect(neuron(page, "Input Layer Neuron 1")).toBeFocused();
    });

  test.describe("the rings", () => {
    const ring = (page: Page, column: number, unit: number) => page.getByTestId(`ring-${column}-${unit}`);
    const dimmedEdges = (page: Page) => page.locator("[data-testid^='edge-'][opacity='0.1']");
    /** colors.$ink, the pinned ring, and colors.$wait, the keyboard focus ring. */
    const INK = "rgb(30, 36, 44)";
    const FOCUS_BLUE = "rgb(58, 114, 190)";
    const strokeOf = (page: Page, column: number, unit: number) => ring(page, column, unit)
      .evaluate(circle => {
        const style = getComputedStyle(circle);
        return { stroke: style.stroke, opacity: style.opacity };
      });

    test("a click rings the pinned neuron in ink, not the focus blue", async ({ page }) => {
      await stepTo(page, 2);
      await neuron(page, "Hidden Layer 1 Neuron 1").click();
      await expect(neuron(page, "Hidden Layer 1 Neuron 1")).toHaveAttribute("aria-pressed", "true");
      expect(await strokeOf(page, 1, 0)).toEqual({ stroke: INK, opacity: "1" });
    });

    // A dark theme's canvas would hide the ink rings, which forced colors leave as they are.
    test("draws the rings in the theme's colors in a dark forced-colors theme", async ({ page }) => {
      await page.emulateMedia({ forcedColors: "active", colorScheme: "dark" });
      await stepTo(page, 2);
      await neuron(page, "Hidden Layer 1 Neuron 1").click();
      await page.keyboard.press("ArrowDown");
      await expect(neuron(page, "Hidden Layer 1 Neuron 2")).toBeFocused();
      await neuron(page, "Input Layer Neuron 1").hover();
      const theme = await page.evaluate(() => {
        const probe = document.createElement("div");
        document.body.append(probe);
        const colorOf = (value: string) => { probe.style.color = value; return getComputedStyle(probe).color; };
        const colors = { canvasText: colorOf("CanvasText"), highlight: colorOf("Highlight") };
        probe.remove();
        return colors;
      });
      expect((await strokeOf(page, 1, 0)).stroke).toBe(theme.canvasText);
      expect((await strokeOf(page, 1, 1)).stroke).toBe(theme.highlight);
      expect((await strokeOf(page, 0, 0)).stroke).toBe(theme.canvasText);
    });

    test("a click that unpins leaves no ring and no highlight once the mouse moves away", async ({ page }) => {
      await stepTo(page, 2);
      await neuron(page, "Hidden Layer 1 Neuron 1").click();
      await neuron(page, "Hidden Layer 1 Neuron 1").click();
      await expect(neuron(page, "Hidden Layer 1 Neuron 1")).toHaveAttribute("aria-pressed", "false");
      await page.mouse.move(0, 0);
      await expect(ring(page, 1, 0)).toHaveCount(0);
      await expect(dimmedEdges(page)).toHaveCount(0);
      await expect(readoutBox(page)).toHaveText(/^Click any neuron in the Input Layer or Hidden Layer 1/);
    });

    test("clearing with the mouse leaves no ring and no highlight on the neuron it focuses", async ({ page }) => {
      await stepTo(page, 4);
      await page.getByTestId("pill-target-1").click();
      await expect(readoutBox(page)).toContainText("Approach");
      await page.getByRole("button", { name: "Clear" }).click();
      await expect(neuron(page, "Output Layer: Approach")).toBeFocused();
      await expect(ring(page, 3, 1)).toHaveCount(0);
      await expect(dimmedEdges(page)).toHaveCount(0);
    });

    test("keyboard focus rings a neuron in blue, and a pin from the keyboard turns it ink", async ({ page }) => {
      await stepTo(page, 4);
      await page.getByRole("checkbox", { name: "Animate" }).focus();
      await page.keyboard.press("Tab");
      await expect(neuron(page, "Input Layer Neuron 1")).toBeFocused();
      expect(await strokeOf(page, 0, 0)).toEqual({ stroke: FOCUS_BLUE, opacity: "1" });
      await expect(dimmedEdges(page).first()).toBeAttached();
      await page.keyboard.press("Enter");
      await expect(neuron(page, "Input Layer Neuron 1")).toHaveAttribute("aria-pressed", "true");
      expect(await strokeOf(page, 0, 0)).toEqual({ stroke: INK, opacity: "1" });

      // Clearing from the keyboard sends focus back to the neuron, where the keyboard can see it.
      await page.getByRole("button", { name: "Clear" }).focus();
      await page.keyboard.press("Enter");
      await expect(neuron(page, "Input Layer Neuron 1")).toBeFocused();
      expect(await strokeOf(page, 0, 0)).toEqual({ stroke: FOCUS_BLUE, opacity: "1" });
    });

    test("a key pressed on a clicked neuron shows its focus", async ({ page }) => {
      await stepTo(page, 2);
      await neuron(page, "Hidden Layer 1 Neuron 1").click();
      await page.mouse.move(0, 0);
      // Unpinning from the keyboard leaves the neuron focused, so the ring shows where focus is.
      await page.keyboard.press("Enter");
      await expect(neuron(page, "Hidden Layer 1 Neuron 1")).toHaveAttribute("aria-pressed", "false");
      expect(await strokeOf(page, 1, 0)).toEqual({ stroke: FOCUS_BLUE, opacity: "1" });
    });
  });

  const cutOff = (page: Page) => page.getByTestId("readout-box")
    .evaluate(box => box.scrollHeight > box.clientHeight);

  test.describe("at 200% zoom", () => {
    // Zoom halves the viewport in CSS pixels and doubles the device pixels: see docs/accessibility.md.
    test.use({ viewport: { width: 512, height: 281 }, deviceScaleFactor: 2 });

    test("the readout is never cut off", async ({ page }) => {
      await stepTo(page, 2);
      await neuron(page, "Hidden Layer 1 Neuron 1").click();
      await expect(readoutBox(page)).toContainText("Hidden Layer 1 Neuron 1: Activation = ");
      expect(await cutOff(page)).toBe(false);
    });
  });

  // Like Firefox's "Zoom text only": every font twice its size, nothing else.
  test("the readout is never cut off when only the text is zoomed", async ({ page }) => {
    await stepTo(page, 2);
    await neuron(page, "Hidden Layer 1 Neuron 1").click();
    await expect(readoutBox(page)).toContainText("Hidden Layer 1 Neuron 1: Activation = ");
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>("body *"));
      const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize));
      elements.forEach((element, i) => { element.style.fontSize = `${sizes[i] * 2}px`; });
    });
    expect(await cutOff(page)).toBe(false);
  });

  test("the box measures again when only its text is zoomed, while it shows nothing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
    const heights = () => page.evaluate(() => ({
      held: parseFloat(document.querySelector<HTMLElement>(".readout-box")!.style.minHeight),
      tallest: Math.max(...Array.from(document.querySelectorAll<HTMLElement>(".readout-box__candidate"),
        candidate => candidate.offsetHeight)),
    }));
    const before = await heights();
    expect(before.held).toBe(before.tallest);
    // The box is empty while Step 1 plays, about 5 s, so zooming its text doesn't resize it.
    await page.getByRole("button", { name: "Step 1" }).click();
    await expect(readoutBox(page)).toBeEmpty();
    // Only the box's text, so nothing else that is observed changes size.
    await page.addStyleTag({ content: ".readout-box, .readout-box__candidate { font-size: 26px !important; }" });
    await expect.poll(async () => {
      const after = await heights();
      return after.held === after.tallest && after.tallest > before.tallest;
    }, { timeout: 1_000 }).toBe(true);
    // Measured while Step 1 still plays, not by the render its end brings.
    await expect(readoutBox(page)).toBeEmpty();
  });
});

test("the network's head holds its title, legend and controls in that order", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const title = (await page.getByRole("heading", { name: "The Neural Network" }).boundingBox())!;
  const legend = (await page.locator(".activation-legend").boundingBox())!;
  const controls = (await page.locator(".animation-controls").boundingBox())!;
  expect(title.x + title.width).toBeLessThanOrEqual(legend.x);
  expect(legend.x + legend.width).toBeLessThanOrEqual(controls.x);
  const center = (box: { y: number; height: number }) => box.y + box.height / 2;
  expect(Math.abs(center(title) - center(legend))).toBeLessThanOrEqual(4);
  expect(Math.abs(center(legend) - center(controls))).toBeLessThanOrEqual(4);
});

// As on a school network that blocks Google Fonts, in an Interactive. 990 is the minimum layout width;
// 1024 the designed width, where the wider fallback font still wraps the head; 480 is a narrow window.
// Every item must stay inside the head's side padding, and when the head wraps the legend drops below
// the title with the controls rather than staying on the title's line.
for (const width of [480, 990, 1024]) {
  test(`with Google Fonts blocked, nothing in the network's head runs past it at ${width} px`, async ({ page }) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?interactive=looking-inside");
    await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const box = async (locator: Locator) => (await locator.boundingBox())!;
    const head = await box(page.locator(".looking-inside__network-head"));
    const title = await box(page.getByRole("heading", { name: "The Neural Network" }));
    const legend = await box(page.locator(".activation-legend"));
    const rule = await box(page.locator(".looking-inside__network-rule"));
    const controls = await box(page.locator(".animation-controls"));
    for (const [name, item] of Object.entries({ title, legend, rule, controls })) {
      expect(item.x + item.width, name).toBeLessThanOrEqual(head.x + head.width - 14 + 0.5);
    }
    if (width === 480) {
      expect(legend.y).toBeGreaterThanOrEqual(title.y + title.height);
    }
    if (controls.y >= title.y + title.height) {
      expect(legend.y).toBeGreaterThanOrEqual(title.y + title.height);
    }
  });
}
