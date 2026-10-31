import { test, expect } from "@playwright/test";
import { devotionalMock, DEVOTIONAL } from "./fixtures/devotionals.mjs";
test("editor creates a devotional draft, publishes it and withdraws it", async ({
  page,
}) => {
  const { calls } = await devotionalMock(page, { editor: true });
  await page.goto("/#/devotionals");
  const form = page.getByRole("form", { name: "Devotional editor" });
  await form.getByLabel("Title", { exact: true }).fill("Hope today");
  await form.getByLabel("Devotional text").fill("Reflect and pray.");
  await form.getByLabel("Scripture reference").fill("Psalm 28:7");
  await form.getByRole("button", { name: "Create draft", exact: true }).click();
  await expect(form).toContainText("draft");
  const reader = page.getByRole("region", { name: "Published devotionals" });
  await expect(reader).toContainText("No published devotionals");
  await form.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(form).toContainText("published");
  await reader.getByRole("button", { name: "Read Hope today" }).click();
  await expect(reader.getByRole("article")).toContainText("Reflect and pray.");
  expect(calls.find((c) => c.method === "PATCH").body).toMatchObject({
    version: 1,
    status: "published",
  });
  await form
    .getByRole("button", { name: "Save as draft", exact: true })
    .click();
  await expect(reader).toContainText("No published devotionals");
  await expect(reader.getByRole("article")).toHaveCount(0);
});
test("member reads published devotional as plain text without editorial controls", async ({
  page,
}) => {
  const { calls } = await devotionalMock(page, { published: true });
  await page.goto("/#/devotionals");
  const reader = page.getByRole("region", { name: "Published devotionals" });
  await reader.getByRole("button", { name: "Read Hope today" }).click();
  await expect(reader.getByRole("article")).toContainText("<img src=x");
  expect(await page.evaluate(() => window.devotionalXss)).toBeUndefined();
  await expect(reader.locator("img")).toHaveCount(0);
  await expect(
    page.getByRole("form", { name: "Devotional editor" }),
  ).toHaveCount(0);
  expect(calls.some((c) => c.path.includes("/admin/"))).toBe(false);
});
test("editor conflict preserves unsaved text and never retries automatically", async ({
  page,
}) => {
  await devotionalMock(page, { editor: true, published: true });
  let writes = 0;
  await page.route("**/api/v1/admin/devotionals/" + DEVOTIONAL, (route) => {
    if (route.request().method() === "PATCH") {
      writes++;
      return route.fulfill({
        status: 409,
        json: {
          error: {
            code: "version_conflict",
            message: "Reload the latest version before editing.",
          },
        },
      });
    }
    return route.fallback();
  });
  await page.goto("/#/devotionals");
  await page.getByRole("button", { name: "Edit Hope today" }).click();
  const form = page.getByRole("form", { name: "Devotional editor" });
  await form.getByLabel("Devotional text").fill("Unsaved reflection");
  await form.getByRole("button", { name: "Publish changes" }).click();
  await expect(form.getByRole("alert")).toContainText("Reload");
  await expect(form.getByLabel("Devotional text")).toHaveValue(
    "Unsaved reflection",
  );
  expect(writes).toBe(1);
});

test("loading an editorial selection hides the previous editable form", async ({
  page,
}) => {
  await devotionalMock(page, { editor: true, published: true });
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  await page.route(
    "**/api/v1/admin/devotionals/" + DEVOTIONAL,
    async (route) => {
      if (route.request().method() === "GET") {
        await gate;
      }
      return route.fallback();
    },
  );
  await page.goto("/#/devotionals");
  await page.getByRole("button", { name: "Edit Hope today" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Loading draft" }),
  ).toBeVisible();
  try {
    await expect(
      page.getByRole("form", { name: "Devotional editor" }),
    ).toHaveCount(0);
  } finally {
    release();
  }
  await expect(
    page
      .getByRole("form", { name: "Devotional editor" })
      .getByLabel("Title", { exact: true }),
  ).toHaveValue("Hope today");
});

test("starting a new draft clears unsaved text from an unfinished draft", async ({
  page,
}) => {
  await devotionalMock(page, { editor: true });
  await page.goto("/#/devotionals");
  const form = page.getByRole("form", { name: "Devotional editor" });
  await form.getByLabel("Title", { exact: true }).fill("Unsubmitted title");
  await form.getByLabel("Devotional text").fill("Unsubmitted reflection");
  await page
    .getByRole("button", { name: "New devotional", exact: true })
    .click();
  await expect(form.getByLabel("Title", { exact: true })).toHaveValue("");
  await expect(form.getByLabel("Devotional text")).toHaveValue("");
});

test("field validation tells the editor which text to fix", async ({
  page,
}) => {
  await devotionalMock(page, { editor: true });
  await page.route("**/api/v1/admin/devotionals", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 422,
          json: {
            error: {
              code: "validation_failed",
              message: "Check the indicated devotional fields.",
              fields: { body: "Write a reflection before saving." },
            },
          },
        })
      : route.fallback(),
  );
  await page.goto("/#/devotionals");
  const form = page.getByRole("form", { name: "Devotional editor" });
  await form.getByLabel("Title", { exact: true }).fill("Hope");
  await form.getByLabel("Devotional text").fill(" ");
  await form.getByRole("button", { name: "Create draft", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText(
    "Devotional text: Write a reflection before saving.",
  );
});
