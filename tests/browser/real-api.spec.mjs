import { test, expect } from "@playwright/test";

if (
  process.env.E2E_BASE_URL &&
  new URL(process.env.E2E_BASE_URL).hostname !== "127.0.0.1"
) {
  throw new Error(
    "Use only the disposable loopback test server for real API browser tests.",
  );
}
test.skip(
  !process.env.E2E_BASE_URL,
  "Run through the backend frontend_e2e harness.",
);
// Real Argon2id runs on the shared test host; simulated UI tests keep short waits.
test.setTimeout(90000);

test("real registration, OTP, secure refresh, profile, directory, publication and logout", async ({
  page,
  context,
}, info) => {
  const email = `browser-${info.project.name}@example.invalid`;
  const password = "a long synthetic browser password";
  await page.goto("/auth.html");
  await page.getByRole("tab", { name: "Create account" }).click();
  const register = page.getByRole("form", { name: "Create account" });
  await register.getByLabel("First name", { exact: true }).fill("Grace");
  await register
    .getByLabel("Last name", { exact: true })
    .fill(info.project.name);
  await register.getByLabel("Email", { exact: true }).fill(email);
  await register
    .getByLabel("Password (at least 15 characters)", { exact: true })
    .fill(password);
  await register.getByLabel("Confirm password", { exact: true }).fill(password);
  await register
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Check your email", {
    timeout: 30000,
  });
  const inbox = await context.request.get(
    "/__test/inbox?" + new URLSearchParams({ email }),
  );
  expect(inbox.ok()).toBeTruthy();
  const { code } = await inbox.json();
  const verify = page.getByRole("form", { name: "Verify email" });
  await verify.getByLabel("Verification code").fill(code);
  await verify
    .getByRole("button", { name: "Verify email", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Email verified");
  const login = page.getByRole("form", { name: "Sign in", exact: true });
  await login.getByLabel("Password", { exact: true }).fill(password);
  await login.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Grace" }),
  ).toBeVisible({ timeout: 45000 });
  const cookies = await context.cookies();
  const refresh = cookies.find((c) => c.name.includes("refresh"));
  expect(refresh).toBeTruthy();
  expect(refresh.secure).toBe(true);
  expect(refresh.httpOnly).toBe(true);
  await page.goto("/profile.html");
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Grace",
  );
  expect(
    (await context.cookies()).find((c) => c.name === refresh.name).value,
  ).not.toBe(refresh.value);
  await page.getByLabel("First name", { exact: true }).fill("Hope");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page.goto("/members.html");
  await expect(
    page.getByRole("heading", { name: `Hope ${info.project.name}` }),
  ).toBeVisible();
  expect(await page.locator("#member-results").textContent()).not.toContain(
    email,
  );
  const accessHeaders = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/v1/me/access")
      accessHeaders.push(request.headers().authorization);
  });
  await page.goto("/profile.html");
  await page
    .getByRole("button", { name: "Refresh permissions", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Staff tools", exact: true }),
  ).toBeHidden();
  const tokenBeforeAppointment = accessHeaders.at(-1);
  const fixture = await context.request.post(
    "/__test/editor?" + new URLSearchParams({ email }),
  );
  expect(fixture.status()).toBe(204);
  await page
    .getByRole("button", { name: "Refresh permissions", exact: true })
    .click();
  await expect(page.locator("#access-roles")).toContainText("Content editor");
  expect(accessHeaders.at(-1)).toBe(tokenBeforeAppointment);
  await page.getByRole("link", { name: "Staff tools", exact: true }).click();
  const editor = page.getByRole("form", { name: "Sermon editor" });
  const title = `Browser sermon ${info.project.name}`;
  await editor.getByLabel("Title", { exact: true }).fill(title);
  await editor.getByLabel("Speaker", { exact: true }).fill("Test Speaker");
  await editor
    .getByLabel("Preached at (your local time)")
    .fill("2026-10-17T12:00");
  await editor
    .getByRole("button", { name: "Create draft", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Draft created");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("published");
  const revoked = await context.request.post(
    "/__test/editor/revoke?" + new URLSearchParams({ email }),
  );
  expect(revoked.status()).toBe(204);
  await page
    .getByRole("button", { name: "Refresh permissions", exact: true })
    .click();
  await expect(editor).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Staff tools", exact: true }),
  ).toBeHidden();
  const denied = await context.request.post("/api/v1/admin/sermons", {
    headers: {
      Origin: process.env.E2E_BASE_URL,
      Authorization: accessHeaders.at(-1),
    },
    data: {
      title: "Must not be saved",
      speaker: "Test",
      preachedAt: "2026-10-17T12:00:00Z",
    },
  });
  expect(denied.status()).toBe(403);
  await page.goto("/word.html");
  await page
    .getByRole("searchbox", { name: "Search sermons", exact: true })
    .fill(title);
  await page
    .getByRole("button", { name: "Search sermons", exact: true })
    .click();
  await expect(page.locator("#sermon-results h2")).toHaveText(title);
  await page.getByRole("link", { name: "Open sermon" }).click();
  await expect(page.locator("#sermon-detail h2")).toHaveText(title);
  await page.goto("/profile.html");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("form", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === refresh.name)).toBe(
    false,
  );
  await page.goto("/members.html");
  await expect(page.getByRole("alert")).toContainText("sign in");
});

test("real email password recovery, single-use link and new-password login", async ({
  page,
  context,
}, info) => {
  const email = `recovery-${info.project.name}@example.invalid`;
  const password = "original synthetic browser password";
  const origin = process.env.E2E_BASE_URL;
  const post = (path, data) =>
    context.request.post(`/api/v1/auth/${path}`, {
      data,
      headers: { Origin: origin },
    });
  expect(
    (
      await post("register", {
        email,
        password,
        firstName: "Recovery",
        lastName: "Tester",
      })
    ).status(),
  ).toBe(201);
  const verification = await context.request.get(
    "/__test/inbox?" + new URLSearchParams({ email }),
  );
  const { code } = await verification.json();
  expect((await post("verification/verify", { email, code })).status()).toBe(
    200,
  );
  expect((await post("login", { email, password })).status()).toBe(200);
  await page.goto("/auth.html");
  // Recovery must remain available even when an existing cookie signs us in.
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  const forgot = page.getByRole("form", {
    name: "Request password reset",
    exact: true,
  });
  await forgot.getByLabel("Email", { exact: true }).fill(email);
  await forgot
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("If this email");
  const inbox = await context.request.get(
    "/__test/recovery-inbox?" + new URLSearchParams({ email }),
  );
  expect(inbox.ok()).toBeTruthy();
  const { resetURL } = await inbox.json();
  await page.goto(resetURL);
  await expect(page).not.toHaveURL(/reset_token/);
  const reset = page.getByRole("form", { name: "Reset password", exact: true });
  await expect(reset).toBeVisible();
  await reset
    .getByLabel("New password (at least 15 characters)", { exact: true })
    .fill("replacement synthetic password");
  await reset
    .getByLabel("Confirm new password", { exact: true })
    .fill("different synthetic password");
  await reset
    .getByRole("button", { name: "Save new password", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("do not match");
  await reset
    .getByLabel("Confirm new password", { exact: true })
    .fill("replacement synthetic password");
  await reset
    .getByRole("button", { name: "Save new password", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Password updated", {
    timeout: 45000,
  });
  const login = page.getByRole("form", { name: "Sign in", exact: true });
  await login.getByLabel("Email", { exact: true }).fill(email);
  await login.getByLabel("Password", { exact: true }).fill(password);
  await login.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect", {
    timeout: 45000,
  });
  await login
    .getByLabel("Password", { exact: true })
    .fill("replacement synthetic password");
  await login.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Recovery" }),
  ).toBeVisible({ timeout: 45000 });
  await page.goto(resetURL);
  await reset
    .getByLabel("New password (at least 15 characters)", { exact: true })
    .fill("another synthetic password");
  await reset
    .getByLabel("Confirm new password", { exact: true })
    .fill("another synthetic password");
  await reset
    .getByRole("button", { name: "Save new password", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("invalid or expired", {
    timeout: 45000,
  });
});


test("React real signup, OTP, cookie restoration, profile update and logout", async ({
  page,
  context,
}, info) => {
  const email = `react-${info.project.name}@example.invalid`,
    password = "a long synthetic React password";
  await page.goto("/#/signup");
  await page.getByLabel("First name", { exact: true }).fill("React");
  await page.getByLabel("Last name", { exact: true }).fill("Tester");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Verify email", exact: true }),
  ).toBeVisible({ timeout: 45000 });
  const inbox = await context.request.get(
    "/__test/inbox?" + new URLSearchParams({ email }),
  );
  expect(inbox.ok()).toBeTruthy();
  await page.getByLabel("Verification code").fill((await inbox.json()).code);
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, React" }),
  ).toBeVisible({ timeout: 45000 });
  const original = (await context.cookies()).find((c) =>
    c.name.includes("refresh"),
  );
  expect(original.secure && original.httpOnly).toBeTruthy();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome, React" }),
  ).toBeVisible();
  expect(
    (await context.cookies()).find((c) => c.name === original.name).value,
  ).not.toBe(original.value);
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("Connected");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "saved" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Account security and Google linking" })
    .click();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Connected",
  );
  await page.goto("/#/profile");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === original.name)).toBe(
    false,
  );
  await page.goto("/#/profile");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});
