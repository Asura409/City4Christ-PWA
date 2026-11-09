import { hasCapability } from "../../js/access.js";

export function canManageGroup(access, group) {
  if (!group) return false;
  return (
    hasCapability(access, "groups.members.manage") ||
    hasCapability(access, "ministry.members.manage", group.id)
  );
}

export function canManageChurchGroups(access) {
  return hasCapability(access, "groups.manage");
}

export function canManageGroupSettings(access, group) {
  if (!group) return false;
  return hasCapability(access, "groups.settings.manage", group.id) ||
    hasCapability(access, "groups.settings.manage", "");
}

export function canViewGroupAnalytics(access, group) {
  if (!group) return false;
  return hasCapability(access, "groups.analytics.read", group.id) ||
    hasCapability(access, "groups.analytics.read", "");
}

export function canCreateLeadershipGroup(access) {
  return canManageChurchGroups(access);
}

// Scoped removals need a server-computed target decision: roster names alone
// cannot tell us whether someone is a creator, leader, or Super Admin.
export function canRemoveGroupMember(access, group, member, actorId) {
  return canManageGroup(access, group) && member?.canRemove === true;
}
