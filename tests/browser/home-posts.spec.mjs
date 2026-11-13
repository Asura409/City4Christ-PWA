import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

test("Home supports Amen and comments on the same posts shown in Community", async ({ page }) => {
  const { calls } = await mocked(page, { signedIn: true });
  const loaded = page.waitForRequest(r => new URL(r.url()).pathname === "/api/v1/posts");
  await page.goto("/#/home");
  expect(new URL((await loaded).url()).searchParams.get("limit")).toBe("3");
  const post = page.locator('.home-posts-feed .community-post').filter({ hasText: "Welcome to church this Sunday." });
  await expect(post).toBeVisible();
  await expect(page.getByRole("heading", { name: "Church community", exact: true })).toHaveCount(0);
  await post.getByRole("button", { name: "Say Amen (0)", exact: true }).click();
  await expect(post.getByRole("button", { name: "Remove Amen (1)", exact: true })).toHaveAttribute("aria-pressed", "true");
  await post.getByRole("button", { name: "View comments (0)", exact: true }).click();
  await post.getByLabel("Write a comment", { exact: true }).fill("Joining in prayer from Home.");
  await post.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(post.locator('.post-comment')).toContainText("Joining in prayer from Home.");
  await expect(post.getByRole("button", { name: "Hide comments (1)", exact: true })).toBeVisible();
  expect(calls.find(c => c.path.endsWith('/comments') && c.method === 'POST').body).toEqual({ body: "Joining in prayer from Home." });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "View all", exact: true }).click();
  const samePost = page.locator('.community-post').filter({ hasText: "Welcome to church this Sunday." });
  await expect(samePost.getByRole("button", { name: "Remove Amen (1)", exact: true })).toBeVisible();
  await samePost.getByRole("button", { name: "View comments (1)", exact: true }).click();
  await expect(samePost.locator('.post-comment')).toContainText("Joining in prayer from Home.");
});

test("failed Amen restores its count and a successful retry clears the error without refreshing", async ({ page }) => {
  await mocked(page, { signedIn: true });
  let fail = true;
  await page.route("**/api/v1/posts/*/reaction", async route => {
    if (!fail) return route.fallback();
    fail = false;
    return route.fulfill({ status: 503, json: { error: { code: "unavailable", message: "Reaction temporarily unavailable." } } });
  });
  await page.goto("/#/home");
  const post = page.locator('.home-posts-feed .community-post').filter({ hasText: "Welcome to church this Sunday." });
  await post.getByRole("button", { name: "Say Amen (0)", exact: true }).click();
  await expect(post.getByRole("alert")).toContainText("Reaction temporarily unavailable");
  await expect(post.getByRole("button", { name: "Say Amen (0)", exact: true })).toBeEnabled();
  await post.getByRole("button", { name: "Say Amen (0)", exact: true }).click();
  await expect(post.getByRole("button", { name: "Remove Amen (1)", exact: true })).toBeVisible();
  await expect(post.getByRole("alert")).toHaveCount(0);
});
