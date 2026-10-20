import { createAccessState, hasCapability } from "../access.js";
import { $, element, onClick, status } from "../ui.js";

const labels = {
  content_editor: "Content editor",
  system_administrator: "System administrator",
  access_administrator: "Access administrator",
  ministry_leader: "Ministry leader",
};

export function bindCurrentAccess(api, page) {
  const access = createAccessState(() => api.request("/api/v1/me/access"));
  let panel, summary, roles;
  if (["profile", "settings", "staff"].includes(page)) {
    summary = element("p", { class: "muted" });
    roles = element("ul", { id: "access-roles" });
    const refresh = element("button", { type: "button", class: "secondary" }, [
      "Refresh permissions",
    ]);
    panel = element(
      "section",
      {
        class: "panel",
        id: "current-access-panel",
        "aria-label": "My access",
        hidden: "",
      },
      [element("h2", {}, ["My access"]), summary, roles, refresh],
    );
    const main = $("main");
    const firstPanel = $("main > section");
    main.insertBefore(panel, firstPanel);
    onClick(refresh, async () => {
      await access.refresh();
      status("Permissions updated.", "success");
    });
  }
  access.subscribe((snapshot) => {
    const publisher = hasCapability(snapshot, "sermons.manage");
    const administrator = hasCapability(snapshot, "roles.manage");
    document
      .querySelectorAll('[data-api-navigation] a[href="staff.html"]')
      .forEach((link) => {
        link.hidden = !(publisher || administrator);
      });
    document
      .querySelectorAll("[data-requires-permission]")
      .forEach((section) => {
        section.hidden = !hasCapability(
          snapshot,
          section.dataset.requiresPermission,
        );
      });
    const empty = $("#staff-access-empty");
    if (empty) empty.hidden = !snapshot || publisher || administrator;
    if (!administrator) $("#role-results")?.replaceChildren();
    if (panel) {
      panel.hidden = !api.isSignedIn();
      summary.textContent = !snapshot
        ? "Current permissions are unavailable. Refresh to try again."
        : snapshot.roles.length
          ? "Your current appointments:"
          : "No staff roles are assigned to your account.";
      roles.replaceChildren(
        ...(snapshot?.roles || []).map((role) =>
          element("li", {}, [
            labels[role.role] + (role.scope ? " · ministry " + role.scope : ""),
          ]),
        ),
      );
    }
  });
  let nextAutoRefresh = 0;
  function refreshWhenActive() {
    if (
      !api.isSignedIn() ||
      document.visibilityState === "hidden" ||
      Date.now() < nextAutoRefresh
    )
      return;
    nextAutoRefresh = Date.now() + 15000;
    void access.refresh().catch(() => {});
  }
  window.addEventListener("focus", refreshWhenActive);
  document.addEventListener("visibilitychange", refreshWhenActive);
  return access;
}
