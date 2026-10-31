// Browser APIs own subscription key generation and permission prompts.
export async function subscribeDevice(
  publicKey,
  {
    notification = globalThis.Notification,
    serviceWorker = globalThis.navigator?.serviceWorker,
  } = {},
) {
  if (!notification || !serviceWorker)
    throw new Error("This browser does not support push notifications.");
  const permission = await notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      "Notification permission was not granted. Check your browser settings.",
    );
  let timer;
  const registration = await Promise.race([
    serviceWorker.ready,
    new Promise((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              "Notification service is not ready. Reload the app and try again.",
            ),
          ),
        15000,
      );
    }),
  ]).finally(() => clearTimeout(timer));
  const encoded = publicKey.replace(/-/g, "+").replace(/_/g, "/");
  const key = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  let existing = await registration.pushManager.getSubscription();
  if (existing?.options?.applicationServerKey) {
    const old = new Uint8Array(existing.options.applicationServerKey);
    if (old.length !== key.length || old.some((v, i) => v !== key[i])) {
      await existing.unsubscribe();
      existing = null;
    }
  }
  return (
    existing ||
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    })
  );
}
export async function currentDeviceSubscription() {
  const registration =
    await globalThis.navigator?.serviceWorker?.getRegistration();
  return registration?.pushManager.getSubscription() || null;
}
