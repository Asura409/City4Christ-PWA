import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";
const POLICY = {
  enabled: true,
  retentionDays: 90,
  policyVersion: "visitor-welcome-v2",
  consentText:
    "I agree that City4Christ may store these details for up to 90 days and contact me about my visit. My contact details may be shared with a volunteer assigned by the church to follow up about my visit. This is not consent to marketing or a mailing list.",
};
test("visitor consents, retries safely and gets no account linkage", async ({
  page,
}) => {
  await mocked(page);
  await page.route("**/api/v1/visitors/config", (r) =>
    r.fulfill({ json: { data: POLICY } }),
  );
  const bodies = [];
  await page.route("**/api/v1/visitors", (r) => {
    bodies.push(r.request().postDataJSON());
    return r.fulfill(
      bodies.length === 1
        ? {
            status: 503,
            json: {
              error: {
                code: "visitor_unavailable",
                message: "Please try again.",
              },
            },
          }
        : {
            status: 202,
            json: { data: { message: "Your welcome form has been received." } },
          },
    );
  });
  await page.goto("/#/welcome");
  const form = page.getByRole("form", { name: "Visitor welcome form" });
  await form.getByLabel("Full name", { exact: true }).fill("Synthetic Visitor");
  await form
    .getByLabel("Email address", { exact: true })
    .fill("visitor@example.invalid");
  await form.getByLabel("Consent to visitor follow-up").check();
  await form
    .getByRole("button", { name: "Send welcome form", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Please try again.");
  await form
    .getByRole("button", { name: "Send welcome form", exact: true })
    .click();
  await expect(
    page.getByText("Your welcome form has been received.", { exact: true }),
  ).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[0].submissionId).toBe(bodies[1].submissionId);
  expect(bodies[0].policyVersion).toBe(POLICY.policyVersion);
  await expect(page.getByText(/create an account automatically/i)).toHaveCount(
    0,
  );
});
test("staff opens audited contact detail and records follow-up status", async ({
  page,
}) => {
  await mocked(page, {
    signedIn: true,
    access: {
      roles: [{ role: "staff", scope: "" }],
      capabilities: [{ permission: "visitors.follow_up", scope: "" }],
    },
  });
  const entry = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    fullName: "Synthetic Visitor",
    status: "new",
    version: 1,
    createdAt: "2026-11-01T12:00:00Z",
    expiresAt: "2027-01-30T12:00:00Z",
  };
  let saved;
  await page.route("**/api/v1/admin/visitors?**", (r) =>
    r.fulfill({ json: { data: saved ? [] : [entry], meta: {} } }),
  );
  await page.route("**/api/v1/admin/visitors/" + entry.id, (r) => {
    if (r.request().method() === "PATCH") {
      saved = r.request().postDataJSON();
      return r.fulfill({
        json: { data: { ...entry, status: saved.status, version: 2 } },
      });
    }
    return r.fulfill({
      json: {
        data: {
          ...entry,
          email: "private@example.invalid",
          phone: "+441234567890",
          contactVerified: false,
          policyVersion: POLICY.policyVersion,
          consentText: POLICY.consentText,
        },
      },
    });
  });
  await page.goto("/#/visitors");
  await expect(
    page.getByText("private@example.invalid", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open Synthetic Visitor", exact: true })
    .click();
  await expect(
    page.getByText("private@example.invalid", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Follow-up status").selectOption("contacted");
  await page
    .getByRole("button", { name: "Save follow-up status", exact: true })
    .click();
  await expect.poll(() => saved).toEqual({ status: "contacted", version: 1 });
  await expect(
    page.getByText("private@example.invalid", { exact: true }),
  ).toHaveCount(0);
});
test("disabled welcome intake does not show a submit form", async ({
  page,
}) => {
  await mocked(page);
  await page.route("**/api/v1/visitors/config", (r) =>
    r.fulfill({ json: { data: { ...POLICY, enabled: false } } }),
  );
  await page.goto("/#/welcome");
  await expect(
    page.getByText("Visitor welcome forms are not available yet.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Visitor welcome form" }),
  ).toHaveCount(0);
});

test("revoked staff access clears contact details instead of keeping them on screen", async ({
  page,
}) => {
  await mocked(page, { signedIn: true });
  const entry = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    fullName: "Private Visitor",
    status: "new",
    version: 1,
    createdAt: "2026-11-01T12:00:00Z",
    expiresAt: "2027-01-30T12:00:00Z",
  };
  await page.route("**/api/v1/admin/visitors?**", (r) =>
    r.fulfill({ json: { data: [entry], meta: {} } }),
  );
  await page.route("**/api/v1/admin/visitors/" + entry.id, (r) =>
    r.fulfill(
      r.request().method() === "PATCH"
        ? {
            status: 403,
            json: {
              error: {
                code: "forbidden",
                message: "Visitor access was revoked.",
              },
            },
          }
        : {
            json: {
              data: {
                ...entry,
                email: "private@example.invalid",
                phone: "",
                contactVerified: false,
              },
            },
          },
    ),
  );
  await page.goto("/#/visitors");
  await page
    .getByRole("button", { name: "Open Private Visitor", exact: true })
    .click();
  await expect(
    page.getByText("private@example.invalid", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save follow-up status", exact: true })
    .click();
  await expect(
    page.getByText("private@example.invalid", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText(
    "Visitor access was revoked.",
  );
});
