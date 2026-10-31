import { test, expect } from "@playwright/test";
import { dailyVerseMock, VERSE } from "./fixtures/dailyverse.mjs";
test("Home displays the API daily verse and its church timezone", async ({
  page,
}) => {
  await dailyVerseMock(page);
  await page.goto("/#/home");
  const card = page.getByRole("region", { name: "Daily bread" });
  await expect(card).toContainText("Synthetic daily verse.");
  await expect(card).toContainText("Test 1:1");
  await expect(card).toContainText("GMT+1");
});
test("Home shows an honest empty state and never the old hardcoded verse", async ({
  page,
}) => {
  await dailyVerseMock(page, { available: false });
  await page.goto("/#/home");
  const card = page.getByRole("region", { name: "Daily bread" });
  await expect(card).toContainText("No verse has been published for today.");
  await expect(card).not.toContainText(
    "The Lord is my strength and my shield.",
  );
});
test("Home clears yesterday at church midnight using server time, not the device clock", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
  await dailyVerseMock(page, { rollover: true });
  await page.goto("/#/home");
  const card = page.getByRole("region", { name: "Daily bread" });
  await expect(card).toContainText("Synthetic daily verse.");
  await page.clock.runFor(1100);
  await expect(card).toContainText("No verse has been published for today.");
  await expect(card).not.toContainText("Synthetic daily verse.");
});
test("editor creates, publishes and withdraws a dated verse", async ({
  page,
}) => {
  const { calls } = await dailyVerseMock(page, {
    editor: true,
    available: false,
  });
  await page.goto("/#/devotionals");
  const form = page.getByRole("form", { name: "Daily verse editor" });
  await form.getByLabel("Display date (GMT+1)").fill("2026-10-31");
  await form.getByLabel("Verse text").fill("Synthetic edited verse.");
  await form
    .getByLabel("Scripture reference", { exact: true })
    .fill("Test 2:1");
  await form.getByRole("button", { name: "Create draft", exact: true }).click();
  await expect(form.locator("strong")).toHaveText("draft");
  await form
    .getByRole("button", { name: "Publish verse", exact: true })
    .click();
  await expect(form.locator("strong")).toHaveText("published");
  expect(
    calls.find((c) => c.path.includes("/daily-verses/") && c.method === "PATCH")
      .body,
  ).toMatchObject({
    version: 1,
    status: "published",
    displayDate: "2026-10-31",
  });
  await page.goto("/#/home");
  await expect(page.getByRole("region", { name: "Daily bread" })).toContainText(
    "Synthetic edited verse.",
  );
  await page.goto("/#/devotionals");
  await page
    .getByRole("button", { name: "Edit verse for 2026-10-31: Test 2:1" })
    .click();
  await page
    .getByRole("form", { name: "Daily verse editor" })
    .getByRole("button", { name: "Save as draft", exact: true })
    .click();
  await page.goto("/#/home");
  await expect(page.getByRole("region", { name: "Daily bread" })).toContainText(
    "No verse has been published for today.",
  );
});
test("same-date conflicts preserve the draft and do not retry publication", async ({
  page,
}) => {
  await dailyVerseMock(page, { editor: true, available: false });
  let writes = 0;
  await page.route("**/api/v1/admin/daily-verses/" + VERSE, (route) => {
    if (route.request().method() === "PATCH") {
      writes++;
      return route.fulfill({
        status: 409,
        json: {
          error: {
            code: "verse_date_conflict",
            message:
              "A verse is already published for that date. Choose another date.",
          },
        },
      });
    }
    return route.fallback();
  });
  await page.goto("/#/devotionals");
  const form = page.getByRole("form", { name: "Daily verse editor" });
  await form.getByLabel("Display date (GMT+1)").fill("2026-10-31");
  await form.getByLabel("Verse text").fill("Candidate verse.");
  await form
    .getByLabel("Scripture reference", { exact: true })
    .fill("Test 1:1");
  await form.getByRole("button", { name: "Create draft", exact: true }).click();
  await form
    .getByRole("button", { name: "Publish verse", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText("already published");
  await expect(form.locator("strong")).toHaveText("draft");
  await expect(form.getByLabel("Verse text")).toHaveValue("Candidate verse.");
  expect(writes).toBe(1);
});

test("a failed refresh clears the previously loaded verse instead of showing stale content", async ({
  page,
}) => {
  await dailyVerseMock(page);
  await page.goto("/#/home");
  const card = page.getByRole("region", { name: "Daily bread" });
  await expect(card).toContainText("Synthetic daily verse.");
  await page.route("**/api/v1/daily-verse", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: "unavailable",
          message: "Daily verse is temporarily unavailable.",
        },
      },
    }),
  );
  await card.getByRole("button", { name: "Refresh daily verse" }).click();
  await expect(card.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await expect(card).not.toContainText("Synthetic daily verse.");
});
test("daily verse text is escaped rather than interpreted as HTML", async ({
  page,
}) => {
  await dailyVerseMock(page);
  await page.route("**/api/v1/daily-verse", (route) =>
    route.fulfill({
      json: {
        data: {
          date: "2026-10-31",
          timeZone: "UTC+01:00",
          serverTime: "2026-10-31T10:00:00Z",
          nextDayAt: "2026-10-31T23:00:00Z",
          verse: {
            id: VERSE,
            displayDate: "2026-10-31",
            text: '<img src=x onerror="window.verseXss=true">',
            scriptureReference: "Test 1:1",
            translation: "",
          },
        },
      },
    }),
  );
  await page.goto("/#/home");
  const card = page.getByRole("region", { name: "Daily bread" });
  await expect(card).toContainText("<img src=x");
  await expect(card.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => window.verseXss)).toBeUndefined();
});
