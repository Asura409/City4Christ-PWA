import test from "node:test";
import assert from "node:assert/strict";
import { subscribeDevice } from "../src/notifications/push.js";
test("device push requests permission only when invoked and uses the browser crypto API", async () => {
  let prompts = 0,
    options;
  const subscription = {
    toJSON: () => ({
      endpoint: "https://fcm.googleapis.com/fcm/send/test",
      keys: { p256dh: "synthetic", auth: "synthetic" },
    }),
  };
  const registration = {
    pushManager: {
      getSubscription: async () => null,
      subscribe: async (value) => {
        options = value;
        return subscription;
      },
    },
  };
  const result = await subscribeDevice("BABA", {
    notification: {
      requestPermission: async () => {
        prompts++;
        return "granted";
      },
    },
    serviceWorker: { ready: Promise.resolve(registration) },
  });
  assert.equal(prompts, 1);
  assert.equal(options.userVisibleOnly, true);
  assert.ok(options.applicationServerKey instanceof Uint8Array);
  assert.equal(result, subscription);
});
test("denied push permission never creates a browser subscription", async () => {
  let subscribed = false;
  await assert.rejects(
    subscribeDevice("BABA", {
      notification: { requestPermission: async () => "denied" },
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: { subscribe: async () => (subscribed = true) },
        }),
      },
    }),
    /permission/i,
  );
  assert.equal(subscribed, false);
});
