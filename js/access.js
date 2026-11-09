// This is display state only. Protected API actions authorize in PostgreSQL.
const validIdentifier = (value) => typeof value === "string" && value.length > 0 && value.length <= 200 && value.trim() === value;
const validScope = (value) => typeof value === "string" && value.length <= 200 && value.trim() === value;
function validCapability({ permission, scope } = {}) {
  return validIdentifier(permission) && validScope(scope);
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
export function parseAccess(data) {
  if (
    !Array.isArray(data?.roles) ||
    !Array.isArray(data?.capabilities) ||
    !data.roles.every(
      (r) =>
        r && validIdentifier(r.role) && validScope(r.scope),
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
