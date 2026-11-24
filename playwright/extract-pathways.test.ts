import { test } from "./lib/base-url";
import { expect, type Locator, Page } from "@playwright/test";

const LIFTED = "The network, with its 14 hidden neurons lifted out.";
const DECK = "The network's 14 hidden neurons lifted out, and all 800 messages collected.";
const PATHWAYS = "The 14 hidden neurons, with their loadings on three pathways drawn from all 800 messages.";

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
 * The narrowest the canvas is laid out (`minCanvasWidth`): the strips for the deck's columns
 * collected by hand set it, and the finished deck fits its room with a little to spare. It depends
 * on the network's layer sizes.
 */
const NARROWEST_CANVAS = 881;

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
const drawingGroup = (page: Page) => page.getByRole("group", { name: "The Neural Network → Activated Pathways" });

test("an Interactive just wide enough holds the canvas at full size without scrolling", async ({ page }) => {
  const scrolls = await canvasIn(page, NARROWEST_CANVAS + INTERACTIVE_EXTRA, NARROWEST_CANVAS);
  expect(scrolls).toEqual({ page: false, drawing: false });
  await expect(drawingGroup(page)).not.toHaveAttribute("tabindex");
});

/** The shortest Interactive the view fits without scrolling down: see the README's Size section. */
const MIN_LAYOUT_HEIGHT = 562;

/**
 * Opens the view as an Interactive at the minimum layout width and `height` tall, and says whether
 * the page scrolls down.
 */
async function scrollsDownAt(page: Page, height: number) {
  await page.setViewportSize({ width: NARROWEST_CANVAS + INTERACTIVE_EXTRA, height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?interactive=extract-pathways");
  await expect(page.getByRole("img", { name: "The network." })).toHaveAttribute("width", String(NARROWEST_CANVAS));
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight);
}

test("an Interactive at the minimum layout height doesn't scroll down, and a pixel shorter does", async ({ page }) => {
  expect(await scrollsDownAt(page, MIN_LAYOUT_HEIGHT)).toBe(false);
  expect(await scrollsDownAt(page, MIN_LAYOUT_HEIGHT - 1)).toBe(true);
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
  const collect = page.getByRole("button", { name: "Collect a Message" });
  for (let i = 0; i < 3; i++) {
    await collect.click();
  }
  await expect(page.getByRole("img", { name: /and 3 messages collected\.$/ })).toBeVisible();
  await expect(page.getByText("Message 3")).toBeVisible();
});

test("the stage survives switching views", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Collect a Message" }).click();
  await page.getByRole("button", { name: "Collect a Message" }).click();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Looking Inside a Neural Network" }).click();
  await expect(page.getByText("1 / 800")).toBeVisible();
  await nav.getByRole("link", { name: "Extract the Neural Pathways" }).click();
  await expect(page.getByRole("img", { name: /and 2 messages collected\.$/ })).toBeVisible();
});

test("Collect a Message stops after ten", async ({ page }) => {
  await open(page);
  const collect = page.getByRole("button", { name: "Collect a Message" });
  for (let i = 0; i < 10; i++) {
    await collect.click();
  }
  // Playwright counts aria-disabled as disabled.
  await expect(collect).toBeDisabled();
  // aria-disabled, not disabled, so the focus stays on it.
  await expect(collect).toBeFocused();
  await expect(page.getByRole("button", { name: "Collect All Messages" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Extract Pathways", exact: true })).toBeEnabled();
});

test("Reset clears everything", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Collect a Message" }).click();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("img", { name: "The network." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset" })).toHaveAttribute("aria-disabled", "true");
});

test.describe("About", () => {
  /**
   * The steps' and About's widths in 16 px Barlow Condensed, measured on macOS, where text is wider
   * than on CI's Linux, and rounded up. `$step-row-width` in extract-pathways.scss adds them up the
   * same way.
   */
  const STEPS_WIDTH = 596;
  const ABOUT_WIDTH = 86;
  /**
   * The narrowest the step row can be with About beside the centered steps: the steps and, on each
   * side, a column as wide as About plus the 10 px gap.
   */
  const STEP_ROW_WIDTH = STEPS_WIDTH + 2 * (ABOUT_WIDTH + 10);
  const about = (page: Page) => page.getByRole("button", { name: "About Extract the Neural Pathways" });
  const box = async (locator: Locator) => (await locator.boundingBox())!;
  const panel = (page: Page) => page.getByRole("region", { name: "The Neural Network → Activated Pathways" });

  async function openAt(page: Page, width: number) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?interactive=extract-pathways");
    await expect(page.getByRole("img", { name: "The network." })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
  }

  test("ends the step row at the minimum layout width, with the steps centered on the panel", async ({ page }) => {
    await openAt(page, NARROWEST_CANVAS + INTERACTIVE_EXTRA);
    await expect(page.getByRole("img", { name: "The network." })).toHaveAttribute("width", String(NARROWEST_CANVAS));
    const aboutBox = await box(about(page));
    const rowBox = await box(page.locator(".extract-pathways .step-button-group"));
    const panelBox = await box(panel(page));
    expect(aboutBox.y + aboutBox.height / 2).toBeCloseTo(rowBox.y + rowBox.height / 2, 0);
    expect(aboutBox.x + aboutBox.width).toBeCloseTo(panelBox.x + panelBox.width, 0);
    expect(rowBox.x + rowBox.width / 2).toBeCloseTo(panelBox.x + panelBox.width / 2, 0);
  });

  // The breakpoint is a constant in the SCSS, so a label that changes the steps' width moves where
  // About should drop without moving the breakpoint. This catches that. Text is a few px narrower
  // on Linux than on macOS, so each width only has to fit its constant and come within 8 px of it.
  test("the step row's breakpoint is measured from the steps and About as drawn", async ({ page }) => {
    await openAt(page, 1200);
    const rowBox = await box(page.locator(".extract-pathways .step-button-group"));
    const aboutBox = await box(about(page));
    expect(rowBox.width).toBeLessThanOrEqual(STEPS_WIDTH);
    expect(rowBox.width).toBeGreaterThan(STEPS_WIDTH - 8);
    expect(aboutBox.width).toBeLessThanOrEqual(ABOUT_WIDTH);
    expect(aboutBox.width).toBeGreaterThan(ABOUT_WIDTH - 8);
  });

  test("stays beside the steps in an Interactive just wide enough", async ({ page }) => {
    await openAt(page, STEP_ROW_WIDTH + 32);
    const aboutBox = await box(about(page));
    const rowBox = await box(page.locator(".extract-pathways .step-button-group"));
    expect(aboutBox.y + aboutBox.height / 2).toBeCloseTo(rowBox.y + rowBox.height / 2, 0);
  });

  test("drops below the steps, at the right, a pixel narrower, without scrolling sideways", async ({ page }) => {
    await openAt(page, STEP_ROW_WIDTH + 31);
    const aboutBox = await box(about(page));
    const rowBox = await box(page.locator(".extract-pathways .step-button-group"));
    const panelBox = await box(panel(page));
    expect(aboutBox.y).toBeGreaterThanOrEqual(rowBox.y + rowBox.height);
    expect(aboutBox.x + aboutBox.width).toBeCloseTo(panelBox.x + panelBox.width, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth))
      .toBe(false);
  });

  test("comes after the steps in the tab order", async ({ page }) => {
    await openAt(page, 1024);
    await page.getByRole("button", { name: "Reset" }).focus();
    await page.keyboard.press("Tab");
    await expect(about(page)).toBeFocused();
  });
});

test("Animate and the speed survive switching views", async ({ page }) => {
  await open(page, "no-preference");
  const panel = page.getByRole("region", { name: "The Neural Network → Activated Pathways" });
  const animate = panel.getByRole("checkbox", { name: "Animate" });
  const speed = panel.getByRole("slider", { name: "Animation speed" });
  await speed.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(speed).toHaveAttribute("aria-valuetext", "Slow");
  await animate.uncheck();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Looking Inside a Neural Network" }).click();
  await expect(page.getByText("1 / 800")).toBeVisible();
  await nav.getByRole("link", { name: "Extract the Neural Pathways" }).click();
  await expect(animate).not.toBeChecked();
  await expect(speed).toHaveAttribute("aria-valuetext", "Slow");
  await page.getByRole("button", { name: "Setup" }).click();
  // Animated, Setup takes a few seconds.
  await expect(page.getByRole("img", { name: LIFTED })).toBeVisible({ timeout: 1_000 });
});

test("in a narrow window, Animate and the speed wrap below the panel's title", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await open(page);
  // Measured once the web font has loaded: the fallback font is wider, so the controls would
  // overrun the head.
  await page.evaluate(() => document.fonts.ready);
  const head = await page.locator(".extract-pathways__network-head").boundingBox();
  const controls = await page.locator(".animation-controls").boundingBox();
  const title = await page.getByRole("heading", { name: "The Neural Network → Activated Pathways" }).boundingBox();
  expect(controls!.x + controls!.width).toBeLessThanOrEqual(head!.x + head!.width);
  expect(controls!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
});

test("Collect All builds the deck of all 800", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Collect All Messages" }).click();
  await expect(page.getByRole("img", { name: DECK })).toBeVisible();
  await expect(page.getByText("800 Messages")).toBeVisible();
});

test("from five collected, Collect All ends on the deck", async ({ page }) => {
  await open(page);
  const collect = page.getByRole("button", { name: "Collect a Message" });
  for (let i = 0; i < 5; i++) {
    await collect.click();
  }
  await page.getByRole("button", { name: "Collect All Messages" }).click();
  await expect(page.getByRole("img", { name: DECK })).toBeVisible();
});

test("the deck survives switching views", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Collect All Messages" }).click();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Looking Inside a Neural Network" }).click();
  await expect(page.getByText("1 / 800")).toBeVisible();
  await nav.getByRole("link", { name: "Extract the Neural Pathways" }).click();
  await expect(page.getByRole("img", { name: DECK })).toBeVisible();
});

test("after the deck, Collect a Message starts the collecting over", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Collect All Messages" }).click();
  await page.getByRole("button", { name: "Collect a Message" }).click();
  await expect(page.getByRole("img", { name: /and 1 message collected\.$/ })).toBeVisible();
  await expect(page.getByText("Message 1")).toBeVisible();
});

test("at the narrowest canvas, the finished deck fits its room", async ({ page }) => {
  await canvasIn(page, NARROWEST_CANVAS + INTERACTIVE_EXTRA, NARROWEST_CANVAS);
  await page.getByRole("button", { name: "Collect All Messages" }).click();
  const canvas = (await page.getByRole("img", { name: DECK }).boundingBox())!;
  const deck = (await page.getByTestId("deck").boundingBox())!;
  const lifted = (await page.getByTestId("lifted-copies").boundingBox())!;
  expect(deck.x).toBeGreaterThanOrEqual(canvas.x);
  expect(deck.x + deck.width).toBeLessThanOrEqual(lifted.x);
});

test("Extract Pathways from the start jumps to the deck and draws the three pathways", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Extract Pathways", exact: true }).click();
  await expect(page.getByRole("img", { name: PATHWAYS })).toBeVisible();
  await expect(page.getByTestId("deck")).toBeVisible();
  await expect(page.getByText("800 Messages", { exact: true })).toBeVisible();
  for (const n of [1, 2, 3]) {
    await expect(page.getByText(`Pathway ${n}`)).toBeVisible();
  }
  await expect(page.getByTestId("pathway-line")).toHaveCount(42);
});

test("the pathways survive switching views", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Extract Pathways", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Views" });
  await nav.getByRole("link", { name: "Looking Inside a Neural Network" }).click();
  await expect(page.getByText("1 / 800")).toBeVisible();
  await nav.getByRole("link", { name: "Extract the Neural Pathways" }).click();
  await expect(page.getByRole("img", { name: PATHWAYS })).toBeVisible();
});

test("at the narrowest canvas, the pathway labels fit inside it", async ({ page }) => {
  await canvasIn(page, NARROWEST_CANVAS + INTERACTIVE_EXTRA, NARROWEST_CANVAS);
  await page.getByRole("button", { name: "Extract Pathways", exact: true }).click();
  const canvas = (await page.getByRole("img", { name: PATHWAYS }).boundingBox())!;
  const label = (await page.getByText("Pathway 3").boundingBox())!;
  expect(label.x + label.width).toBeLessThanOrEqual(canvas.x + canvas.width);
});

test("Extract Pathways flies its particles on the particle canvas, and removes it once they land", async ({ page }) => {
  await open(page, "no-preference");
  const animate = page.getByRole("checkbox", { name: "Animate" });
  // Build the deck at once, then animate the extraction.
  await animate.uncheck();
  await page.getByRole("button", { name: "Collect All Messages" }).click();
  await animate.check();
  await page.getByRole("button", { name: "Extract Pathways", exact: true }).click();
  await expect(page.getByTestId("particles")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId("particles")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByRole("img", { name: PATHWAYS })).toBeVisible({ timeout: 15_000 });
});

/** Opens the view and draws the pathways at once, with reduced motion. */
async function openPathways(page: Page) {
  await open(page);
  await page.getByRole("button", { name: "Extract Pathways", exact: true }).click();
  await expect(page.getByRole("img", { name: PATHWAYS })).toBeVisible();
}

const neuronTarget = (page: Page, name: string) =>
  page.getByRole("button", { name: `${name}, show its loadings on the three pathways` });
const pathwayTarget = (page: Page, n: number) =>
  page.getByRole("button", { name: `Pathway ${n}, show its loadings on the 14 neurons` });

/** Whether a target's focus ring shows. */
const focusRingShows = (target: Locator) =>
  target.locator(".pick-targets__focus").evaluate(ring => getComputedStyle(ring).visibility === "visible");

test("picks a box and a neuron by mouse", async ({ page }) => {
  await openPathways(page);
  const box = pathwayTarget(page, 2);
  await box.click();
  await expect(box).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("pathway-line")).toHaveCount(14);
  // A click leaves no focus ring.
  await expect(box).toBeFocused();
  expect(await focusRingShows(box)).toBe(false);
  await box.click();
  await expect(box).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("pathway-line")).toHaveCount(42);

  const neuron = neuronTarget(page, "Hidden Layer 1 Neuron 3");
  await neuron.click();
  await expect(neuron).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("pathway-line")).toHaveCount(3);
  await expect(page.getByTestId("pick-ring")).toBeVisible();
});

test("shows the focus ring once a key is pressed after a click", async ({ page }) => {
  await openPathways(page);
  // A key on the clicked button itself.
  const neuron = neuronTarget(page, "Hidden Layer 1 Neuron 3");
  await neuron.click();
  await expect(neuron).toBeFocused();
  expect(await focusRingShows(neuron)).toBe(false);
  await page.keyboard.press("Enter");
  await expect(neuron).toHaveAttribute("aria-pressed", "false");
  expect(await focusRingShows(neuron)).toBe(true);

  // A key that moves the focus on from the clicked button.
  const clicked = neuronTarget(page, "Hidden Layer 1 Neuron 5");
  await clicked.click();
  expect(await focusRingShows(clicked)).toBe(false);
  await page.keyboard.press("ArrowDown");
  const next = neuronTarget(page, "Hidden Layer 1 Neuron 6");
  await expect(next).toBeFocused();
  expect(await focusRingShows(next)).toBe(true);
});

test("picks by keyboard", async ({ page }) => {
  await openPathways(page);
  await page.getByRole("slider", { name: "Animation speed" }).focus();
  await page.keyboard.press("Tab");
  await expect(neuronTarget(page, "Hidden Layer 1 Neuron 1")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  const second = neuronTarget(page, "Hidden Layer 1 Neuron 2");
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute("aria-pressed", "true");
  // Picked and focused, it shows both rings.
  await expect(page.getByTestId("pick-ring")).toBeVisible();
  expect(await focusRingShows(second)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(second).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("Tab");
  const box = pathwayTarget(page, 1);
  await expect(box).toBeFocused();
  expect(await focusRingShows(box)).toBe(true);
  await page.keyboard.press(" ");
  await expect(box).toHaveAttribute("aria-pressed", "true");
});

test("draws the pick and focus in system colors in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await openPathways(page);
  /** What the browser resolves a system color to, read from a probe styled with it. */
  const systemColor = (color: string) => page.evaluate(name => {
    const probe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    probe.style.stroke = name;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).stroke;
    probe.remove();
    return resolved;
  }, color);
  const stroke = (locator: Locator) => locator.evaluate(element => getComputedStyle(element).stroke);

  await pathwayTarget(page, 2).click();
  expect(await stroke(page.locator(".extract-drawing__box--picked"))).toBe(await systemColor("CanvasText"));

  await page.getByRole("slider", { name: "Animation speed" }).focus();
  await page.keyboard.press("Tab");
  const neuron = neuronTarget(page, "Hidden Layer 1 Neuron 1");
  await expect(neuron).toBeFocused();
  expect(await focusRingShows(neuron)).toBe(true);
  expect(await stroke(neuron.locator(".pick-targets__focus"))).toBe(await systemColor("Highlight"));
  // So the check above can fail: Highlight isn't the focus color drawn without forced colors.
  expect(await systemColor("Highlight")).not.toBe("rgb(58, 114, 190)");
});

// As on a school network that blocks Google Fonts, where Lato and Barlow Condensed fall back to
// wider fonts.
test.describe("with Google Fonts blocked", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  });

  /**
   * Opens the view at `width`, as an Interactive if `interactive`, draws the pathways, and returns
   * the boxes of the head's parts.
   */
  async function headAt(page: Page, width: number, interactive = false) {
    await page.setViewportSize({ width, height: 900 });
    if (interactive) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/?interactive=extract-pathways");
      await expect(page.getByRole("img", { name: "The network." })).toBeVisible();
    } else {
      await open(page);
    }
    await page.getByRole("button", { name: "Extract Pathways", exact: true }).click();
    await expect(page.getByRole("img", { name: PATHWAYS })).toBeVisible();
    // Done, so the loading legend is at its full width: shown, and no longer held to a width.
    await expect(page.getByText("Loading", { exact: true })).toBeVisible();
    await expect(page.locator(".extract-pathways__loading-legend")).not.toHaveAttribute("style", /width/);
    const head = (await page.locator(".extract-pathways__network-head").boundingBox())!;
    const title = (await page.getByRole("heading", { name: "The Neural Network → Activated Pathways" }).boundingBox())!;
    const tools = (await page.locator(".extract-pathways__network-tools").boundingBox())!;
    const parts = {
      title,
      activation: (await page.locator(".activation-legend").boundingBox())!,
      loading: (await page.locator(".loading-legend").boundingBox())!,
      controls: (await page.locator(".animation-controls").boundingBox())!,
    };
    return { head, title, tools, parts };
  }

  function expectInside(head: { x: number; width: number }, parts: Record<string, { x: number; width: number }>) {
    for (const [name, box] of Object.entries(parts)) {
      expect(box.x + box.width, name).toBeLessThanOrEqual(head.x + head.width);
    }
  }

  test("nothing in the head runs past it at 480 px", async ({ page }) => {
    const { head, parts } = await headAt(page, 480);
    expectInside(head, parts);
  });

  test("nothing in the head runs past it at the minimum layout width", async ({ page }) => {
    const { head, parts } = await headAt(page, NARROWEST_CANVAS + INTERACTIVE_EXTRA, true);
    expectInside(head, parts);
  });

  test("the tools drop below the title when they don't fit beside it", async ({ page }) => {
    const { title, tools } = await headAt(page, 480);
    expect(tools.y).toBeGreaterThanOrEqual(title.y + title.height);
  });

  test("keeps the tip inside the canvas and clear of the boxes in the fallback font", async ({ page }) => {
    await headAt(page, NARROWEST_CANVAS + INTERACTIVE_EXTRA, true);
    const canvas = page.getByRole("img", { name: PATHWAYS });
    await expect(canvas).toHaveAttribute("width", String(NARROWEST_CANVAS));
    const canvasBox = (await canvas.boundingBox())!;
    const tip = (await page.getByTestId("pick-tip").boundingBox())!;
    const firstBox = (await page.locator(".extract-drawing__box").first().boundingBox())!;
    expect(tip.x + tip.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width);
    expect(tip.y + tip.height).toBeLessThan(firstBox.y);
  });
});

test("at the minimum layout width the head is one line, with both legends", async ({ page }) => {
  await canvasIn(page, NARROWEST_CANVAS + INTERACTIVE_EXTRA, NARROWEST_CANVAS);
  await page.evaluate(() => document.fonts.ready);
  const headBox = () => page.locator(".extract-pathways__network-head").boundingBox();
  const before = (await headBox())!;
  await page.getByRole("button", { name: "Extract Pathways", exact: true }).click();
  await expect(page.getByRole("img", { name: PATHWAYS })).toBeVisible();
  await expect(page.getByText("Loading", { exact: true })).toBeVisible();
  await expect(page.locator(".extract-pathways__loading-legend")).not.toHaveAttribute("style", /width/);
  expect((await headBox())!.height).toBe(before.height);
  const title = (await page.getByRole("heading", { name: "The Neural Network → Activated Pathways" }).boundingBox())!;
  const tools = (await page.locator(".extract-pathways__network-tools").boundingBox())!;
  // The tools are taller than the title and centered on it, so they start above it, not below it.
  expect(tools.y).toBeLessThan(title.y + title.height);
});

test("picks in a canvas that scrolls sideways", async ({ page }) => {
  await canvasIn(page, 600, NARROWEST_CANVAS);
  await page.getByRole("button", { name: "Extract Pathways", exact: true }).click();
  await expect(page.getByRole("img", { name: PATHWAYS })).toBeVisible();
  await drawingGroup(page).evaluate(group => {
    group.scrollLeft = group.scrollWidth;
  });
  const box = pathwayTarget(page, 3);
  await box.click();
  await expect(box).toHaveAttribute("aria-pressed", "true");
});

test("doesn't keep the pick on switching views, but keeps the pathways, with the loading legend already full width",
  async ({ page }) => {
    await openPathways(page);
    const box = pathwayTarget(page, 2);
    await box.click();
    await expect(box).toHaveAttribute("aria-pressed", "true");
    const nav = page.getByRole("navigation", { name: "Views" });
    await nav.getByRole("link", { name: "Looking Inside a Neural Network" }).click();
    await expect(page.getByText("1 / 800")).toBeVisible();
    await nav.getByRole("link", { name: "Extract the Neural Pathways" }).click();
    await expect(page.getByRole("img", { name: PATHWAYS })).toBeVisible();
    await expect(page.getByRole("button", { pressed: true })).toHaveCount(0);
    const legend = page.locator(".extract-pathways__loading-legend");
    await expect(legend).not.toHaveAttribute("style", /width/);
    await expect(legend).toHaveCSS("opacity", "1");
  });
