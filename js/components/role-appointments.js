import { $, element, status, onSubmit, onClick, value } from "../ui.js";
export function roleAppointments(api, roles) {
  roles.elements.role.addEventListener("change", () => {
    const scoped = roles.elements.role.value === "ministry_leader";
    $("#scope-label").hidden = !scoped;
    roles.elements.scope.required = scoped;
  });
  async function assigned() {
    if (!roles.elements.accountId.reportValidity()) return;
    const { data } = await api.request(
      "/api/v1/admin/accounts/" +
        encodeURIComponent(value(roles, "accountId").trim()) +
        "/roles",
    );
    $("#role-results").replaceChildren(
      ...data.map((r) =>
        element("li", {}, [r.role + (r.scope ? " · ministry " + r.scope : "")]),
      ),
    );
    if (!data.length)
      $("#role-results").append(element("li", {}, ["No roles assigned."]));
  }
  onSubmit(roles, async (button) => {
    const revoke = button?.dataset.roleAction === "revoke";
    const body = {
      role: value(roles, "role"),
      scope:
        value(roles, "role") === "ministry_leader"
          ? value(roles, "scope").trim()
          : "",
      reason: value(roles, "reason"),
    };
    const { data } = await api.request(
      "/api/v1/admin/accounts/" +
        encodeURIComponent(value(roles, "accountId").trim()) +
        "/roles" +
        (revoke ? "/revoke" : ""),
      { method: "POST", body },
    );
    await assigned();
    status(
      data.changed
        ? revoke
          ? "Role revoked."
          : "Role granted."
        : "No change was needed.",
      "success",
    );
  });
  onClick($("#view-roles"), assigned);
}
