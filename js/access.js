// This is display state only. Protected API actions authorize in PostgreSQL.
const globalPermissions = new Set([
  "sermons.manage",
  "roles.manage",
  "roles.read",
  "roles.privileged.manage",
  "roles.operational.manage",
]);
const globalRoles = new Set([
  "super_administrator",
  "assistant_pastor",
  "staff",
  "finance_officer",
  "content_editor",
  "system_administrator",
  "access_administrator",
]);
const ministryID = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    value,
  ) &&
  value !== "00000000-0000-0000-0000-000000000000";
function validCapability({ permission, scope } = {}) {
  return (
    (globalPermissions.has(permission) && scope === "") ||
    (permission === "ministry.members.manage" && ministryID(scope))
  );
}
export function hasCapability(snapshot, permission, scope = "") {
  return (
    validCapability({ permission, scope }) &&
    Array.isArray(snapshot?.capabilities) &&
    snapshot.capabilities.some(
      (c) => c?.permission === permission && c?.scope === scope,
    )
  );
}
function parseAccess(data) {
  if (
    !Array.isArray(data?.roles) ||
    !Array.isArray(data?.capabilities) ||
    !data.roles.every(
      (r) =>
        r &&
        ((globalRoles.has(r.role) && r.scope === "") ||
          (r.role === "ministry_leader" && ministryID(r.scope))),
    ) ||
    !data.capabilities.every((c) => c && validCapability(c))
  ) {
    throw new Error(
      "Current permissions could not be loaded. Refresh to try again.",
    );
  }
  return Object.freeze({
    roles: Object.freeze(
      data.roles.map((r) => Object.freeze({ role: r.role, scope: r.scope })),
    ),
    capabilities: Object.freeze(
      data.capabilities.map((c) =>
        Object.freeze({ permission: c.permission, scope: c.scope }),
      ),
    ),
  });
}
export function createAccessState(load) {
  let snapshot = null,
    pending = null,
    generation = 0;
  const listeners = new Set();
  function publish(value) {
    snapshot = value;
    for (const listener of listeners) listener(value);
  }
  function refresh() {
    if (pending) return pending;
    const requestGeneration = ++generation;
    publish(null);
    let request;
    try {
      request = load();
    } catch (error) {
      request = Promise.reject(error);
    }
    const operation = Promise.resolve(request)
      .then((result) => {
        const next = parseAccess(result?.data);
        if (requestGeneration === generation) {
          publish(next);
          return next;
        }
        return null;
      })
      .catch((error) => {
        if (requestGeneration === generation) publish(null);
        throw error;
      })
      .finally(() => {
        if (pending === operation) pending = null;
      });
    pending = operation;
    return operation;
  }
  return {
    current: () => snapshot,
    refresh,
    clear() {
      generation++;
      pending = null;
      publish(null);
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
  };
}
