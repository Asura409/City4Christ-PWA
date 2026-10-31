import { test, expect } from "@playwright/test";
import { bibleMock } from "./fixtures/bible.mjs";
test("Bible reader looks up a passage, changes version and opens its chapter", async ({
  page,
}) => {
  const { requests } = await bibleMock(page);
  await page.goto("/#/bible");
  const form = page.getByRole("form", { name: "Bible lookup" });
  await form.getByLabel("Bible reference").fill("John 3:16");
  await form.getByLabel("Bible version").selectOption("web");
  await form.getByRole("button", { name: "Look up passage" }).click();
  const result = page.getByRole("region", { name: "Bible passage" });
  await expect(result).toContainText("World English Bible synthetic passage.");
  await form.getByLabel("Bible version").selectOption("asv");
  await expect(result).toHaveCount(0);
  await form.getByRole("button", { name: "Look up passage" }).click();
  await expect(result).toContainText(
    "American Standard Version (1901) synthetic passage.",
  );
  await result.getByRole("button", { name: "Read full chapter" }).click();
  await expect(result.locator("li")).toHaveCount(2);
  expect(requests.at(-1)).toEqual({ reference: "John 3", translation: "asv" });
});
test("Bible lookup failure clears an old result without a fallback version", async ({
  page,
}) => {
  await bibleMock(page);
  await page.goto("/#/bible?reference=John+3%3A16&translation=web");
  const result = page.getByRole("region", { name: "Bible passage" });
  await expect(result).toContainText("World English Bible synthetic passage.");
  await page.route("**/api/v1/bible/passages?**", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: "bible_unavailable",
          message: "Bible lookup is temporarily unavailable.",
        },
      },
    }),
  );
  await page
    .getByRole("form", { name: "Bible lookup" })
    .getByRole("button", { name: "Look up passage" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await expect(result).toHaveCount(0);
});
test("Daily Bread lookup fills a reviewed draft without automatically saving or publishing", async ({
  page,
}) => {
  const { calls } = await bibleMock(page, { daily: true, editor: true });
  await page.goto("/#/devotionals");
  const draft = page.getByRole("form", { name: "Daily verse editor" });
  await draft.getByLabel("Display date (GMT+1)").fill("2026-11-01");
  const lookup = page.getByRole("form", { name: "Bible lookup" });
  await lookup.getByLabel("Bible reference").fill("John 3:16");
  await lookup.getByRole("button", { name: "Look up passage" }).click();
  await page.getByRole("button", { name: "Use passage in editor" }).click();
  await expect(draft.getByLabel("Verse text")).toHaveValue(
    "World English Bible synthetic passage.",
  );
  await expect(
    draft.getByLabel("Scripture reference", { exact: true }),
  ).toHaveValue("John 3:16");
  await expect(draft.getByLabel("Translation / attribution")).toHaveValue(
    "World English Bible",
  );
  await expect(draft.getByLabel("Display date (GMT+1)")).toHaveValue(
    "2026-11-01",
  );
  expect(
    calls.some((c) => c.method === "POST" && c.path.endsWith("/daily-verses")),
  ).toBe(false);
  await draft
    .getByRole("button", { name: "Create draft", exact: true })
    .click();
  await expect(draft.locator("strong")).toHaveText("draft");
  expect(calls.some((c) => c.method === "PATCH")).toBe(false);
});

test("an unavailable Daily Bread version requires an explicit reader choice", async ({
  page,
}) => {
  const { requests } = await bibleMock(page);
  await page.goto("/#/bible?reference=John+3%3A16&translationName=NIV");
  await expect(page.getByRole("region", { name: "Bible", exact: true }).getByRole("status")).toContainText(
    "original version is not available",
  );
  await expect(page.getByRole("region", { name: "Bible passage" })).toHaveCount(
    0,
  );
  expect(requests).toHaveLength(0);
  const form = page.getByRole("form", { name: "Bible lookup" });
  await form.getByLabel("Bible version").selectOption("asv");
  await form.getByRole("button", { name: "Look up passage" }).click();
  await expect(
    page.getByRole("region", { name: "Bible passage" }),
  ).toContainText("American Standard Version");
});
