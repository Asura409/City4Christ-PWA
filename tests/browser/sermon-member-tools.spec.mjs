import { test, expect } from "@playwright/test";
import { mocked, SERMON } from "./fixtures/api.mjs";

test("members can save private sermon notes and resume uploaded audio", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const calls = [];
  await page.route(`**/api/v1/sermons/${SERMON}`, (route) => route.fulfill({
    contentType: "application/json",
    json: { data: {
      id: SERMON,
      title: "Living in Faith",
      summary: "A published message",
      speaker: "Pastor Joy",
      attachments: [{ id: "audio-1", contentType: "audio/mpeg", url: "https://media.example.invalid/sermon.mp3" }],
    } },
  }));
  await page.route("**/api/v1/me/sermons/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body = {};
    try { body = request.postDataJSON() || {}; } catch {}
    calls.push({ method: request.method(), path, body });
    if (path.endsWith("/progress")) {
      const data = request.method() === "PUT"
        ? { sermonId: SERMON, positionSeconds: body.positionSeconds }
        : { sermonId: SERMON, positionSeconds: 42 };
      return route.fulfill({ contentType: "application/json", json: { data } });
    }
    if (path.endsWith("/notes")) {
      return route.fulfill({ contentType: "application/json", json: { data: { sermonId: SERMON, body: body.body || "First note", updatedAt: new Date().toISOString() } } });
    }
    return route.fulfill({ status: 404, json: { error: { message: "Not found" } } });
  });

  await page.goto("/#/word");
  await page.getByRole("button", { name: "Open sermon" }).click();
  await expect(page.getByText("Resume at 0:42")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your sermon notes" })).toBeVisible();
  const notes = page.getByLabel("Private sermon notes");
  await expect(notes).toHaveValue("First note");
  await notes.fill("A private reflection");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.locator(".sermon-member-tools [role=status]")).toContainText("Note saved");
  expect(calls.some((call) => call.method === "PUT" && call.path.endsWith("/notes") && call.body.body === "A private reflection")).toBe(true);

  const audio = page.locator(".sermon-attachments audio");
  await expect(audio).toBeVisible();
  const resumedAt = await audio.evaluate((element) => {
    let currentTime = 0;
    Object.defineProperty(element, "currentTime", { configurable: true, get: () => currentTime, set: (value) => { currentTime = value; } });
    Object.defineProperty(element, "readyState", { configurable: true, value: 1 });
    Object.defineProperty(element, "duration", { configurable: true, value: 300 });
    element.dispatchEvent(new Event("loadedmetadata"));
    return currentTime;
  });
  expect(resumedAt).toBe(42);
  await audio.evaluate((element) => {
    Object.defineProperty(element, "currentTime", { configurable: true, value: 75 });
    element.dispatchEvent(new Event("timeupdate"));
    element.dispatchEvent(new Event("pause"));
  });
  await expect.poll(() => calls.some((call) => call.method === "PUT" && call.path.endsWith("/progress") && call.body.positionSeconds === 75)).toBe(true);
});
