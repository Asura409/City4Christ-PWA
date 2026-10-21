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
    hasCapability(access, "groups.members.manage") ||
    hasCapability(access, "ministry.members.manage", group.id)
  );
}
