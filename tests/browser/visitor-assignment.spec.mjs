import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

const VISITOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VOLUNTEER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ACCESS = {
  roles: [{ role: "staff", scope: "" }],
  capabilities: [
    { permission: "visitors.follow_up", scope: "" },
    { permission: "members.records.read", scope: "" },
  ],
};

test("staff can assign a visitor task to one verified member", async ({ page }) => {
  await mocked(page, { signedIn: true, access: ACCESS });
  const visitor = { id: VISITOR, fullName: "Synthetic Visitor", status: "new", version: 1, createdAt: "2026-11-01T12:00:00Z", expiresAt: "2027-01-30T12:00:00Z", assignedTo: "" };
  const calls = [];
  await page.route("**/api/v1/admin/visitors?**", (route) => route.fulfill({ json: { data: [{ ...visitor, ...(calls.length ? { version: 2, assignedTo: VOLUNTEER } : {}) }], meta: {} } }));
  await page.route(`**/api/v1/admin/visitors/${VISITOR}`, (route) => route.fulfill({ json: { data: { ...visitor, email: "private@example.invalid", phone: "", contactVerified: false, policyVersion: "visitor-welcome-v2", consentText: "The volunteer may contact me about my visit." } } }));
  await page.route("**/api/v1/admin/members**", (route) => route.fulfill({ json: { data: [{ id: VOLUNTEER, firstName: "Joy", lastName: "Volunteer", email: "joy@example.invalid", joinedAt: "2026-01-01T00:00:00Z" }], meta: {} } }));
  await page.route(`**/api/v1/admin/visitors/${VISITOR}/assignment`, async (route) => {
    calls.push(route.request().postDataJSON());
    return route.fulfill({ json: { data: { ...visitor, version: 2, assignedTo: VOLUNTEER } } });
  });

  await page.goto("/#/visitors");
  await page.getByRole("button", { name: "Open Synthetic Visitor" }).click();
  const panel = page.getByRole("region", { name: "Assign visitor follow-up" });
  await expect(panel).toBeVisible();
  await panel.getByLabel("Find a verified member by name or email").fill("joy@example.invalid");
  await panel.getByRole("button", { name: "Find volunteer" }).click();
  await panel.getByLabel("Select a volunteer").selectOption(VOLUNTEER);
  await panel.getByLabel("Assignment reason").fill("Welcome Team follow-up");
  await panel.getByRole("button", { name: "Assign follow-up" }).click();
  await expect.poll(() => calls).toEqual([{ accountId: VOLUNTEER, reason: "Welcome Team follow-up", version: 1 }]);
  await expect(page.getByText(/Assigned to a volunteer/)).toBeVisible();
});
