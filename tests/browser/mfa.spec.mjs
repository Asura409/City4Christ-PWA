import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";
async function setup(page) {
  await mocked(page, { signedIn: true });
  let enabled = false,
    remaining = 0,
    used = false;
  await page.route("**/api/v1/auth/mfa**", (route) => {
    const path = new URL(route.request().url()).pathname;
    let data;
    if (path.endsWith("/enroll"))
      data = {
        id: "synthetic-enrollment",
        secret: "JBSWY3DPEHPK3PXP",
        uri: "otpauth://totp/City4Christ:synthetic?secret=JBSWY3DPEHPK3PXP&issuer=City4Christ",
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      };
    else if (path.endsWith("/confirm") || path.endsWith("/regenerate")) {
      enabled = true;
      remaining = 10;
      data = {
        recoveryCodes: Array.from(
          { length: 10 },
          (_, i) => "synthetic-recovery-" + i,
        ),
      };
    } else if (path.endsWith("/disable")) {
      enabled = false;
      remaining = 0;
      data = { status: "disabled" };
    } else if (path.endsWith("/recovery")) {
      if (used)
        return route.fulfill({
          status: 400,
          json: {
            error: {
              code: "invalid_mfa_code",
              message: "Invalid recovery code.",
            },
          },
        });
      used = true;
      remaining--;
      data = {
        enabled,
        pending: false,
        recoveryCodesRemaining: remaining,
        freshUntil: new Date(Date.now() + 300000).toISOString(),
      };
    } else
      data = {
        enabled,
        pending: false,
        recoveryCodesRemaining: remaining,
        freshUntil: null,
      };
    return route.fulfill({ json: { data } });
  });
}
test("authenticator setup, single-view backup codes, recovery and disable", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/profile.html");
  const panel = page.getByRole("region", { name: "Authenticator protection" });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Set up authenticator" }).click();
  await expect(panel).toContainText("JBSWY3DPEHPK3PXP");
  await panel.getByLabel("Setup verification code").fill("123456");
  await panel.getByRole("button", { name: "Enable authenticator" }).click();
  await expect(panel).toContainText("synthetic-recovery-0");
  await expect(panel).not.toContainText("JBSWY3DPEHPK3PXP");
  await expect(panel.getByLabel("Setup verification code")).toHaveValue("");
  await panel.getByRole("button", { name: "Hide private details" }).click();
  await expect(panel).not.toContainText("synthetic-recovery-0");
  await panel
    .getByLabel("Recovery code", { exact: true })
    .fill("synthetic-recovery-0");
  await panel.getByRole("button", { name: "Use recovery code" }).click();
  await expect(panel).toContainText("9 recovery codes remaining");
  await expect(panel.getByLabel("Recovery code", { exact: true })).toHaveValue(
    "",
  );
  await panel
    .getByRole("checkbox", {
      name: "I want to disable authenticator protection",
    })
    .check();
  await panel.getByRole("button", { name: "Disable authenticator" }).click();
  await expect(
    panel.getByRole("button", { name: "Set up authenticator" }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  expect(saved).not.toContain("synthetic-recovery");
  expect(saved).not.toContain("JBSWY3DPEHPK3PXP");
});

test("navigation discards a late private setup response", async ({ page }) => {
  await setup(page);
  let pending;
  const reached = new Promise((resolve) => (pending = resolve));
  let route;
  await page.route("**/api/v1/auth/mfa/enroll", async (r) => {
    route = r;
    pending();
  });
  await page.goto("/profile.html");
  const panel = page.getByRole("region", { name: "Authenticator protection" });
  await panel.getByRole("button", { name: "Set up authenticator" }).click();
  await reached;
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await route.fulfill({
    json: {
      data: {
        id: "late-setup",
        secret: "PRIVATE-LATE-SECRET",
        uri: "otpauth://totp/example",
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      },
    },
  });
  await expect(panel).toBeHidden();
  await expect(
    page.locator('section[aria-label="Authenticator protection"]'),
  ).not.toContainText("PRIVATE-LATE-SECRET");
});
