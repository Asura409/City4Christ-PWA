import { isSuperAdmin } from "../../js/access.js";

function hasRole(access, role) {
  return (access?.roles || []).some((item) => item.role === role);
}

function hasCapability(access, permission, scope = "") {
  return (access?.capabilities || []).some(
    (item) => item.permission === permission && item.scope === scope,
  );
}

export function canViewLeadershipGroup(access) {
  return (
    hasRole(access, "super_administrator") ||
    hasRole(access, "assistant_pastor") ||
    hasRole(access, "ministry_leader")
  );
}

export function canManageGroup(access, group) {
  if (group.audience === "leadership" && !canViewLeadershipGroup(access))
    return false;
  return (
    (isSuperAdmin(access) && hasCapability(access, "groups.members.manage")) ||
    ((access?.roles || []).some((role) => role.role === "ministry_leader" && role.scope === group.id) &&
      hasCapability(access, "ministry.members.manage", group.id))
  );
}

export function canManageChurchGroups(access) {
  return isSuperAdmin(access) && hasCapability(access, "groups.manage");
}

export function canCreateLeadershipGroup(access) {
  return isSuperAdmin(access);
}

// Scoped removals need a server-computed target decision: roster names alone
// cannot tell us whether someone is a creator, leader, or Super Admin.
export function canRemoveGroupMember(access, group, member, actorId) {
  if (!member || member.accountId === actorId || !canManageGroup(access, group)) return false;
  return isSuperAdmin(access) || member.canRemove === true;
}
