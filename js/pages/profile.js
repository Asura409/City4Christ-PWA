import { $, status, failure, onSubmit, onClick, value } from "../ui.js";
export async function profilePage({ api, access, session, setProfile }) {
  const form = $("#profile-form");
  let current;
  function fill(p) {
    current = p;
    setProfile(p);
    $("#profile-panel").hidden = false;
    $("#profile-email").textContent = p.email;
    $("#profile-id").textContent = p.id;
    form.elements.firstName.value = p.firstName;
    form.elements.lastName.value = p.lastName;
    form.elements.directoryVisible.checked = p.directoryVisible;
  }
  onSubmit(form, async () => {
    const patch = {};
    for (const key of ["firstName", "lastName"])
      if (value(form, key) !== current[key]) patch[key] = value(form, key);
    if (form.elements.directoryVisible.checked !== current.directoryVisible)
      patch.directoryVisible = form.elements.directoryVisible.checked;
    if (!Object.keys(patch).length) {
      status("No profile changes to save.");
      return;
    }
    const { data } = await api.updateProfile(patch);
    fill(data);
    status("Your profile has been saved.", "success");
  });
  onClick($("#check-session"), async () => {
    await api.refresh();
    const { data } = await api.me();
    fill(data);
    await access?.refresh();
    status("Your session is active.", "success");
  });
  onClick($("#link-google"), async () => {
    try {
      const { data } = await api.beginGoogleLink(
        new URL("auth.html", location.href).href,
      );
      const u = new URL(data.url);
      if (u.protocol !== "https:" || u.hostname !== "accounts.google.com")
        throw new Error("Google sign-in returned an invalid destination.");
      location.assign(u.href);
    } catch (e) {
      if (e.status === 401) {
        status(
          "Confirm your identity below, then try linking Google again.",
          "error",
        );
        return;
      }
      throw e;
    }
  });
  onClick($("#check-health"), async () => {
    await Promise.all([
      api.request("/health/live", { public: true }),
      api.request("/health/ready", { public: true }),
    ]);
    status("The preview service is online.", "success");
  });
  const theme = $("#theme-selector");
  if (theme) {
    theme.value = localStorage.getItem("city4christ-theme") || "system";
    theme.addEventListener("change", () => {
      localStorage.setItem("city4christ-theme", theme.value);
      globalThis.applyCityTheme?.(theme.value);
    });
  }
  try {
    fill(await session());
  } catch (error) {
    failure(error);
  }
}
