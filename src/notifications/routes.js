const KNOWN_ROUTES = [
  "/home",
  "/word",
  "/bible",
  "/devotionals",
  "/pastors",
  "/groups",
  "/posts",
  "/chat",
  "/members",
  "/notifications",
  "/giving",
  "/prayer",
  "/events",
  "/profile",
  "/visitors",
  "/admin",
  "/settings",
  "/community",
  "/live",
  "/get-app",
  "/search",
  "/pastor-dashboard",
  "/pastor-availability",
  "/account-deletion-requests",
  "/welcome",
];

function knownRoute(route) {
  return KNOWN_ROUTES.some(
    (known) => route === known || route.startsWith(`${known}/`),
  );
}

export function notificationRoute(value) {
  if (typeof value !== "string" || !value.startsWith("/#/")) return "";
  const route = value.slice(2);

  let normalized = route;
  if (route === "/messages" || route.startsWith("/messages/")) {
    normalized = "/chat";
  } else if (
    route === "/post" ||
    route.startsWith("/post/") ||
    route.startsWith("/posts/")
  ) {
    normalized = "/posts";
  } else if (
    route === "/prayers" ||
    route.startsWith("/prayers/") ||
    route.startsWith("/prayer/")
  ) {
    normalized = "/prayer";
  }

  if (!knownRoute(normalized)) return "/notifications";
  return /^\/[A-Za-z0-9/_-]+$/.test(normalized) ? normalized : "";
}
