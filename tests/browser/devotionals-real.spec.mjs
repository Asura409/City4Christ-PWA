import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
if (
  process.env.E2E_BASE_URL &&
  new URL(process.env.E2E_BASE_URL).hostname !== "127.0.0.1"
)
  throw new Error("Devotional fixtures require the disposable loopback API.");
test.skip(
  !process.env.E2E_BASE_URL,
  "Run through the Go frontend_e2e harness.",
);
test.setTimeout(90000);
test("devotional real API keeps drafts private, publishes and withdraws across reader sessions", async ({
  page,
  context,
  browser,
}, info) => {
  const scenario = randomUUID(),
    base = process.env.E2E_BASE_URL,
    headers = { "X-C4C-Test-Scenario": "devotional/" + scenario };
  await context.setExtraHTTPHeaders(headers);
  const readerContext = await browser.newContext({
    baseURL: base,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: headers,
    viewport: page.viewportSize(),
    isMobile: info.project.name === "mobile",
    hasTouch: info.project.name === "mobile",
  });
  try {
    for (const [ctx, role] of [
      [context, "editor"],
      [readerContext, "member"],
    ])
      expect(
        (
          await ctx.request.post(
            "/__test/devotional-session?" +
              new URLSearchParams({ scenario, role }),
          )
        ).status(),
      ).toBe(200);
    const reader = await readerContext.newPage(),
      title = "Hope " + scenario.slice(0, 8);
    await page.goto("/#/devotionals");
    await reader.goto("/#/devotionals");
    const form = page.getByRole("form", { name: "Devotional editor" });
    await form.getByLabel("Title", { exact: true }).fill(title);
    await form
      .getByLabel("Devotional text")
      .fill("A reflection from the real API.");
    const created = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/v1/admin/devotionals") &&
        r.request().method() === "POST",
    );
    await form
      .getByRole("button", { name: "Create draft", exact: true })
      .click();
    const response = await created;
    expect(response.status()).toBe(201);
    const id = (await response.json()).data.id;
    expect(
      (await readerContext.request.get("/api/v1/devotionals/" + id)).status(),
    ).toBe(404);
    await reader.getByRole("button", { name: "Reload devotionals" }).click();
    await expect(
      reader.getByRole("button", { name: "Read " + title }),
    ).toHaveCount(0);
    await expect(
      reader.getByRole("form", { name: "Devotional editor" }),
    ).toHaveCount(0);
    await form.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(form).toContainText("published");
    await reader.getByRole("button", { name: "Reload devotionals" }).click();
    await reader.getByRole("button", { name: "Read " + title }).click();
    await expect(reader.getByRole("article")).toContainText(
      "A reflection from the real API.",
    );
    await form
      .getByRole("button", { name: "Save as draft", exact: true })
      .click();
    await expect(form).toContainText("draft");
    await reader.getByRole("button", { name: "Reload devotionals" }).click();
    await expect(reader.getByRole("article")).toHaveCount(0);
    await expect(
      reader.getByRole("button", { name: "Read " + title }),
    ).toHaveCount(0);
    expect(
      (await readerContext.request.get("/api/v1/devotionals/" + id)).status(),
    ).toBe(404);
  } finally {
    await readerContext.close();
  }
});
