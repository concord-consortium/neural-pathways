import { test } from "./lib/base-url";
import { expect } from "@playwright/test";

test("renders the visualization", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("P1")).toBeVisible();
  await expect(page.getByText("Sentiment:")).toBeVisible();
});
