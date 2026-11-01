import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
if (
  process.env.E2E_BASE_URL &&
  new URL(process.env.E2E_BASE_URL).hostname !== "127.0.0.1"
)
  throw new Error("Disposable loopback API required");
test.skip(!process.env.E2E_BASE_URL, "Run through Go frontend_e2e");
test.setTimeout(90000);
test("visitor real API: consented form reaches only the staff queue and supports withdrawal", async ({
  page,
  browser,
}, info) => {
  const staff = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL,
    ignoreHTTPSErrors: true,
    viewport: page.viewportSize(),
    isMobile: info.project.name === "mobile",
    hasTouch: info.project.name === "mobile",
  });
  try {
    expect(
      (
        await staff.request.post(
          "/__test/visitor-staff-session?" +
            new URLSearchParams({ scenario: randomUUID() }),
        )
      ).status(),
    ).toBe(200);
    const email = randomUUID() + "@example.invalid";
    await page.goto("/#/welcome");
    const form = page.getByRole("form", { name: "Visitor welcome form" });
    await form
      .getByLabel("Full name", { exact: true })
      .fill("Synthetic New Visitor");
    await form.getByLabel("Email address", { exact: true }).fill(email);
    await form.getByLabel("Consent to visitor follow-up").check();
    await form
      .getByRole("button", { name: "Send welcome form", exact: true })
      .click();
    await expect(
      page.getByText("Your welcome form has been received.", { exact: true }),
    ).toBeVisible();
    const staffPage = await staff.newPage();
    await staffPage.goto("/#/visitors");
    await staffPage
      .getByRole("button", { name: "Open Synthetic New Visitor", exact: true })
      .last()
      .click();
    await expect(staffPage.getByText(email, { exact: true })).toBeVisible();
    await staffPage.getByLabel("Follow-up status").selectOption("contacted");
    await staffPage
      .getByRole("button", { name: "Save follow-up status", exact: true })
      .click();
    await expect(staffPage.getByText(email, { exact: true })).toHaveCount(0);
    await staffPage.getByLabel("Show visitors").selectOption("contacted");
    await staffPage
      .getByRole("button", { name: "Open Synthetic New Visitor", exact: true })
      .last()
      .click();
    await staffPage
      .getByLabel(
        "I have confirmed a request to stop follow-up and remove contact details.",
      )
      .check();
    await staffPage
      .getByRole("button", { name: "Remove contact details", exact: true })
      .click();
    await expect(staffPage.getByText(email, { exact: true })).toHaveCount(0);
    await page.goto("/#/visitors");
    await expect(
      page.getByRole("heading", { name: "Welcome back", exact: true }),
    ).toBeVisible();
  } finally {
    await staff.close();
  }
});
