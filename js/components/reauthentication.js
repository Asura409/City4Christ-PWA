import { $, element, onSubmit, onClick } from "../ui.js";

// This panel displays server state. It never grants permission or retains a
// password; each sensitive endpoint still checks the current session itself.
export function bindReauthentication(api, page) {
  if (!["profile", "settings", "staff", "auth"].includes(page))
    return { refresh: async () => {}, clear: () => {} };
  const heading = element("h2", {}, ["Confirm your identity"]);
  const state = element("p", { "aria-live": "polite" });
  const password = element("input", {
    type: "password",
    name: "currentPassword",
    autocomplete: "current-password",
    required: "",
    maxlength: "1024",
  });
  const form = element(
    "form",
    { "aria-label": "Confirm with password", hidden: "" },
    [
      element("label", {}, ["Current password", password]),
      element("div", { class: "actions" }, [
        element("button", {}, ["Confirm with password"]),
      ]),
    ],
  );
  const google = element(
    "button",
    { type: "button", class: "secondary", hidden: "" },
    ["Confirm with Google"],
  );
  const check = element("button", { type: "button", class: "secondary" }, [
    "Check identity confirmation",
  ]);
  const panel = element(
    "section",
    { class: "panel", "aria-label": "Confirm your identity", hidden: "" },
    [
      heading,
      element("p", { class: "muted" }, [
        "Confirm before changing role assignments or linking Google. Confirmation lasts up to five minutes and applies only to this session.",
      ]),
      state,
      form,
      element("div", { class: "actions" }, [google, check]),
    ],
  );
  ($("main") || document.body).append(panel);
  let generation = 0,
    timer;
  function clear() {
    generation++;
    clearTimeout(timer);
    password.value = "";
    state.textContent = "";
    panel.hidden = true;
    form.hidden = true;
    google.hidden = true;
  }
  function render(data) {
    if (
      typeof data?.fresh !== "boolean" ||
      typeof data.passwordAvailable !== "boolean" ||
      typeof data.googleAvailable !== "boolean"
    )
      throw new Error("Identity confirmation is unavailable.");
    panel.hidden = false;
    form.hidden = !data.passwordAvailable;
    google.hidden = !data.googleAvailable;
    clearTimeout(timer);
    const remaining = Date.parse(data.freshUntil) - Date.now();
    const fresh = data.fresh && Number.isFinite(remaining) && remaining > 0;
    state.textContent = fresh
      ? "Identity confirmed. Sensitive actions still require the appropriate permissions."
      : "Confirm your identity to continue with a sensitive action.";
    if (!data.passwordAvailable && !data.googleAvailable)
      state.textContent =
        "No confirmation method is available. Sign in again or contact support.";
    if (fresh)
      timer = setTimeout(
        () => {
          state.textContent =
            "Confirmation expired. Confirm your identity again.";
        },
        Math.min(remaining, 2147483647),
      );
  }
  async function refresh() {
    const version = ++generation;
    try {
      const { data } = await api.reauthenticationStatus();
      if (version === generation) render(data);
      return data;
    } catch (error) {
      if (version === generation) clear();
      throw error;
    }
  }
  onSubmit(form, async () => {
    const version = ++generation;
    try {
      const { data } = await api.reauthenticatePassword(password.value);
      if (version === generation) render(data);
    } finally {
      password.value = "";
    }
  });
  onClick(google, async () => {
    const { data } = await api.beginGoogleReauthentication(
      new URL("auth.html", location.href).href,
    );
    const destination = new URL(data.url);
    if (
      destination.protocol !== "https:" ||
      destination.hostname !== "accounts.google.com"
    )
      throw new Error("Invalid Google confirmation destination.");
    location.assign(destination.href);
  });
  onClick(check, refresh);
  return { refresh, clear };
}
