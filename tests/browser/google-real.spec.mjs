import { test, expect } from "@playwright/test";
if (
  process.env.E2E_BASE_URL &&
  new URL(process.env.E2E_BASE_URL).hostname !== "127.0.0.1"
)
  throw new Error("Use only the disposable loopback API.");
test.skip(
  !process.env.E2E_BASE_URL,
  "Run through the Go frontend_e2e harness.",
);
test.setTimeout(90000);
test.beforeEach(async ({ context }, info) =>
  context.setExtraHTTPHeaders({
    "X-C4C-Test-Scenario":
      "google-react/" + info.project.name + "/" + info.testId,
  }),
);
async function syntheticConsent(page, subject) {
  const origin = new URL(process.env.E2E_BASE_URL).origin;
  // Playwright routes do not intercept redirect-chain destinations. Preserve
  // the real start response/cookie, assert its redirect, then use a test-only
  // consent link to make the synthetic provider an interceptable navigation.
  await page.route(origin + "/api/v1/auth/google/start?**", async (route) => {
    const response = await route.fetch({maxRedirects: 0});
    expect(response.status()).toBe(302);
    const destination = response.headers().location;
    expect(new URL(destination).origin).toBe("https://accounts.google.com");
    await route.fulfill({response, status: 200, headers: {...response.headers(), "content-type": "text/html"}, body: `<a href="${destination.replaceAll("&", "&amp;")}">Open synthetic Google provider</a>`});
  });
  await page.route("https://accounts.google.com/**", async (route) => {
    const state = new URL(route.request().url()).searchParams.get("state");
    const callback =
      origin +
      "/api/v1/auth/google/callback?" +
      new URLSearchParams({ state, code: subject });
    await route.fulfill({
      contentType: "text/html",
      body: `<a href="${callback.replaceAll("&", "&amp;")}">Complete synthetic Google consent</a>`,
    });
  });
}
test("React Google signup and login complete through real API cookies", async ({
  page,
}, info) => {
  const subject = "e2e-google-react-signup-" + info.project.name;
  await syntheticConsent(page, subject);
  await page.goto("/#/login");
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await page.getByRole("link", {name: "Open synthetic Google provider"}).click();
  await page
    .getByRole("link", { name: "Complete synthetic Google consent" })
    .click();
  await expect(page).toHaveURL(/\/#\/home$/);
  await page.goto("/#/profile");
  await expect(
    page.getByText(subject + "@example.invalid", { exact: true }),
  ).toBeVisible();
  const store = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  expect(store).not.toMatch(/accessToken|refreshToken/);
});
test("React Google existing email requires explicit linking through real API", async ({
  page,
  context,
}, info) => {
  const subject = "e2e-google-react-link-" + info.project.name,
    email = subject + "@example.invalid",
    password = "Synthetic linking password 123";
  const created = await context.request.post("/api/v1/auth/register", {
    headers: { Origin: process.env.E2E_BASE_URL },
    data: { firstName: "Link", lastName: "Tester", email, password },
  });
  expect(created.status()).toBe(201);
  const inbox = await context.request.get(
    "/__test/inbox?" + new URLSearchParams({ email }),
  );
  const { code } = await inbox.json();
  const verified = await context.request.post(
    "/api/v1/auth/verification/verify",
    { headers: { Origin: process.env.E2E_BASE_URL }, data: { email, code } },
  );
  expect(verified.status()).toBe(200);
  await syntheticConsent(page, subject);
  await page.goto("/#/login");
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await page.getByRole("link", {name: "Open synthetic Google provider"}).click();
  await page
    .getByRole("link", { name: "Complete synthetic Google consent" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Sign in with your password",
  );
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/#\/home$/, {timeout: 60000});
  await page.goto("/#/profile");
  await page.getByRole("button", { name: "Link Google", exact: true }).click();
  await page
    .getByRole("link", { name: "Complete synthetic Google consent" })
    .click();
  await expect(page).toHaveURL(/\/#\/profile$/);
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/#\/login$/);
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await page.getByRole("link", {name: "Open synthetic Google provider"}).click();
  await page
    .getByRole("link", { name: "Complete synthetic Google consent" })
    .click();
  await expect(page).toHaveURL(/\/#\/home$/);
});
