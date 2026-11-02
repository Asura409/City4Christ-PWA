import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";
const policyVersion = "account-deletion-request-v1";
const notice =
  "Requesting deletion disables your account and signs out every session while staff review it. Permanent deletion has not happened.";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const entry = {
  id,
  accountId: "11111111-1111-4111-8111-111111111111",
  firstName: "Synthetic",
  lastName: "Member",
  status: "requested",
  version: 1,
  policyVersion,
  consent: true,
  createdAt: "2026-11-02T12:00:00Z",
  updatedAt: "2026-11-02T12:00:00Z",
};
const freshUntil = "2099-01-01T00:00:00Z";
async function setup(
  page,
  { admin = false, fresh = true, mfa = false, hasPassword = true } = {},
) {
  await mocked(page, {
    signedIn: true,
    access: admin
      ? {
          roles: [{ role: "super_administrator", scope: "" }],
          capabilities: [{ permission: "accounts.deletion.review", scope: "" }],
        }
      : undefined,
  });
  await page.route("**/api/v1/me/deletion-request", (r) =>
    r.fulfill({
      json: {
        data: { requested: false, request: null, policyVersion, notice },
      },
    }),
  );
  await page.route("**/api/v1/auth/reauthentication", (r) =>
    r.fulfill({
      json: {
        data: {
          fresh,
          freshUntil: fresh ? freshUntil : null,
          passwordAvailable: hasPassword,
          googleAvailable: !hasPassword,
        },
      },
    }),
  );
  await page.route("**/api/v1/auth/mfa", (r) =>
    r.fulfill({
      json: {
        data: {
          enabled: admin || mfa,
          pending: false,
          freshUntil: fresh ? freshUntil : null,
          recoveryCodesRemaining: 10,
        },
      },
    }),
  );
  if (!hasPassword)
    await page.route("**/api/v1/me", (r) =>
      r.request().method() === "DELETE"
        ? r.fallback()
        : r.fulfill({
            json: {
              data: {
                id: entry.accountId,
                firstName: "Google",
                lastName: "Member",
                email: "google@example.invalid",
                emailVerified: true,
                hasPassword: false,
                directoryVisible: false,
              },
            },
          }),
    );
}
test("deletion request requires current policy consent then disables the local session", async ({
  page,
}) => {
  await setup(page);
  const writes = [];
  await page.route("**/api/v1/me", (r) => {
    if (r.request().method() !== "DELETE") return r.fallback();
    writes.push(r.request().postDataJSON());
    expect(r.request().headers().authorization).toBe(
      "Bearer private-browser-token",
    );
    return r.fulfill({ status: 202, json: { data: entry } });
  });
  await page.goto("/#/profile");
  const panel = page.getByRole("region", {
    name: "Request account deletion",
    exact: true,
  });
  await expect(panel).toContainText(notice);
  await expect(
    panel.getByRole("button", {
      name: "Request account deletion",
      exact: true,
    }),
  ).toBeDisabled();
  await panel.getByRole("checkbox").check();
  await panel
    .getByRole("button", { name: "Request account deletion", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole("status")).toContainText(
    "Your account is disabled while it is reviewed",
  );
  await expect(page.getByRole("status")).toContainText(
    "not confirmation of permanent deletion",
  );
  expect(writes).toEqual([{ confirm: true, policyVersion }]);
  await page.evaluate(() => {
    location.hash = "/profile";
  });
  await expect(page).toHaveURL(/#\/login$/);
});
test("password and enrolled MFA confirmation never automatically submit deletion", async ({
  page,
}) => {
  await setup(page, { fresh: false, mfa: true });
  let primary = false,
    factor = false,
    writes = 0;
  await page.route("**/api/v1/auth/reauthentication", (r) =>
    r.fulfill({
      json: {
        data: {
          fresh: primary,
          freshUntil: primary ? freshUntil : null,
          passwordAvailable: true,
          googleAvailable: false,
        },
      },
    }),
  );
  await page.route("**/api/v1/auth/mfa", (r) =>
    r.fulfill({
      json: {
        data: {
          enabled: true,
          pending: false,
          freshUntil: factor ? freshUntil : null,
          recoveryCodesRemaining: 10,
        },
      },
    }),
  );
  await page.route("**/api/v1/auth/reauthentication/password", (r) => {
    expect(r.request().postDataJSON()).toEqual({
      password: "synthetic current password",
    });
    primary = true;
    return r.fulfill({ json: { data: { fresh: true, freshUntil } } });
  });
  await page.route("**/api/v1/auth/mfa/verify", (r) => {
    expect(r.request().postDataJSON()).toEqual({ code: "123456" });
    factor = true;
    return r.fulfill({ json: { data: { enabled: true, freshUntil } } });
  });
  await page.route("**/api/v1/me", (r) => {
    if (r.request().method() !== "DELETE") return r.fallback();
    writes++;
    return r.fulfill({
      status: 409,
      json: {
        error: {
          code: "last_administrator",
          message: "Appoint another Super Admin first.",
        },
      },
    });
  });
  await page.goto("/#/profile");
  const panel = page.getByRole("region", {
    name: "Request account deletion",
    exact: true,
  });
  const confirmation = panel.getByRole("region", {
    name: "Confirm sensitive action",
  });
  await confirmation
    .getByLabel("Current password", { exact: true })
    .fill("synthetic current password");
  await confirmation
    .getByRole("button", { name: "Confirm with password", exact: true })
    .click();
  await confirmation
    .getByLabel("Authenticator code", { exact: true })
    .fill("123456");
  await confirmation
    .getByRole("button", { name: "Confirm authenticator", exact: true })
    .click();
  expect(writes).toBe(0);
  await expect(
    confirmation.getByLabel("Current password", { exact: true }),
  ).toHaveValue("");
  await panel.getByRole("checkbox").check();
  await panel
    .getByRole("button", { name: "Request account deletion", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText(
    "Appoint another Super Admin first",
  );
  expect(writes).toBe(1);
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("synthetic current password");
});
test("Google-only confirmation returns to profile without submitting a request", async ({
  page,
}) => {
  await setup(page, { fresh: false, hasPassword: false });
  let starts = 0,
    writes = 0;
  await page.route("**/api/v1/auth/reauthentication/google", (r) => {
    starts++;
    expect(r.request().postDataJSON().returnTo).toBe(
      "http://127.0.0.1:4173/account/auth.html",
    );
    return r.fulfill({
      json: { data: { url: "https://accounts.google.com/test" } },
    });
  });
  await page.route("https://accounts.google.com/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<h1>Google confirmation</h1>",
    }),
  );
  await page.route("**/api/v1/me", (r) => {
    if (r.request().method() === "DELETE") writes++;
    return r.fallback();
  });
  await page.goto("/#/profile");
  const confirmation = page
    .getByRole("region", { name: "Request account deletion", exact: true })
    .getByRole("region", { name: "Confirm sensitive action" });
  await expect(
    confirmation.getByLabel("Current password", { exact: true }),
  ).toHaveCount(0);
  await confirmation
    .getByRole("button", { name: "Confirm with Google", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Google confirmation" }),
  ).toBeVisible();
  await page.goto("/account/auth.html?reauthentication=complete");
  await expect(page).toHaveURL(/#\/profile$/);
  expect(starts).toBe(1);
  expect(writes).toBe(0);
});
test("deletion policy failures and outages never pretend the account was disabled", async ({
  page,
}) => {
  await setup(page);
  let writes = 0;
  await page.route("**/api/v1/me", (r) => {
    if (r.request().method() !== "DELETE") return r.fallback();
    writes++;
    return r.fulfill({
      status: writes === 1 ? 409 : 503,
      json: {
        error: {
          code: writes === 1 ? "blocked_active_commitments" : "unavailable",
          message:
            writes === 1
              ? "Resolve active pastoral commitments first."
              : "Try again later.",
        },
      },
    });
  });
  await page.goto("/#/profile");
  const panel = page.getByRole("region", {
    name: "Request account deletion",
    exact: true,
  });
  await panel.getByRole("checkbox").check();
  await panel
    .getByRole("button", { name: "Request account deletion", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText(
    "Resolve active pastoral commitments",
  );
  await panel
    .getByRole("button", { name: "Request account deletion", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText("Try again later");
  await expect(page).toHaveURL(/#\/profile$/);
  expect(writes).toBe(2);
});
test("reviewer opens separate sensitive detail and records reviewing with the current version", async ({
  page,
}) => {
  await setup(page, { admin: true });
  let saved;
  await page.route("**/api/v1/admin/account-deletion-requests?**", (r) =>
    r.fulfill({ json: { data: [entry], meta: {} } }),
  );
  await page.route("**/api/v1/admin/account-deletion-requests/" + id, (r) => {
    if (r.request().method() === "PATCH") {
      saved = r.request().postDataJSON();
      return r.fulfill({
        json: { data: { ...entry, version: 2, status: "reviewing" } },
      });
    }
    return r.fulfill({
      json: { data: { ...entry, email: "private-review@example.invalid" } },
    });
  });
  await page.goto("/#/profile");
  await page
    .getByRole("button", { name: "Account deletion requests", exact: true })
    .click();
  await expect(
    page.getByText("private-review@example.invalid", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open Synthetic Member", exact: true })
    .click();
  const detail = page.getByRole("region", { name: "Deletion request details" });
  await expect(detail).toContainText("private-review@example.invalid");
  await detail
    .getByRole("button", { name: "Mark as reviewing", exact: true })
    .click();
  await expect.poll(() => saved).toEqual({ status: "reviewing", version: 1 });
  await expect(
    page.getByText("private-review@example.invalid", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: /approve|permanently delete|reactivate/i,
    }),
  ).toHaveCount(0);
});
test("reviewer restores a mistaken request with a reason and the current version", async ({
  page,
}) => {
  await setup(page, { admin: true });
  let saved;
  await page.route("**/api/v1/admin/account-deletion-requests?**", (r) =>
    r.fulfill({ json: { data: [entry], meta: {} } }),
  );
  await page.route("**/api/v1/admin/account-deletion-requests/" + id, (r) =>
    r.fulfill({
      json: { data: { ...entry, email: "private-review@example.invalid" } },
    }),
  );
  await page.route(
    "**/api/v1/admin/account-deletion-requests/" + id + "/restore",
    (r) => {
      saved = r.request().postDataJSON();
      return r.fulfill({
        json: { data: { ...entry, version: 2, status: "restored" } },
      });
    },
  );
  await page.goto("/#/account-deletion-requests");
  await page
    .getByRole("button", { name: "Open Synthetic Member", exact: true })
    .click();
  const detail = page.getByRole("region", { name: "Deletion request details" });
  await expect(detail).toContainText("does not show the member in the directory");
  await detail
    .getByLabel("Reason for restoring account access", { exact: true })
    .fill("Member confirmed the request was accidental");
  await detail
    .getByRole("button", { name: "Restore account access", exact: true })
    .click();
  await expect.poll(() => saved).toEqual({
    version: 1,
    reason: "Member confirmed the request was accidental",
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Account sign-in restored" }),
  ).toBeVisible();
});
test("reviewer permission loss clears disclosed contact and queue data", async ({
  page,
}) => {
  await setup(page, { admin: true });
  await page.route("**/api/v1/admin/account-deletion-requests?**", (r) =>
    r.fulfill({ json: { data: [entry], meta: {} } }),
  );
  await page.route("**/api/v1/admin/account-deletion-requests/" + id, (r) =>
    r.request().method() === "PATCH"
      ? r.fulfill({
          status: 403,
          json: { error: { code: "forbidden", message: "Not allowed." } },
        })
      : r.fulfill({
          json: { data: { ...entry, email: "private-review@example.invalid" } },
        }),
  );
  await page.goto("/#/account-deletion-requests");
  await page
    .getByRole("button", { name: "Open Synthetic Member", exact: true })
    .click();
  await expect(
    page.getByText("private-review@example.invalid", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark as reviewing", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Not allowed");
  await expect(
    page.getByText("private-review@example.invalid", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open Synthetic Member", exact: true }),
  ).toHaveCount(0);
});
test("expired deletion proof is renewed explicitly and a rate limit is not retried", async ({
  page,
}) => {
  await setup(page);
  let fresh = true,
    writes = 0;
  await page.route("**/api/v1/auth/reauthentication", (r) =>
    r.fulfill({
      json: {
        data: {
          fresh,
          freshUntil: fresh ? freshUntil : null,
          passwordAvailable: true,
          googleAvailable: false,
        },
      },
    }),
  );
  await page.route("**/api/v1/auth/reauthentication/password", (r) => {
    fresh = true;
    return r.fulfill({ json: { data: { fresh, freshUntil } } });
  });
  await page.route("**/api/v1/me", (r) => {
    if (r.request().method() !== "DELETE") return r.fallback();
    writes++;
    fresh = false;
    return r.fulfill({
      status: writes === 1 ? 403 : 429,
      json: {
        error: {
          code: writes === 1 ? "reauthentication_required" : "rate_limited",
          message:
            writes === 1
              ? "Confirm your identity again."
              : "Wait before trying again.",
        },
      },
    });
  });
  await page.goto("/#/profile");
  const panel = page.getByRole("region", {
    name: "Request account deletion",
    exact: true,
  });
  await panel.getByRole("checkbox").check();
  const submit = panel.getByRole("button", {
    name: "Request account deletion",
    exact: true,
  });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(panel.getByRole("alert").first()).toContainText(
    "Confirm your identity again",
  );
  await expect(submit).toBeDisabled();
  const confirm = panel.getByRole("region", {
    name: "Confirm sensitive action",
  });
  await confirm
    .getByLabel("Current password", { exact: true })
    .fill("synthetic current password");
  await confirm
    .getByRole("button", { name: "Confirm with password", exact: true })
    .click();
  await expect(submit).toBeEnabled();
  expect(writes).toBe(1);
  await submit.click();
  await expect(panel.getByRole("alert").first()).toContainText(
    "Wait before trying again",
  );
  expect(writes).toBe(2);
});
test("admin proof renewal requires an explicit queue refresh", async ({
  page,
}) => {
  await setup(page, { admin: true, fresh: false });
  let primary = false,
    factor = false,
    reads = 0;
  await page.route("**/api/v1/auth/reauthentication", (r) =>
    r.fulfill({
      json: {
        data: {
          fresh: primary,
          freshUntil: primary ? freshUntil : null,
          passwordAvailable: true,
          googleAvailable: false,
        },
      },
    }),
  );
  await page.route("**/api/v1/auth/mfa", (r) =>
    r.fulfill({
      json: {
        data: {
          enabled: true,
          freshUntil: factor ? freshUntil : null,
          recoveryCodesRemaining: 10,
        },
      },
    }),
  );
  await page.route("**/api/v1/auth/reauthentication/password", (r) => {
    primary = true;
    return r.fulfill({ json: { data: { fresh: true, freshUntil } } });
  });
  await page.route("**/api/v1/auth/mfa/verify", (r) => {
    factor = true;
    return r.fulfill({ json: { data: { enabled: true, freshUntil } } });
  });
  await page.route("**/api/v1/admin/account-deletion-requests?**", (r) => {
    reads++;
    return r.fulfill(
      primary && factor
        ? { json: { data: [entry], meta: {} } }
        : {
            status: 403,
            json: {
              error: {
                code: "mfa_required",
                message: "Confirm your identity and authenticator.",
              },
            },
          },
    );
  });
  await page.goto("/#/account-deletion-requests");
  await expect(page.getByRole("alert").first()).toContainText(
    "Confirm your identity and authenticator",
  );
  const confirm = page.getByRole("region", {
    name: "Confirm sensitive action",
  });
  await confirm
    .getByLabel("Current password", { exact: true })
    .fill("synthetic current password");
  await confirm
    .getByRole("button", { name: "Confirm with password", exact: true })
    .click();
  await confirm
    .getByLabel("Authenticator code", { exact: true })
    .fill("123456");
  await confirm
    .getByRole("button", { name: "Confirm authenticator", exact: true })
    .click();
  expect(reads).toBe(1);
  await page
    .getByRole("button", { name: "Refresh requests", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Synthetic Member", exact: true }),
  ).toBeVisible();
  expect(reads).toBe(2);
});
test("a delayed profile save cannot restore the session after a deletion request", async ({
  page,
}) => {
  await setup(page);
  let release;
  const delayed = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/me", async (r) => {
    if (r.request().method() === "PATCH") {
      await delayed;
      return r.fulfill({
        json: {
          data: {
            id: entry.accountId,
            firstName: "Late",
            lastName: "Member",
            email: "late@example.invalid",
            hasPassword: true,
            directoryVisible: false,
            emailVerified: true,
          },
        },
      });
    }
    if (r.request().method() === "DELETE")
      return r.fulfill({ status: 202, json: { data: entry } });
    return r.fallback();
  });
  await page.goto("/#/profile");
  await page.getByLabel("First name", { exact: true }).fill("Late");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  const panel = page.getByRole("region", {
    name: "Request account deletion",
    exact: true,
  });
  await panel.getByRole("checkbox").check();
  await panel
    .getByRole("button", { name: "Request account deletion", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/login$/);
  const saved = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/me") && r.request().method() === "PATCH",
  );
  release();
  await saved;
  await page.evaluate(() => {
    location.hash = "/profile";
  });
  await expect(page).toHaveURL(/#\/login$/);
  await expect(
    page.getByRole("heading", { name: "Late Member", exact: true }),
  ).toHaveCount(0);
});
