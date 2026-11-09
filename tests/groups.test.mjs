import test from "node:test";
import assert from "node:assert/strict";
import { canManageGroup, canManageChurchGroups, canRemoveGroupMember } from "../src/groups/access.js";
import { hasCapability } from "../js/access.js";

const churchGroup = { id: "group-a", audience: "church" };
const leadershipGroup = { id: "leadership", audience: "leadership" };

test("group manager capabilities are limited to their exact group scope", () => {
  const leader = {
    roles: [{ role: "ministry_leader", scope: "group-a" }],
    capabilities: [{ permission: "ministry.members.manage", scope: "group-a" }],
  };
  assert.equal(canManageGroup(leader, churchGroup), true);
  assert.equal(canManageGroup(leader, { id: "group-b", audience: "church" }), false);
});

test("group management follows server grants regardless of audience and role", () => {
  const staff = {
    roles: [{ role: "staff", scope: "" }],
    capabilities: [{ permission: "groups.members.manage", scope: "" }],
  };
  const leader = {
    roles: [{ role: "ministry_leader", scope: "group-a" }],
    capabilities: [{ permission: "ministry.members.manage", scope: "group-a" }],
  };
  assert.equal(canManageGroup(staff, leadershipGroup), true);
  assert.equal(canManageGroup(leader, leadershipGroup), false);
});

test("the client does not override server group grants for pastors", () => {
  const pastor = {
    roles: [{ role: "assistant_pastor", scope: "" }],
    capabilities: [{ permission: "groups.members.manage", scope: "" }],
  };
  assert.equal(canManageGroup(pastor, churchGroup), true);
  assert.equal(canManageGroup(pastor, leadershipGroup), true);
});

test("server capabilities are authoritative without a local staff deny list", () => {
  const access = { roles: [{ role: "staff", scope: "" }], capabilities: [
    "roles.manage", "roles.operational.manage", "roles.privileged.manage", "members.records.read", "members.records.manage", "groups.manage", "groups.members.manage",
  ].map(permission => ({permission, scope:""})) };
  for (const permission of ["roles.manage", "roles.operational.manage", "roles.privileged.manage", "members.records.read", "members.records.manage"]) assert.equal(hasCapability(access, permission), true);
  assert.equal(canManageGroup(access, churchGroup), true);
  assert.equal(canManageChurchGroups(access), true);
  assert.equal(canRemoveGroupMember(access, churchGroup, {accountId:"creator"}, "staff"), false);
});

test("scoped removals fail closed without a server target decision", () => {
  const access = { roles: [{role:"ministry_leader",scope:"group-a"}], capabilities:[{permission:"ministry.members.manage",scope:"group-a"}] };
  assert.equal(canRemoveGroupMember(access, churchGroup, {accountId:"target"}, "leader"), false);
  assert.equal(canRemoveGroupMember(access, churchGroup, {accountId:"target",canRemove:false}, "leader"), false);
  assert.equal(canRemoveGroupMember(access, churchGroup, {accountId:"target",canRemove:true}, "leader"), true);
  assert.equal(canRemoveGroupMember(access, {...churchGroup,id:"other"}, {accountId:"target",canRemove:true}, "leader"), false);
});

test("role labels do not substitute for server grants", () => {
  const access = {roles:[{role:"super_administrator",scope:""}],capabilities:[{permission:"roles.manage",scope:""},{permission:"groups.manage",scope:""},{permission:"members.records.manage",scope:""}]};
  assert.equal(hasCapability(access,"roles.manage"),true);
  assert.equal(canManageChurchGroups(access),true);
  assert.equal(hasCapability(access,"members.records.manage"),true);
  assert.equal(canManageGroup(access,churchGroup),false);
});
