import { $, element, onSubmit, value, status } from "../ui.js";
import {
  churchRolesFor,
  churchRoleLabels,
  validateAppointment,
} from "../church-roles.js";
import { eligibleMembers } from "./eligible-members.js";
export function churchRoleAppointments({ api, access, session }) {
  const form = $("#church-role-form");
  if (!form) return;
  let target = null,
    actor = "",
    generation = 0,
    preferredRole = "",
    permittedRoles = [];
  const assignments = $("#church-role-results"),
    selected = $("#church-selected-member");
  function clearTarget() {
    generation++;
    target = null;
    selected.textContent = "No member selected.";
    assignments.replaceChildren();
    form.reset();
    if (
      [...form.elements.role.options].some(
        (option) => option.value === preferredRole,
      )
    )
      form.elements.role.value = preferredRole;
    scopeVisibility();
  }
  async function load() {
    const own = generation;
    const { data } = await api.request(
      "/api/v1/admin/accounts/" +
        encodeURIComponent(target.id) +
        "/church-roles",
    );
    if (own !== generation) return;
    assignments.replaceChildren(
      ...data.map((r) =>
        element("li", {}, [
          (churchRoleLabels[r.role] || r.role) +
            (r.scope ? " · " + r.scope : ""),
        ]),
      ),
    );
    if (!data.length)
      assignments.append(element("li", {}, ["No church roles assigned."]));
  }
  const search = eligibleMembers(api, async (member) => {
    clearTarget();
    if (!member) return;
    target = member;
    selected.textContent = `${member.firstName} ${member.lastName} · ${member.email}`;
    await load();
  });
  access.subscribe((snapshot) => {
    const selectedRole = value(form, "role");
    if (selectedRole) preferredRole = selectedRole;
    const roles = churchRolesFor(snapshot);
    const lostPermission =
      snapshot && permittedRoles.some((role) => !roles.includes(role));
    if (snapshot) permittedRoles = roles;
    form.elements.role.replaceChildren(
      ...roles.map((role) =>
        element("option", { value: role }, [churchRoleLabels[role]]),
      ),
    );
    if (roles.includes(preferredRole)) form.elements.role.value = preferredRole;
    else if (snapshot) preferredRole = "";
    form.elements.confirmed.checked = false;
    if (!snapshot || lostPermission) search.clear();
  });
  session()
    .then((profile) => (actor = profile.id))
    .catch(() => {});
  function scopeVisibility() {
    const scoped = value(form, "role") === "ministry_leader";
    $("#church-scope-label").hidden = !scoped;
    form.elements.scope.required = scoped;
    if (!scoped) form.elements.scope.value = "";
  }
  form.elements.role.addEventListener("change", () => {
    preferredRole = value(form, "role");
    form.elements.confirmed.checked = false;
    scopeVisibility();
  });
  for (const input of [form.elements.scope, form.elements.reason]) {
    input.addEventListener("input", () => {
      form.elements.confirmed.checked = false;
    });
  }
  access.subscribe(scopeVisibility);
  onSubmit(form, async (button) => {
    const revoke = button?.dataset.churchAction === "revoke";
    const body = {
      role: value(form, "role"),
      scope:
        value(form, "role") === "ministry_leader"
          ? value(form, "scope").trim()
          : "",
      reason: value(form, "reason").trim(),
    };
    const error = validateAppointment({
      target,
      actor,
      ...body,
      snapshot: access.current(),
      revoke,
    });
    if (error) {
      status(error, "error");
      return;
    }
    if (!form.elements.confirmed.checked) {
      status("Confirm that you reviewed this appointment.", "error");
      return;
    }
    const selectedGeneration = generation;
    const id = target.id;
    try {
      const { data } = await api.request(
        "/api/v1/admin/accounts/" +
          encodeURIComponent(id) +
          "/church-roles" +
          (revoke ? "/revoke" : ""),
        { method: "POST", body },
      );
      if (selectedGeneration !== generation) return;
      form.elements.confirmed.checked = false;
      await load();
      status(
        data.changed
          ? revoke
            ? "Church role revoked."
            : "Church role granted."
          : "No change was needed.",
        "success",
      );
    } catch (error) {
      form.elements.confirmed.checked = false;
      if (["reauthentication_required", "mfa_required"].includes(error.code)) {
        status(
          "Confirm your identity and authenticator in the security panels, then review and submit this action again.",
          "error",
        );
        return;
      }
      if (error.code === "last_administrator") {
        status(
          "Another active Super Admin must remain before this appointment can be revoked.",
          "error",
        );
        return;
      }
      throw error;
    }
  });
  window.addEventListener("pagehide", () => search.clear());
}
