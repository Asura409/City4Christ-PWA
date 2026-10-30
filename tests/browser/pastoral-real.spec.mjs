import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
if (
  process.env.E2E_BASE_URL &&
  new URL(process.env.E2E_BASE_URL).hostname !== "127.0.0.1"
)
  throw new Error(
    "Pastoral browser fixtures require the disposable loopback API.",
  );
test.skip(
  !process.env.E2E_BASE_URL,
  "Run through the Go frontend_e2e harness.",
);
test.setTimeout(90000);
test("pastoral approval holds a real slot and keeps member and pastor actions separate", async ({
  page,
  context,
  browser,
}, info) => {
  const scenario = randomUUID(),
    base = process.env.E2E_BASE_URL;
  const extra = { "X-C4C-Test-Scenario": "pastoral/" + scenario };
  await context.setExtraHTTPHeaders(extra);
  const pastorContext = await browser.newContext({
    baseURL: base,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: extra,
    viewport: page.viewportSize(),
    isMobile: info.project.name === "mobile",
    hasTouch: info.project.name === "mobile",
    timezoneId: "UTC",
  });
  let pastorName;
  try {
    for (const [ctx, role] of [
      [context, "member"],
      [pastorContext, "pastor"],
    ]) {
      const response = await ctx.request.post(
        "/__test/pastoral-session?" + new URLSearchParams({ scenario, role }),
      );
      expect(response.status()).toBe(200);
      pastorName = (await response.json()).data.pastorName;
    }
    const provider = await pastorContext.newPage();
    await provider.goto("/#/pastors");
    const form = provider.getByRole("form", { name: "Publish availability" });
    const starts = new Date(Date.now() + 86400000);
    starts.setUTCSeconds(0, 0);
    const ends = new Date(starts.getTime() + 1800000);
    await form
      .getByLabel("Starts at (your local time)")
      .fill(starts.toISOString().slice(0, 16));
    await form
      .getByLabel("Ends at (your local time)")
      .fill(ends.toISOString().slice(0, 16));
    await form.getByRole("button", { name: "Publish slot" }).click();
    await expect(
      provider
        .getByRole("status")
        .filter({ hasText: "Availability published" }),
    ).toBeVisible();
    await page.goto("/#/pastors");
    await page
      .getByRole("button", { name: "View availability for " + pastorName })
      .click();
    await page.getByRole("button", { name: "Request appointment" }).click();
    const mine = page.getByRole("region", { name: "My appointments" });
    await expect(mine).toContainText("pending");
    await expect(
      page.getByRole("region", { name: "Available appointments" }),
    ).toContainText("No available slots");
    await provider.getByRole("button", { name: "Reload appointments" }).click();
    const assigned = provider.getByRole("region", {
      name: "Assigned appointments",
    });
    await expect(assigned).toContainText("Care Member");
    await assigned.getByRole("button", { name: "Approve" }).click();
    await expect(assigned).toContainText("approved");
    await page.getByRole("button", { name: "Reload appointments" }).click();
    await expect(mine).toContainText("approved");
    await mine.getByRole("button", { name: "Cancel appointment" }).click();
    await expect(mine).toContainText("cancelled");
    await provider.getByRole("button", { name: "Reload appointments" }).click();
    await expect(assigned).toContainText("cancelled");
  } finally {
    await pastorContext.close();
  }
});
