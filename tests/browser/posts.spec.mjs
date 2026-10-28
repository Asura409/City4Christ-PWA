import { test, expect } from "@playwright/test";
import { mocked, MODERATOR_ACCESS } from "./fixtures/api.mjs";
import { STAFF_ACCESS } from "./fixtures/api.mjs";

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

test("members can edit and delete only their own posts", async ({ page }) => {
  const fixture = await mocked(page, { signedIn: true, includeOtherPost: true });
  await page.goto("/#/posts");
  const ownPost = page.locator(".community-post").filter({ hasText: "Grace Member" });
  const otherPost = page.locator(".community-post").filter({ hasText: "A post from another member." });
  await expect(ownPost.getByRole("button", { name: "Edit post" })).toBeVisible();
  await expect(ownPost.getByRole("button", { name: "Delete post" })).toBeVisible();
  await expect(otherPost.getByRole("button", { name: "Edit post" })).toHaveCount(0);
  await expect(otherPost.getByRole("button", { name: "Delete post" })).toHaveCount(0);

  await ownPost.getByRole("button", { name: "Edit post" }).click();
  await page.getByLabel("Edit post").fill("Updated Sunday announcement.");
  await ownPost.getByRole("button", { name: "Save changes" }).click();
  await expect(ownPost.getByText("Updated Sunday announcement.")).toBeVisible();
  expect(fixture.calls.find((call) => call.path.endsWith("/99999999-9999-4999-8999-999999999999") && call.method === "PUT")?.body)
    .toEqual({ body: "Updated Sunday announcement.", attachmentIds: [] });

  await ownPost.getByRole("button", { name: "Delete post" }).click();
  await expect(ownPost.getByText("Delete this post and its comments?", { exact: true })).toBeVisible();
  await ownPost.getByRole("button", { name: "Confirm delete" }).click();
  await expect(ownPost).toHaveCount(0);
  expect(fixture.calls.some((call) => call.path.endsWith("/99999999-9999-4999-8999-999999999999") && call.method === "DELETE")).toBe(true);
});

test("members can add and remove their Amen reaction", async ({ page }) => {
  const fixture = await mocked(page, { signedIn: true });
  await page.goto("/#/posts");
  const amen = page.getByRole("button", { name: "Say Amen (0)" });
  await expect(amen).toBeVisible();
  await amen.click();
  await expect(page.getByRole("button", { name: "Remove Amen (1)" })).toBeVisible();
  await page.getByRole("button", { name: "Remove Amen (1)" }).click();
  await expect(page.getByRole("button", { name: "Say Amen (0)" })).toBeVisible();
  expect(fixture.calls.filter((call) => call.path.endsWith("/reaction")).map((call) => call.method)).toEqual(["PUT", "DELETE"]);
});

test("members can report posts and comments but not their own content", async ({ page }) => {
  const fixture = await mocked(page, { signedIn: true, includeOtherPost: true });
  await page.goto("/#/posts");
  const ownPost = page.locator(".community-post").filter({ hasText: "Welcome to church this Sunday." });
  const otherPost = page.locator(".community-post").filter({ hasText: "A post from another member." });
  await expect(ownPost.getByRole("button", { name: "Report post" })).toHaveCount(0);
  await otherPost.getByRole("button", { name: "Report post" }).click();
  await page.getByLabel("Why are you reporting this post?").selectOption("harassment");
  await page.getByPlaceholder("Add details for the moderation team (optional).").first().fill("Targets a member.");
  await otherPost.getByRole("button", { name: "Send report" }).click();
  await expect(otherPost.getByRole("button", { name: "Post reported" })).toBeVisible();
  expect(fixture.calls.find((call) => call.path === "/api/v1/content-reports")?.body).toEqual({
    targetType: "post",
    targetId: "99999999-9999-4999-8999-111111111111",
    reason: "harassment",
    details: "Targets a member.",
  });

  await otherPost.getByRole("button", { name: "View comments (1)" }).click();
  const comment = otherPost.locator(".post-comment").filter({ hasText: "A comment for the church to review." });
  await comment.getByRole("button", { name: "Report comment" }).click();
  await comment.getByLabel("Why are you reporting this comment?").selectOption("inappropriate");
  await comment.getByRole("button", { name: "Send report" }).click();
  await expect(comment.getByRole("button", { name: "Reported" })).toBeVisible();
  expect(fixture.calls.filter((call) => call.path === "/api/v1/content-reports").map((call) => call.body.targetType)).toEqual(["post", "comment"]);
});

test("staff can review a report and hide the reported post", async ({ page }) => {
  const fixture = await mocked(page, { signedIn: true, access: MODERATOR_ACCESS, includeOtherPost: true, includePendingReport: true });
  await page.goto("/#/posts");
  await page.getByRole("button", { name: "Review reported content" }).click();
  const queue = page.getByRole("region", { name: "Community moderation" });
  const report = queue.locator(".community-report-card");
  await expect(report).toContainText("A post from another member.");
  await report.getByLabel("Decision reason").fill("Confirmed harassment.");
  await report.getByRole("button", { name: "Hide content" }).click();
  await expect(report).toHaveCount(0);
  await expect(page.getByText("A post from another member.")).toHaveCount(0);
  expect(fixture.calls.find((call) => call.path.includes("/moderation/content-reports/") && call.method === "POST")?.body)
    .toEqual({ decision: "hide", reason: "Confirmed harassment." });
});

test("members do not see the staff moderation queue", async ({ page }) => {
  await mocked(page, { signedIn: true });
  await page.goto("/#/posts");
  await expect(page.getByRole("button", { name: "Review reported content" })).toHaveCount(0);
});

test("members can read, add, and delete their own post comments", async ({ page }) => {
  const fixture = await mocked(page, { signedIn: true });
  await page.goto("/#/posts");
  await page.getByRole("button", { name: "View comments (0)" }).click();
  const composer = page.getByLabel("Write a comment");
  await expect(composer).toBeVisible();
  await composer.fill("Praying with you.");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  const comment = page.locator(".post-comment").filter({ hasText: "Praying with you." });
  await expect(comment).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide comments (1)" })).toBeVisible();
  await comment.getByRole("button", { name: "Delete comment" }).click();
  await expect(comment).toHaveCount(0);
  expect(fixture.calls.some((call) => call.path.endsWith("/comments") && call.method === "GET")).toBe(true);
  expect(fixture.calls.find((call) => call.path.endsWith("/comments") && call.method === "POST")?.body)
    .toEqual({ body: "Praying with you." });
  expect(fixture.calls.some((call) => call.path.endsWith("/comments/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa") && call.method === "DELETE")).toBe(true);
});

test("sermon editors attach scanned media to a draft and publish it from React", async ({ page }) => {
  const fixture = await mocked(page, { signedIn: true, access: STAFF_ACCESS });
  await page.route("https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/**", (route) => route.fulfill({ status: 200, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "image/png" } }));
  await page.goto("/#/word");
  const editor = page.getByRole("form", { name: "Create a sermon" });
  await expect(editor).toBeVisible();
  await editor.getByLabel("Sermon title").fill("Grace for today");
  await editor.getByLabel("Speaker").fill("Pastor Joy");
  await editor.locator('input[type="file"]').setInputFiles({ name: "sermon.png", mimeType: "image/png", buffer: Buffer.from("image") });
  await editor.getByRole("button", { name: "Create draft" }).click();
  await expect(editor.getByRole("status")).toContainText("Draft created");
  const created = fixture.calls.find((call) => call.path === "/api/v1/admin/sermons" && call.method === "POST");
  expect(created.body.attachmentIds).toEqual(["88888888-8888-4888-8888-888888888888"]);
  await page.getByRole("button", { name: "Publish sermon" }).click();
  await expect(page.locator(".sermon-attachments img")).toBeVisible();
  expect(fixture.calls.some((call) => call.path === `/api/v1/admin/sermons/${created.responseId || "22222222-2222-4222-8222-222222222222"}` && call.method === "PATCH")).toBe(true);
});

test("members upload a photo before publishing a post and see it in the feed", async ({ page }) => {
  const fixture = await mocked(page, { signedIn: true });
  await page.route("https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/**", (route) => route.fulfill({ status: 200, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "image/png" } }));
  await page.goto("/#/posts");
  await page.getByRole("button", { name: "Create a post" }).click();
  await page.getByLabel("Your message").fill("A photo from our gathering");
  await page.locator('input[type="file"]').setInputFiles({
    name: "gathering.png", mimeType: "image/png", buffer: Buffer.from("fake image bytes"),
  });
  await expect(page.getByText("gathering.png")).toBeVisible();
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByText("A photo from our gathering")).toBeVisible();
  await expect(page.locator(".community-post img[alt='Church post attachment']")).toBeVisible();
  expect(fixture.calls.find((call) => call.path === "/api/v1/posts" && call.method === "POST")?.body)
    .toEqual({ body: "A photo from our gathering", attachmentIds: ["88888888-8888-4888-8888-888888888888"] });
  expect(fixture.calls.some((call) => call.path === "/api/v1/uploads/presign" && call.method === "POST")).toBe(true);
});
