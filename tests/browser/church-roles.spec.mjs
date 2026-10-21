import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";
const target = {
  id: "22222222-2222-4222-8222-222222222222",
  firstName: "Joy",
  lastName: "Candidate",
  email: "joy@example.invalid",
  mfaEnabled: true,
};
for (const role of ["super_administrator", "staff"])
  test(`${role} sees only permitted church appointments`, async ({ page }) => {
    await mocked(page, {
      signedIn: true,
      access: {
        roles: [{ role, scope: "" }],
        capabilities: [
          { permission: "roles.read", scope: "" },
          { permission: "roles.operational.manage", scope: "" },
          ...(role === "super_administrator"
            ? [{ permission: "roles.privileged.manage", scope: "" }]
            : []),
        ],
      },
    });
    let writes = 0;
    await page.route("**/api/v1/admin/role-candidates?**", (route) =>
      route.fulfill({ json: { data: [target], meta: { nextCursor: "" } } }),
    );
    await page.route("**/api/v1/admin/accounts/*/church-roles", (route) => {
      if (route.request().method() === "POST") {
        writes++;
        return route.fulfill({
          status: 403,
          json: {
            error: {
              code: "mfa_required",
              message: "Verify your authenticator.",
            },
          },
        });
      }
      return route.fulfill({ json: { data: [] } });
    });
    await page.goto("/staff.html");
    const form = page.getByRole("form", {
      name: "Church role appointment",
      exact: true,
    });
    await expect(form).toBeVisible();
    const options = await form.locator("select option").allTextContents();
    expect(options.includes("Super Admin")).toBe(
      role === "super_administrator",
    );
    await page
      .getByRole("form", { name: "Find member for appointment" })
      .getByRole("textbox")
      .fill("Joy");
    await page
      .getByRole("button", { name: "Search members", exact: true })
      .click();
    await page.getByRole("button", { name: /Joy Candidate/ }).click();
    await expect(page.locator("#church-selected-member")).toContainText("Joy");
    if (role === "staff")
      await form
        .getByRole("textbox", { name: "Registered ministry ID" })
        .fill("33333333-3333-4333-8333-333333333333");
    await form
      .getByRole("textbox", { name: "Reason" })
      .fill("Approved church appointment");
    await form.getByRole("checkbox").check();
    await form
      .getByRole("button", { name: "Grant church role", exact: true })
      .click();
    await expect(page.locator("#page-status")).toContainText(
      "then review and submit",
    );
    expect(writes).toBe(1);
    await page
      .getByRole("form", { name: "Find member for appointment" })
      .getByRole("textbox")
      .fill("Other");
    await expect(page.locator("#church-selected-member")).toHaveText(
      "No member selected.",
    );
  });
test("ordinary members never see church-role search or controls", async ({
  page,
}) => {
  const { calls } = await mocked(page, { signedIn: true });
  await page.goto("/staff.html");
  await expect(
    page.getByRole("form", { name: "Church role appointment", exact: true }),
  ).toBeHidden();
  expect(calls.some((c) => c.path.includes("role-candidates"))).toBe(false);
});
test("permission refresh and field changes cannot reuse confirmation for another appointment", async ({
  page,
}) => {
  const access = {
    roles: [{ role: "super_administrator", scope: "" }],
    capabilities: [
      "roles.read",
      "roles.operational.manage",
      "roles.privileged.manage",
    ].map((permission) => ({ permission, scope: "" })),
  };
  const fixture = await mocked(page, { signedIn: true, access });
  await page.route("**/api/v1/admin/role-candidates?**", (route) =>
    route.fulfill({ json: { data: [target], meta: { nextCursor: "" } } }),
  );
  await page.route("**/api/v1/admin/accounts/*/church-roles", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.goto("/staff.html");
  const search = page.getByRole("form", {
    name: "Find member for appointment",
  });
  await search.getByRole("textbox").fill("Joy");
  await search.getByRole("button", { name: "Search members" }).click();
  await page.getByRole("button", { name: /Joy Candidate/ }).click();
  const form = page.getByRole("form", {
    name: "Church role appointment",
    exact: true,
  });
  await form.getByRole("combobox").selectOption("staff");
  await form
    .getByRole("textbox", { name: "Reason" })
    .fill("Reviewed staff appointment");
  await form.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Refresh permissions", exact: true })
    .click();
  await expect(form.getByRole("combobox")).toHaveValue("staff");
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  await search.getByRole("textbox").fill("Joy");
  await search.getByRole("button", { name: "Search members" }).click();
  await page.getByRole("button", { name: /Joy Candidate/ }).click();
  await form.getByRole("checkbox").check();
  await form.getByRole("combobox").selectOption("ministry_leader");
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  await form.getByRole("checkbox").check();
  await form
    .getByRole("textbox", { name: "Registered ministry ID" })
    .fill("33333333-3333-4333-8333-333333333333");
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  fixture.setAccess({
    roles: [{ role: "staff", scope: "" }],
    capabilities: [
      { permission: "roles.read", scope: "" },
      { permission: "roles.operational.manage", scope: "" },
    ],
  });
  await page
    .getByRole("button", { name: "Refresh permissions", exact: true })
    .click();
  await expect(page.locator("#church-selected-member")).toHaveText(
    "No member selected.",
  );
  await expect(form.getByRole("checkbox")).not.toBeChecked();
});
