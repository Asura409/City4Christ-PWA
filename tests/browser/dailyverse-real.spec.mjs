import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
if (
  process.env.E2E_BASE_URL &&
  new URL(process.env.E2E_BASE_URL).hostname !== "127.0.0.1"
)
  throw new Error("Daily verse fixtures require the disposable loopback API.");
test.skip(
  !process.env.E2E_BASE_URL,
  "Run through the Go frontend_e2e harness.",
);
test.setTimeout(90000);
test("daily verse real API publishes a church-dated verse to Home and withdraws it", async ({
  page,
  context,
  browser,
}, info) => {
  const scenario = randomUUID(),
    headers = { "X-C4C-Test-Scenario": "dailyverse/" + scenario };
  await context.setExtraHTTPHeaders(headers);
  const readerContext = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL,
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
    const today = await context.request.get("/api/v1/daily-verse");
    expect(today.status()).toBe(200);
    const date = (await today.json()).data.date;
    await page.goto("/#/devotionals");
    const form = page.getByRole("form", { name: "Daily verse editor" });
    const lookup = page.getByRole("form", { name: "Bible lookup" });
    await lookup.getByLabel("Bible reference").fill("John 3:16");
    await lookup.getByRole("button", { name: "Look up passage" }).click();
    await page.getByRole("button", { name: "Use passage in editor" }).click();
    await expect(form.getByLabel("Verse text")).toHaveValue(
      "Synthetic Bible passage for local browser testing.",
    );
    await expect(
      form.getByLabel("Scripture reference", { exact: true }),
    ).toHaveValue("John 3:16");

    await form.getByLabel("Display date (GMT+1)").fill(date);
    const text = "Synthetic real-API verse " + scenario;
    await form.getByLabel("Verse text").fill(text);
    await form
      .getByLabel("Scripture reference", { exact: true })
      .fill("Test " + scenario.slice(0, 8));
    await form
      .getByRole("button", { name: "Create draft", exact: true })
      .click();
    await expect(form.locator("strong")).toHaveText("draft");
    const reader = await readerContext.newPage();
    await reader.goto("/#/home");
    const card = reader.getByRole("region", { name: "Daily bread" });
    await expect(card).toContainText("No verse has been published for today.");
    await form
      .getByRole("button", { name: "Publish verse", exact: true })
      .click();
    await expect(form.locator("strong")).toHaveText("published");
    await card.getByRole("button", { name: "Refresh daily verse" }).click();
    await expect(card).toContainText(text);
    await expect(card).toContainText("GMT+1");
    await form
      .getByRole("button", { name: "Save as draft", exact: true })
      .click();
    await expect(form.locator("strong")).toHaveText("draft");
    await card.getByRole("button", { name: "Refresh daily verse" }).click();
    await expect(card).toContainText("No verse has been published for today.");
    await expect(card).not.toContainText(text);
  } finally {
    const withdraw = page
      .getByRole("form", { name: "Daily verse editor" })
      .getByRole("button", { name: "Save as draft", exact: true });
    if (await withdraw.isVisible().catch(() => false)) {
      await withdraw.click().catch(() => {});
      await expect(
        page
          .getByRole("form", { name: "Daily verse editor" })
          .locator("strong"),
      )
        .toHaveText("draft")
        .catch(() => {});
    }
    await readerContext.close();
  }
});
