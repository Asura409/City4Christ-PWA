import { hasCapability } from "./access.js";
export const churchRoleLabels = {
  super_administrator: "Super Admin",
  assistant_pastor: "Assistant Pastor",
  staff: "Staff",
  finance_officer: "Finance Officer",
  ministry_leader: "Ministry leader",
};
export function churchRolesFor(snapshot) {
  return [
    ...(hasCapability(snapshot, "roles.privileged.manage")
      ? ["super_administrator", "assistant_pastor", "staff", "finance_officer"]
      : []),
    ...(hasCapability(snapshot, "roles.operational.manage")
      ? ["ministry_leader"]
      : []),
  ];
}
export function validateAppointment({
  target,
  actor,
  role,
  scope,
  reason,
  snapshot,
  revoke = false,
}) {
  if (!target) return "Select a member first.";
  if (
    target.id === actor &&
    !(
      revoke &&
      role === "super_administrator" &&
      hasCapability(snapshot, "roles.privileged.manage")
    )
  )
    return "You cannot change your own appointments, except resigning as Super Admin.";
  if (!churchRolesFor(snapshot).includes(role))
    return "This role is not available to you.";
  if (!revoke && role !== "ministry_leader" && !target.mfaEnabled)
    return "This member must enable authenticator protection first.";
  if (
    role === "ministry_leader"
      ? !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          scope,
        ) || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(scope)
      : scope !== ""
  )
    return "Supply the correct registered ministry scope.";
  if (!reason.trim() || reason.length > 500)
    return "Supply a reason of at most 500 characters.";
  return null;
}
