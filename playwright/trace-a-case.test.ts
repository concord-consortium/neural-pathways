import { test } from "./lib/base-url";
import { expect, type Locator, type Page } from "@playwright/test";

test("Trace a Case steps through the 800 conversations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next conversation" }).click();
  await expect(page.getByText("2 / 800", { exact: true })).toBeVisible();
});

test("Step 4 animates to the network's answer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Step 4" }).click();
  // The step takes a few seconds, so the answer isn't named yet.
  await expect(page.getByRole("img", { name: "Network diagram", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /The network predicts (Approach|Wait)\./ }))
    .toBeVisible({ timeout: 10_000 });
});

test("each conversation's steps survive switching views", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Step 3" }).click();
  await page.getByRole("button", { name: "Next conversation" }).click();
  await page.getByRole("button", { name: "Step 1" }).click();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(page.getByText("2 / 800", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Step 1" })).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: "Previous conversation" }).click();
  await expect(page.getByRole("button", { name: "Step 3" })).toHaveAttribute("aria-current", "step");
});

test("the conversation survives switching views", async ({ page }) => {
  await page.goto("/");
  const next = page.getByRole("button", { name: "Next conversation" });
  await next.click();
  await next.click();
  await expect(page.getByText("3 / 800", { exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(page.getByText("3 / 800", { exact: true })).toBeVisible();
});

test("the filter narrows the conversations Trace a Case steps through", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const filter = page.getByRole("textbox", { name: "Filter" });
  await filter.fill("model_correct:0");
  await expect(page.getByText("64 of 800", { exact: true })).toBeVisible();
  await expect(page.getByText("1 / 64", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next conversation" }).click();
  await expect(page.getByText("2 / 64", { exact: true })).toBeVisible();
});

test("a finished query is kept when switching views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Filter" }).fill("model_correct:0");
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Trace a Case" }).click();
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
  await nav.getByRole("link", { name: "Trace a Case" }).click();
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
  await page.getByRole("heading", { name: "Trace a Case" }).click();
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
  // Escape discards an unstored draft, so the count returns to every conversation.
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
  await page.getByRole("button", { name: "About Trace a Case" }).focus();
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
  const network = page.getByRole("region", { name: "The Network" });
  const animate = network.getByRole("checkbox", { name: "Animate" });
  const speed = network.getByRole("slider", { name: "Animation speed" });
  await expect(speed).toHaveAttribute("aria-valuetext", "Med");
  await speed.focus();
  await page.keyboard.press("ArrowRight");
  await expect(speed).toHaveAttribute("aria-valuetext", "Fast");
  await animate.uncheck();
  await expect(speed).toBeDisabled();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Correlations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correlations", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Trace a Case" }).click();
  await expect(animate).not.toBeChecked();
  await expect(speed).toBeDisabled();
  await expect(speed).toHaveAttribute("aria-valuetext", "Fast");
});

test("clicking a speed's name moves the slider to it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const network = page.getByRole("region", { name: "The Network" });
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
  // Animated at Med, Step 4 takes several seconds to name the answer.
  await expect(page.getByRole("img", { name: /The network predicts (Approach|Wait)\./ }))
    .toBeVisible({ timeout: 1_000 });
});

test("in a narrow window, Animate and the speed wrap below the network's title", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  // Measured once the web font has loaded: the fallback font is wider, so the controls would
  // overrun the head.
  await page.evaluate(() => document.fonts.ready);
  const head = await page.locator(".trace-a-case__network-head").boundingBox();
  const controls = await page.locator(".animation-controls").boundingBox();
  const title = await page.getByRole("heading", { name: "The Network" }).boundingBox();
  expect(controls!.x + controls!.width).toBeLessThanOrEqual(head!.x + head!.width);
  expect(controls!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
});

test("Animate and the speed sit at the right end of the network's head", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  const head = await page.locator(".trace-a-case__network-head").boundingBox();
  const controls = await page.locator(".animation-controls").boundingBox();
  // Only the head's 14 px side padding is to the right of the control.
  expect(head!.x + head!.width - (controls!.x + controls!.width)).toBeCloseTo(14, 0);
});

test("the card shows the conversation's label, notes and attribute indicators", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: "Conversation", exact: true });
  await expect(card.getByRole("status")).toHaveText("Conversation 1 of 800");
  await expect(card.getByText("wait", { exact: true })).toBeVisible();
  await expect(card.getByText(/^At least one juvenile was present\./)).toBeVisible();
  const indicators = card.getByRole("listitem");
  await expect(indicators).toHaveCount(5);
  // Each indicator has a drawing, and the drawing has something in it.
  const icons = indicators.locator("svg");
  await expect(icons).toHaveCount(5);
  expect(await icons.evaluateAll(svgs => svgs.map(svg => svg.childElementCount > 0))).toEqual(Array(5).fill(true));
  // The indicators share the row equally, so a long label wraps rather than widening its indicator.
  const widths = await indicators.evaluateAll(items =>
    items.map(item => Math.round(item.getBoundingClientRect().width)));
  expect(new Set(widths).size).toBe(1);
  // What a screen reader reads of each indicator; the value shown is hidden from it.
  const spoken = () => indicators.evaluateAll(items => items.map(item => {
    const copy = item.cloneNode(true) as Element;
    copy.querySelectorAll('[aria-hidden="true"]').forEach(hidden => hidden.remove());
    return copy.textContent;
  }));
  expect(await spoken()).toEqual([
    "Voices raised: no", "Engaged in a task: yes", "Group size: 2", "Near water: yes", "Food present: no",
  ]);
  // A hidden attribute gets no attribute indicator until it is commissioned.
  await expect(card.getByText("Resource stressed")).toHaveCount(0);

  await page.getByRole("button", { name: "Next conversation" }).click();
  await expect(card.getByRole("status")).toHaveText("Conversation 2 of 800");
  await expect(card.getByText("approach", { exact: true })).toBeVisible();
  expect(await spoken()).toEqual([
    "Voices raised: yes", "Engaged in a task: no", "Group size: 3", "Near water: yes", "Food present: yes",
  ]);
});

test("the card's unavailable arrow looks unavailable in forced-colors mode", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
  // The arrow is the button's only face, so compare what it is filled with.
  const fill = (name: string) =>
    page.getByRole("button", { name }).locator("path").evaluate(element => getComputedStyle(element).fill);
  // On the first conversation Previous is unavailable and Next isn't.
  expect(await fill("Previous conversation")).not.toBe(await fill("Next conversation"));
});

test("the card fits the stacked layout without scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto("/");
  const card = page.getByRole("region", { name: "Conversation", exact: true });
  await expect(card.getByRole("listitem")).toHaveCount(5);
  // The notes box scrolls on its own, so what overflows inside it doesn't widen the card.
  const notes = card.getByRole("region", { name: "Observation notes" });
  for (const box of [card, notes]) {
    expect(await box.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  }
});

test.describe("the card and network panels", () => {
  const panels = (page: Page) => ({
    card: page.getByRole("region", { name: "Conversation", exact: true }),
    network: page.getByRole("region", { name: "The Network" }),
  });
  const rect = (locator: Locator) => locator.evaluate(el => {
    const { top, bottom, height } = el.getBoundingClientRect();
    return { top, bottom, height };
  });

  // On a short window the card's body has to give up height, and its head mustn't.
  for (const height of [1000, 450]) {
    test(`have heads of the same height on a ${height} px window`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height });
      await page.goto("/");
      const { card, network } = panels(page);
      await expect(card.getByRole("listitem")).toHaveCount(5);
      const cardHead = await rect(card.getByRole("heading", { name: "Conversation" }).locator(".."));
      const networkHead = await rect(network.getByRole("heading", { name: "The Network" }).locator(".."));
      expect(networkHead.height).toBeCloseTo(cardHead.height, 0);
    });
  }

  test("match each other and fill the window", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const { card, network } = panels(page);
    await expect(card.getByRole("listitem")).toHaveCount(5);
    const cardBox = await rect(card);
    const networkBox = await rect(network);
    expect(networkBox.height).toBeCloseTo(cardBox.height, 0);
    // The view's 16 px bottom padding is all that's left below them.
    expect(cardBox.bottom).toBeCloseTo(800 - 16, 0);
  });

  test("stop growing at 800 px on a tall window", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto("/");
    const { card, network } = panels(page);
    await expect(card.getByRole("listitem")).toHaveCount(5);
    expect((await rect(card)).height).toBeCloseTo(800, 0);
    expect((await rect(network)).height).toBeCloseTo(800, 0);
  });

  test("scroll the notes, not the card, on a short window", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 450 });
    await page.goto("/");
    const { card } = panels(page);
    // A long conversation, so its attribute indicators sit well below the bottom of the card.
    await page.getByRole("textbox", { name: "Filter" }).fill("n:500");
    await expect(page.getByText("1 / 1", { exact: true })).toBeVisible();
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
    await expect(card.getByRole("listitem")).toHaveCount(5);
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
    const notes = card.getByRole("region", { name: "Observation notes" });
    await expect(notes).toBeVisible();
    expect(await notes.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(0);
    // Nothing to scroll, so it isn't a Tab stop.
    await expect(notes).not.toHaveAttribute("tabindex");
    // The box ends its 10 px padding below the attribute indicators, so nothing stretched it.
    const below = await notes.evaluate(el =>
      el.getBoundingClientRect().bottom - el.querySelector("ul")!.getBoundingClientRect().bottom);
    expect(below).toBeCloseTo(10, 0);
    await page.getByRole("main").evaluate(el => el.scrollTo(0, el.scrollHeight));
    expect((await rect(network)).bottom).toBeCloseTo(500 - 16, 0);
  });

  test("stop shrinking at 380 px, and the page scrolls instead", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 450 });
    await page.goto("/");
    const { card, network } = panels(page);
    await expect(card.getByRole("listitem")).toHaveCount(5);
    expect((await rect(card)).height).toBeCloseTo(380, 0);
    const networkBox = await rect(network);
    expect(networkBox.height).toBeCloseTo(380, 0);
    // The drawing still fits in the panel at its smallest.
    expect((await rect(network.locator("svg").first())).bottom).toBeLessThanOrEqual(networkBox.bottom);
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
  await page.goto("/?interactive=trace-a-case");
  const diagram = page.getByRole("img", { name: "Network diagram", exact: true });
  await expect(diagram).toHaveAttribute("width", String(diagramWidth));
  return page.evaluate(() => {
    const scrollsSideways = (element: Element) => element.scrollWidth > element.clientWidth;
    return {
      page: scrollsSideways(document.documentElement),
      panel: scrollsSideways(document.querySelector(".trace-a-case__network")!),
      diagram: scrollsSideways(document.querySelector(".network-diagram")!),
    };
  });
}

/** The diagram's scroller: a group named by its panel's heading. */
const diagramGroup = (page: Page) => page.getByRole("group", { name: "The Network" });

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
  await page.goto("/?interactive=trace-a-case");
  const diagram = page.getByRole("img", { name: "Network diagram", exact: true });
  await expect(diagram).toBeVisible();
  for (const padding of [16.2, 16.4, 16.6, 16.8]) {
    await page.locator(".trace-a-case").evaluate((el, px) => { el.style.paddingBottom = `${px}px`; }, padding);
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
  /** The narrowest Interactive with two columns: the card, the gap, the step row and the gutters. */
  const MIN_LAYOUT_WIDTH = 447 + 10 + 421 + 32;
  /** The shortest Interactive the view fits without scrolling down: see the README's Size section. */
  const MIN_LAYOUT_HEIGHT = 524;
  const about = (page: Page) => page.getByRole("button", { name: "About Trace a Case" });
  const box = async (locator: Locator) => (await locator.boundingBox())!;

  async function openAt(page: Page, width: number, height: number) {
    await page.setViewportSize({ width, height });
    await page.goto("/?interactive=trace-a-case");
    await expect(page.getByText("1 / 800", { exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
  }

  test("ends the step row at the minimum layout size, and nothing scrolls", async ({ page }) => {
    await openAt(page, MIN_LAYOUT_WIDTH, MIN_LAYOUT_HEIGHT);
    const aboutBox = await box(about(page));
    const resetBox = await box(page.getByRole("button", { name: "Reset" }));
    const cellBox = await box(page.locator(".trace-a-case__step-row"));
    expect(aboutBox.y).toBeCloseTo(resetBox.y, 0);
    expect(aboutBox.x + aboutBox.width).toBeCloseTo(cellBox.x + cellBox.width, 0);
    // The step row is no taller than the filter row beside it.
    expect(cellBox.height).toBeCloseTo((await box(page.locator(".trace-a-case__filter-row"))).height, 0);
    // Still two columns: the card and the network start on the same line.
    const card = await box(page.getByRole("region", { name: "Conversation", exact: true }));
    const network = await box(page.getByRole("region", { name: "The Network" }));
    expect(network.y).toBeCloseTo(card.y, 0);
    const scrolls = await page.evaluate(() => [document.documentElement, document.querySelector("main")!]
      .some(element => element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight));
    expect(scrolls).toBe(false);
  });

  test("stays beside the steps when a pixel narrower stacks the columns", async ({ page }) => {
    await openAt(page, MIN_LAYOUT_WIDTH - 1, 900);
    const card = await box(page.getByRole("region", { name: "Conversation", exact: true }));
    const network = await box(page.getByRole("region", { name: "The Network" }));
    expect(network.y).toBeGreaterThan(card.y + card.height);
    const aboutBox = await box(about(page));
    const resetBox = await box(page.getByRole("button", { name: "Reset" }));
    expect(aboutBox.y).toBeCloseTo(resetBox.y, 0);
  });

  test("wraps below the steps in a 320 px Interactive without scrolling sideways", async ({ page }) => {
    await openAt(page, 320, 562);
    const aboutBox = await box(about(page));
    const resetBox = await box(page.getByRole("button", { name: "Reset" }));
    const cellBox = await box(page.locator(".trace-a-case__step-row"));
    expect(aboutBox.y).toBeGreaterThanOrEqual(resetBox.y + resetBox.height);
    expect(aboutBox.x + aboutBox.width).toBeLessThanOrEqual(cellBox.x + cellBox.width + 0.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth))
      .toBe(false);
  });

  test("stays when the filter matches nothing", async ({ page }) => {
    await openAt(page, 1024, 562);
    await page.getByRole("textbox", { name: "Filter" }).fill("zzzzqqqq");
    await expect(page.getByText("No conversations match that search.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).toHaveCount(0);
    await expect(about(page)).toBeVisible();
  });
});
