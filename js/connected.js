import { createClient } from "./api.js";
import { $, element, status, failure, onClick } from "./ui.js";
import { authPage } from "./pages/auth.js";
import { profilePage } from "./pages/profile.js";
import { sermonPage } from "./pages/sermons.js";
import { membersPage } from "./pages/members.js";
import { staffPage } from "./pages/staff.js";
const page = location.pathname.split("/").pop().replace(".html", "") || "index";
if (!$("[data-api-navigation]")) {
  const nav = element("nav", {
    class: "api-navigation api-top-links",
    "data-api-navigation": "",
    "aria-label": "Connected preview features",
  });
  for (const [label, path] of [
    ["Sign in", "auth.html"],
    ["My profile", "profile.html"],
    ["Word Hub", "word.html"],
    ["Members", "members.html"],
    ["Staff tools", "staff.html"],
  ])
    nav.append(element("a", { href: path }, [label]));
  document.body.insertBefore(
    nav,
    document.body.querySelector("main") || document.body.firstChild,
  );
}
if (!$("#page-status")) {
  const region = element("div", {
    id: "page-status",
    class: "status",
    role: "status",
    "aria-live": "polite",
    tabindex: "-1",
  });
  const main = $("main") || document.body;
  main.prepend(region);
}
const samples = [
  "home",
  "community",
  "prayer",
  "messages",
  "events",
  "pastor-booking",
  "giving",
  "live",
  "notifications",
];
if (samples.includes(page)) {
  const notice = element("aside", { class: "preview-notice" }, [
    "This area contains design samples. Posting, messaging, prayer, events, bookings, giving and live updates are not connected yet. Use the account, Word Hub and member pages to test the available services.",
  ]);
  ($("main") || document.body).prepend(notice);
  document
    .querySelectorAll("main button, #storyRepostBtn, main textarea")
    .forEach((control) => {
      control.disabled = true;
      control.title = "Design preview only; this action does not save yet.";
    });
}
document
  .querySelectorAll(".global-search-btn")
  .forEach((button) =>
    button.addEventListener("click", () => location.assign("members.html")),
  );
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});
let api;
try {
  api = createClient({ apiURL: globalThis.City4ChristConfig?.API_URL });
} catch {
  status("The preview API connection has not been configured.", "error");
}
if (api) {
  const channel = globalThis.BroadcastChannel
    ? new BroadcastChannel("city4christ-session")
    : null;
  channel?.addEventListener("message", (event) => {
    if (event.data?.type === "logout") location.assign("auth.html");
  });
  const setProfile = (profile) => {
    document.querySelectorAll("[data-auth-link]").forEach((a) => {
      a.textContent = "My account";
      a.href = "profile.html";
    });
    const greeting = $("#welcomeGreeting");
    if (greeting) greeting.textContent = `Welcome, ${profile.firstName} 🙏`;
    const composer = $("#share-faith h6");
    if (composer)
      composer.textContent = profile.firstName + " " + profile.lastName;
  };
  const initial = api.me().then((result) => {
    setProfile(result.data);
    return result.data;
  });
  initial.catch(() => {});
  const app = { api, session: () => initial, setProfile };
  document.querySelectorAll("[data-logout]").forEach((button) =>
    onClick(button, async () => {
      await api.logout();
      channel?.postMessage({ type: "logout" });
      location.assign("auth.html");
    }),
  );
  const pages = {
    auth: authPage,
    profile: profilePage,
    settings: profilePage,
    word: sermonPage,
    members: membersPage,
    staff: staffPage,
  };
  try {
    await pages[page]?.(app);
  } catch (error) {
    failure(error);
  }
  if (page === "home")
    initial.catch(() => {
      const greeting = $("#welcomeGreeting");
      if (greeting) greeting.textContent = "Welcome to City4Christ 🙏";
    });
  document.documentElement.dataset.apiConnected = "true";
}
