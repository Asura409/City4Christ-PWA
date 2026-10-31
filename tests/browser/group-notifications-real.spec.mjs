import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
if (
  process.env.E2E_BASE_URL &&
  new URL(process.env.E2E_BASE_URL).hostname !== "127.0.0.1"
)
  throw new Error("Disposable loopback API required");
test.skip(!process.env.E2E_BASE_URL, "Run through Go frontend_e2e");
test.setTimeout(90000);
test("group and notification real API: private post, event and confirmed broadcast", async ({
  page,
  context,
  browser,
}, info) => {
  const scenario = randomUUID(),
    headers = { "X-C4C-Test-Scenario": "group-notifications/" + scenario };
  await context.setExtraHTTPHeaders(headers);
  const member = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: headers,
    viewport: page.viewportSize(),
    isMobile: info.project.name === "mobile",
    hasTouch: info.project.name === "mobile",
  });
  try {
    const leaderResponse = await context.request.post(
      "/__test/group-session?" +
        new URLSearchParams({ scenario, role: "leader" }),
    );
    expect(leaderResponse.status()).toBe(200);
    const { groupId } = (await leaderResponse.json()).data;
    expect(
      (
        await member.request.post(
          "/__test/group-session?" +
            new URLSearchParams({ scenario, role: "member" }),
        )
      ).status(),
    ).toBe(200);
    const memberPage = await member.newPage();
    await memberPage.goto(`/#/groups/${groupId}/posts`);
    await memberPage
      .getByLabel("Group post text")
      .fill("Synthetic group-only update");
    await memberPage
      .getByRole("button", { name: "Share with group", exact: true })
      .click();
    await expect(
      memberPage.getByText("Synthetic group-only update", { exact: true }),
    ).toBeVisible();
    await page.goto(`/#/groups/${groupId}/events`);
    const form = page.getByRole("form", { name: "Create event" });
    await form.getByLabel("Title", { exact: true }).fill("Synthetic rehearsal");
    await form.getByLabel(/Start time in/).fill("2030-01-01T12:00");
    await form
      .getByRole("button", { name: "Create draft", exact: true })
      .click();
    await expect(
      page.getByText("Synthetic rehearsal", { exact: true }),
    ).toBeVisible();
    await page.goto("/#/notifications");
    const draft = page.getByRole("form", { name: "Broadcast draft" });
    await draft.getByLabel("Announcement title").fill("Group reminder");
    await draft
      .getByLabel("Announcement message")
      .fill("Synthetic rehearsal reminder");
    await draft
      .getByRole("button", { name: "Create broadcast draft", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Review draft", exact: true })
      .click();
    await expect(
      page.getByText("Recipients: 2", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("I confirm this audience and message").check();
    await page
      .getByRole("button", { name: "Send broadcast", exact: true })
      .click();
    await expect(
      page.getByText("Broadcast sent to 2 inboxes.", { exact: true }),
    ).toBeVisible();
    await memberPage.goto("/#/notifications");
    await expect(
      memberPage.getByRole("heading", { name: "Group reminder", exact: true }),
    ).toBeVisible();
    await memberPage
      .getByRole("button", { name: "Mark all read", exact: true })
      .click();
    await expect(
      memberPage.getByRole("button", { name: "Mark read", exact: true }),
    ).toHaveCount(0);
  } finally {
    await member.close();
  }
});
