// Access credentials stay in this module's memory; refresh credentials are HttpOnly cookies.
export class APIError extends Error {
  constructor(
    message,
    { status = 0, code = "network_error", fields = {}, requestId = "" } = {},
  ) {
    super(message);
    this.name = "APIError";
    Object.assign(this, { status, code, fields, requestId });
  }
}
export function validateAPIURL(raw, origin = globalThis.location?.origin) {
  if (!raw || typeof raw !== "string")
    throw new Error("API_URL must be configured.");
  const u = new URL(raw === "/" ? origin : raw);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (
    (u.protocol !== "https:" && !(u.protocol === "http:" && local)) ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== "/"
  )
    throw new Error(
      "API_URL must be an HTTPS origin without credentials, path, query or fragment.",
    );
  return u.origin;
}
export function createClient({
  apiURL,
  origin = globalThis.location?.origin,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  locks = globalThis.navigator?.locks,
  now = Date.now,
} = {}) {
  const base = validateAPIURL(apiURL, origin);
  let access = "",
    expires = 0,
    refreshing = null,
    sessionQueue = Promise.resolve();
  // Cookie-changing operations must finish in order, including across tabs.
  function sessionOperation(operation) {
    const run = () =>
      locks?.request
        ? locks.request("city4christ-session-refresh", operation)
        : operation();
    const result = sessionQueue.then(run, run);
    sessionQueue = result.catch(() => {});
    return result;
  }
  const clear = () => {
    access = "";
    expires = 0;
  };
  const accept = (result) => {
    const data = result?.data;
    if (
      typeof data?.accessToken !== "string" ||
      !Number.isFinite(data.expiresIn) ||
      data.expiresIn <= 0
    )
      throw new APIError("The sign-in response was incomplete.", {
        code: "invalid_response",
      });
    access = data.accessToken;
    expires = now() + data.expiresIn * 1000;
    return result;
  };
  async function send(
    path,
    { method = "GET", body, signal, authorized = false } = {},
  ) {
    if (
      typeof path !== "string" ||
      (!path.startsWith("/api/v1/") && !path.startsWith("/health/")) ||
      path.includes("://") ||
      path.startsWith("//")
    )
      throw new APIError("Invalid API path.", { code: "invalid_path" });
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (authorized && access) headers.Authorization = `Bearer ${access}`;
    let response;
    try {
      response = await fetchImpl(base + path, {
        method,
        headers,
        credentials: "include",
        cache: "no-store",
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: signal ?? globalThis.AbortSignal?.timeout?.(90000),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new APIError(
        "Could not reach the service. Check your connection and try again.",
      );
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new APIError("The service returned an unreadable response.", {
        status: response.status,
        code: "invalid_response",
      });
    }
    if (!response.ok)
      throw new APIError(
        result.error?.message || "The request could not be completed.",
        {
          status: response.status,
          code: result.error?.code || "request_failed",
          fields: result.error?.fields || {},
          requestId: result.error?.requestId || "",
        },
      );
    return result;
  }
  function refresh() {
    if (refreshing) return refreshing;
    const operation = async () => {
      try {
        return accept(await send("/api/v1/auth/refresh", { method: "POST" }));
      } catch (error) {
        if (error.status === 401) clear();
        throw error;
      }
    };
    refreshing = sessionOperation(operation).finally(() => {
      refreshing = null;
    });
    return refreshing;
  }
  async function request(path, options = {}) {
    if (options.public) return send(path, options);
    if (!access || expires <= now() + 15000) await refresh();
    try {
      return await send(path, { ...options, authorized: true });
    } catch (error) {
      if (error.status !== 401) throw error;
      await refresh();
      return send(path, { ...options, authorized: true });
    }
  }
  return {
    baseURL: base,
    request,
    refresh,
    isSignedIn: () => Boolean(access),
    login: (email, password) =>
      sessionOperation(async () =>
        accept(
          await send("/api/v1/auth/login", {
            method: "POST",
            body: { email, password },
          }),
        ),
      ),
    register: (body) => send("/api/v1/auth/register", { method: "POST", body }),
    verify: (email, code) =>
      send("/api/v1/auth/verification/verify", {
        method: "POST",
        body: { email, code },
      }),
    resend: (email) =>
      send("/api/v1/auth/verification/resend", {
        method: "POST",
        body: { email },
      }),
    forgotPassword: (email, returnTo) =>
      send("/api/v1/auth/password/forgot", {
        method: "POST",
        body: { email, returnTo },
      }),
    resetPassword: (token, password) =>
      sessionOperation(async () => {
        const result = await send("/api/v1/auth/password/reset", {
          method: "POST",
          body: { token, password },
        });
        clear();
        return result;
      }),
    me: () => request("/api/v1/me"),
    updateProfile: (body) => request("/api/v1/me", { method: "PATCH", body }),
    logout: () =>
      sessionOperation(async () => {
        const result = await send("/api/v1/auth/logout", { method: "POST" });
        clear();
        return result;
      }),
    googleStartURL: (returnTo) =>
      base +
      "/api/v1/auth/google/start?" +
      new URLSearchParams({ returnTo, redirect: "1" }),
    beginGoogleLink: async (returnTo) =>
      request("/api/v1/auth/google/link?" + new URLSearchParams({ returnTo }), {
        method: "POST",
        body: {},
      }),
  };
}
