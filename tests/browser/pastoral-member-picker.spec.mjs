import { test, expect } from "@playwright/test";
import { pastoralMock } from "./fixtures/pastoral.mjs";

test("pastoral profile member table lists, paginates, filters and saves the selected account", async ({ page }) => {
  await pastoralMock(page);
  await page.route("**/api/v1/me/access", (route) => route.fulfill({ json: { data: {
    roles: [], capabilities: [{ permission: "roles.privileged.manage", scope: "" }],
  } } }));
  const queries = [];
  await page.route("**/api/v1/members?**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    queries.push(Object.fromEntries(params));
    const second = params.get("cursor") === "second-page";
    const filtered = Boolean(params.get("query"));
    return route.fulfill({ json: {
      data: [{ id: second || filtered ? "22222222-2222-4222-8222-222222222222" : "11111111-1111-4111-8111-111111111111", firstName: second || filtered ? "Joy" : "Grace", lastName: "Member" }],
      meta: { nextCursor: second || filtered ? "" : "second-page" },
    } });
  });
  let saved;
  await page.route("**/api/v1/admin/pastors", (route) => {
    saved = route.request().postDataJSON();
    return route.fulfill({ json: { data: { ...saved } } });
  });
  await page.goto("/#/pastors");
  const picker = page.getByRole("region", { name: "Pastor directory administration", exact: true });
  await expect(picker.getByRole("table")).toContainText("Grace Member");
  await picker.getByRole("radio", { name: "Select Grace Member" }).check();
  await picker.getByRole("button", { name: "Next", exact: true }).click();
  await expect(picker.getByRole("table")).toContainText("Joy Member");
  await expect(picker.getByRole("status")).toContainText("Selected: Grace Member");
  await picker.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(picker.getByRole("radio", { name: "Select Grace Member" })).toBeChecked();
  await picker.getByLabel("Filter members by name").fill("Joy");
  await expect(picker.getByRole("table")).toContainText("Joy Member");
  await expect(picker.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await picker.getByRole("radio", { name: "Select Joy Member" }).check();
  await picker.getByRole("button", { name: "Save pastor profile" }).click();
  await expect(picker.getByRole("status").filter({ hasText: "profile saved" })).toBeVisible();
  expect(saved.accountId).toBe("22222222-2222-4222-8222-222222222222");
  expect(queries).toContainEqual({ query: "", limit: "20" });
  expect(queries).toContainEqual({ query: "", limit: "20", cursor: "second-page" });
  expect(queries).toContainEqual({ query: "Joy", limit: "20" });
});

test("member table reports load failures and permits an explicit retry", async ({ page }) => {
  await pastoralMock(page);
  await page.route("**/api/v1/me/access", (route) => route.fulfill({ json: { data: {
    roles: [], capabilities: [{ permission: "roles.privileged.manage", scope: "" }],
  } } }));
  let calls = 0;
  await page.route("**/api/v1/members?**", (route) => ++calls === 1
    ? route.fulfill({ status: 503, json: { error: { message: "Please retry." } } })
    : route.fulfill({ json: { data: [], meta: { nextCursor: "" } } }));
  await page.goto("/#/pastors");
  const picker = page.getByRole("region", { name: "Pastor directory administration", exact: true });
  await expect(picker.getByRole("alert")).toContainText("Please retry.");
  await picker.getByRole("button", { name: "Retry loading members" }).click();
  await expect(picker.getByRole("table")).toContainText("No member accounts available.");
  await expect(picker.getByRole("button", { name: "Save pastor profile" })).toBeDisabled();
});
