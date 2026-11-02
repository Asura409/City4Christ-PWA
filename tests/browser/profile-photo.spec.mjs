import { test, expect } from "@playwright/test";
import { mocked, mockScannedUpload } from "./fixtures/api.mjs";

test("members upload a scanned profile photo and can remove it", async ({ page }) => {
  const { calls } = await mocked(page, { signedIn: true });
  const upload = await mockScannedUpload(page);
  const avatarCalls = [];
  let avatar = null;
  await page.route("**/api/v1/me/avatar", async (route) => {
    const request = route.request();
    let body;
    try { body = request.postDataJSON(); } catch {}
    avatarCalls.push({ method: request.method(), body });
    if (request.method() === "PUT") {
      avatar = {
        id: upload.uploadId,
        contentType: "image/png",
        size: 128,
        url: "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/available/profile.png?signature=test",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      };
    } else {
      avatar = null;
    }
    return route.fulfill({ json: { data: { id: "11111111-1111-4111-8111-111111111111", email: "tester@example.invalid", firstName: "Grace", lastName: "Member", emailVerified: true, hasPassword: true, directoryVisible: false, ...(avatar ? { avatar } : {}) } } });
  });
  await page.goto("/#/profile");
  await page.getByLabel("Profile photo", { exact: true }).setInputFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  });
  await page.getByRole("button", { name: "Upload photo" }).click();
  await expect(page.getByRole("img", { name: "Your profile photo" })).toBeVisible();
  expect(avatarCalls[0]).toEqual({ method: "PUT", body: { uploadId: upload.uploadId } });
  expect(upload.calls.some((call) => call.path === "/api/v1/uploads/presign" && call.body.purpose === "profile_photo")).toBeTruthy();
  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByRole("img", { name: "Your profile photo" })).toHaveCount(0);
  expect(avatarCalls.at(-1).method).toBe("DELETE");
});

test("member directory shows only supplied HTTPS photos", async ({ page }) => {
  await mocked(page, { signedIn: true });
  await page.route("**/api/v1/members**", (route) => route.fulfill({ json: {
    data: [{
      id: "22222222-2222-4222-8222-222222222222",
      firstName: "Daniel",
      lastName: "James",
      avatar: { id: "33333333-3333-4333-8333-333333333333", contentType: "image/png", size: 128, url: "https://media.example.invalid/member.png?sig=test", expiresAt: new Date(Date.now() + 60_000).toISOString() },
    }],
    meta: { nextCursor: "" },
  } }));
  await page.goto("/members.html");
  await expect(page.getByRole("heading", { name: "Daniel James" })).toBeVisible();
  const photo = page.getByRole("img", { name: "Daniel James" });
  await expect(photo).toHaveAttribute("src", "https://media.example.invalid/member.png?sig=test");
});
