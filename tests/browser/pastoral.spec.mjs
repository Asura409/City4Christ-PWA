import { test, expect } from "@playwright/test";
import { pastoralMock, SLOT, BOOKING } from "./fixtures/pastoral.mjs";
test("member requests a slot pending pastor approval and cancels their appointment", async ({
  page,
}) => {
  const { calls } = await pastoralMock(page);
  await page.goto("/#/pastors");
  await page
    .getByRole("button", { name: "View availability for Joy Pastor" })
    .click();
  await page.getByRole("button", { name: "Request appointment" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Awaiting pastor approval" }),
  ).toBeVisible();
  const mine = page.getByRole("region", { name: "My appointments" });
  await expect(mine).toContainText("pending");
  expect(
    calls.find(
      (c) => c.path === "/api/v1/pastor-bookings" && c.method === "POST",
    ).body,
  ).toEqual({ slotId: SLOT });
  await mine.getByRole("button", { name: "Cancel appointment" }).click();
  await expect(mine).toContainText("cancelled");
  expect(
    calls.some(
      (c) =>
        c.path === "/api/v1/pastor-bookings/" + BOOKING &&
        c.method === "DELETE",
    ),
  ).toBe(true);
});
test("assigned pastor approves with the current version", async ({ page }) => {
  const { calls } = await pastoralMock(page, { pastor: true });
  await page.goto("/#/pastors");
  const assigned = page.getByRole("region", { name: "Assigned appointments" });
  await assigned.getByRole("button", { name: "Approve" }).click();
  await expect(assigned).toContainText("approved");
  expect(
    calls.find((c) => c.path.endsWith("/" + BOOKING) && c.method === "PATCH")
      .body,
  ).toEqual({ status: "approved", version: 1 });
});
test('stale pastor decisions show the conflict and do not pretend approval succeeded',async({page})=>{
 await pastoralMock(page,{pastor:true});let writes=0;
 await page.route('**/api/v1/me/pastoral/bookings/'+BOOKING,route=>{writes++;return route.fulfill({status:409,json:{error:{code:'appointment_conflict',message:'Appointment changed. Reload before retrying.'}}});});
 await page.goto('/#/pastors');const assigned=page.getByRole('region',{name:'Assigned appointments'});await assigned.getByRole('button',{name:'Approve'}).click();
 await expect(assigned.getByRole('alert')).toContainText('Reload');await expect(assigned).toContainText('pending');expect(writes).toBe(1);
});
