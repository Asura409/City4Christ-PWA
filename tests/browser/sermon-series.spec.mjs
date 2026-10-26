import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

test("members can browse and filter published sermon series", async ({ page }) => {
  const { calls } = await mocked(page);
  await page.route("**/api/v1/sermons/series", (route) => route.fulfill({
    contentType: "application/json",
    json: { data: [
      { name: "Foundations", sermonCount: 4, latestPublishedAt: "2026-10-25T12:00:00Z" },
      { name: "Prayer", sermonCount: 2, latestPublishedAt: "2026-10-20T12:00:00Z" },
    ] },
  }));

  await page.goto("/#/word");
  const series = page.getByRole("combobox", { name: "Sermon series" });
  await expect(series.locator("option")).toHaveCount(3);
  await series.selectOption("Foundations");
  await page.getByRole("button", { name: "Search sermons" }).click();
  await expect.poll(() => calls.filter((call) => call.path === "/api/v1/sermons").at(-1)?.query.get("series"))
    .toBe("Foundations");
});
