import test from "node:test";
import assert from "node:assert/strict";
import { canManageGroup, canViewLeadershipGroup } from "../src/groups/access.js";

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

test("only Super Admins, Assistant Pastors and Ministry Leaders can view leadership groups", () => {
  const staff = {
    roles: [{ role: "staff", scope: "" }],
    capabilities: [{ permission: "groups.members.manage", scope: "" }],
  };
  const leader = {
    roles: [{ role: "ministry_leader", scope: "group-a" }],
    capabilities: [{ permission: "ministry.members.manage", scope: "group-a" }],
  };
  assert.equal(canViewLeadershipGroup(staff), false);
  assert.equal(canManageGroup(staff, leadershipGroup), false);
  assert.equal(canViewLeadershipGroup(leader), true);
  assert.equal(canManageGroup(leader, leadershipGroup), false);
});

test("church-wide group managers retain their management scope", () => {
  const pastor = {
    roles: [{ role: "assistant_pastor", scope: "" }],
    capabilities: [{ permission: "groups.members.manage", scope: "" }],
  };
  assert.equal(canManageGroup(pastor, churchGroup), true);
  assert.equal(canManageGroup(pastor, leadershipGroup), true);
});
