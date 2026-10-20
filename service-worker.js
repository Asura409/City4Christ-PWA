// Only public application files are cached. Account/API responses are network-only.
const CACHE_NAME = "city4christ-preview-__BUILD_ID__";
const ROOT = new URL("./", self.location.href);
const FILES = [
  "./",
  "index.html",
  "auth.html",
  "profile.html",
  "settings.html",
  "members.html",
  "staff.html",
  "word.html",
  "css/connected.css",
  "js/app.js",
  "js/api.js",
  "js/access.js",
  "js/components/current-access.js",
  "js/ui.js",
  "js/connected.js",
  "js/pages/auth.js",
  "js/pages/password-recovery.js",
  "js/pages/profile.js",
  "js/pages/sermons.js",
  "js/pages/members.js",
  "js/components/pager.js",
  "js/components/role-appointments.js",
  "js/pages/staff.js",
  "assets/images/logo.jpeg",
];
const SHELL = new Set(FILES.map((path) => new URL(path, ROOT).href));
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([...SHELL]))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("city4christ-") && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("Authorization") ||
    request.cache === "no-store" ||
    url.pathname.includes("/api/") ||
    url.pathname.endsWith("/js/config.js")
  )
    return;
  if (!SHELL.has(url.href) && request.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok && SHELL.has(url.href)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (
          (await cache.match(request)) ||
          (request.mode === "navigate"
            ? await cache.match(new URL("index.html", ROOT).href)
            : Response.error())
        );
      }
    })(),
  );
});
