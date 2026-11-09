import { test, expect } from "@playwright/test";
import { mocked, GROUP } from "./fixtures/api.mjs";

test("staff without server grants cannot open member or group administration", async ({page}) => {
  const {calls} = await mocked(page, {signedIn:true, access:{roles:[{role:"staff",scope:""}], capabilities:[{permission:"visitors.follow_up",scope:""}]}});
  await page.goto("/#/admin");
  await expect(page.getByRole("region",{name:"Admin dashboard"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Members",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Staff & roles",exact:true})).toHaveCount(0);
  await page.goto("/#/admin/members");
  await expect(page.getByRole("alert")).toContainText("do not have permission");
  await page.goto("/#/groups/manage");
  await expect(page.getByRole("alert")).toContainText("not authorized");
  await page.goto(`/#/groups/${GROUP}`);
  await expect(page.getByRole("heading",{name:"Choir",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:/^Remove /})).toHaveCount(0);
  expect(calls.some(c=>c.path.startsWith("/api/v1/admin/members") || c.path.startsWith("/api/v1/admin/groups") || c.path.endsWith("/membership-requests"))).toBe(false);
});
