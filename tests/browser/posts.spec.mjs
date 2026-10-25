import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

test("members read and publish church-wide posts", async ({ page }) => {
  const fixture = await mocked(page, { signedIn: true });
  await page.goto("/#/posts");
  await expect(page.getByRole("heading", { name: "Church community" })).toBeVisible();
  await expect(page.getByText("Welcome to church this Sunday.")).toBeVisible();
  await page.getByRole("button", { name: "Create a post" }).click();
  await page.getByLabel("Your message").fill("Looking forward to worship together.");
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByText("Looking forward to worship together.")).toBeVisible();
  expect(fixture.calls.find((call) => call.path === "/api/v1/posts" && call.method === "POST")?.body)
    .toEqual({ body: "Looking forward to worship together." });
});
