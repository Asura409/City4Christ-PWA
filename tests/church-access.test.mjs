import test from "node:test";
import assert from "node:assert/strict";
import { createAccessState, hasCapability } from "../js/access.js";
import { churchRolesFor, validateAppointment } from "../js/church-roles.js";
const snapshot = {
  roles: [{ role: "super_administrator", scope: "" }],
  capabilities: [
    { permission: "roles.read", scope: "" },
    { permission: "roles.privileged.manage", scope: "" },
    { permission: "roles.operational.manage", scope: "" },
  ],
};
test("church roles and capabilities parse without losing exact scope checks", async () => {
  const state = createAccessState(async () => ({ data: snapshot }));
  await state.refresh();
  assert.equal(hasCapability(state.current(), "roles.privileged.manage"), true);
  assert.equal(
    hasCapability(state.current(), "roles.privileged.manage", "wrong"),
    false,
  );
});
test("staff can offer ministry appointments but not privileged roles", () => {
  assert.deepEqual(
    churchRolesFor({
      capabilities: [{ permission: "roles.operational.manage", scope: "" }],
    }),
    ["ministry_leader"],
  );
  assert.ok(churchRolesFor(snapshot).includes("finance_officer"));
  assert.deepEqual(churchRolesFor(null), []);
});
test("appointment validation rejects self, missing MFA and scope inflation", () => {
  const target = {
    id: "22222222-2222-4222-8222-222222222222",
    mfaEnabled: true,
  };
  const actor = "11111111-1111-4111-8111-111111111111";
  assert.equal(
    validateAppointment({
      target,
      actor,
      role: "staff",
      scope: "",
      reason: "Approved",
      snapshot,
    }),
    null,
  );
  assert.match(
    validateAppointment({
      target,
      actor: target.id,
      role: "staff",
      scope: "",
      reason: "Approved",
      snapshot,
    }),
    /own/i,
  );
  assert.match(
    validateAppointment({
      target: { ...target, mfaEnabled: false },
      actor,
      role: "staff",
      scope: "",
      reason: "Approved",
      snapshot,
    }),
    /authenticator/i,
  );
  assert.match(
    validateAppointment({
      target,
      actor,
      role: "staff",
      scope: target.id,
      reason: "Approved",
      snapshot,
    }),
    /scope/i,
  );
});
test("Super Admin may resign only their own Super Admin role", () => {
  const target = {
    id: "11111111-1111-4111-8111-111111111111",
    mfaEnabled: true,
  };
  const common = {
    target,
    actor: target.id,
    scope: "",
    reason: "Approved resignation",
    snapshot,
    revoke: true,
  };
  assert.equal(
    validateAppointment({ ...common, role: "super_administrator" }),
    null,
  );
  assert.match(validateAppointment({ ...common, role: "staff" }), /own/i);
  assert.match(
    validateAppointment({
      ...common,
      role: "super_administrator",
      revoke: false,
    }),
    /own/i,
  );
});
