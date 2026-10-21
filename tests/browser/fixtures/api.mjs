export const ID = "11111111-1111-4111-8111-111111111111",
  SERMON = "22222222-2222-4222-8222-222222222222",
  GROUP = "33333333-3333-4333-8333-333333333333",
  OTHER_GROUP = "55555555-5555-4555-8555-555555555555",
  LEADERSHIP_GROUP = "66666666-6666-4666-8666-666666666666";
export const STAFF_ACCESS = {
  roles: [
    { role: "content_editor", scope: "" },
    { role: "access_administrator", scope: "" },
  ],
  capabilities: [
    { permission: "sermons.manage", scope: "" },
    { permission: "roles.manage", scope: "" },
  ],
};
export async function mocked(
  page,
  { signedIn = false, access = { roles: [], capabilities: [] } } = {},
) {
  let assignedAccess = access;
  const calls = [];
  let profile = {
    id: ID,
    email: "tester@example.invalid",
    firstName: "Grace",
    lastName: "Member",
    directoryVisible: false,
    emailVerified: true,
    hasPassword: true,
  };
  let authenticated = signedIn;
  let sermon = {
    id: SERMON,
    title: "Living in Faith",
    summary: "A published message",
    speaker: "Pastor Joy",
    series: "Faith",
    topic: "Trust",
    preachedAt: "2026-10-17T12:00:00Z",
    videoUrl: "",
    publishedAt: null,
    status: "draft",
    version: 1,
  };
  let group = {
    id: GROUP,
    name: "Choir",
    description: "Sunday worship team",
    audience: "church",
    joinPolicy: "approval",
    membershipStatus: "",
    memberCount: 1,
    createdAt: "2026-10-17T12:00:00Z",
  };
  const otherGroup = {
    id: OTHER_GROUP,
    name: "Prayer Team",
    description: "Serve the church in prayer",
    audience: "church",
    joinPolicy: "approval",
    membershipStatus: "",
    memberCount: 4,
    createdAt: "2026-10-18T12:00:00Z",
  };
  const leadershipGroup = {
    id: LEADERSHIP_GROUP,
    name: "Leadership Council",
    description: "Coordination for church leaders",
    audience: "leadership",
    joinPolicy: "closed",
    membershipStatus: "",
    memberCount: 3,
    createdAt: "2026-10-19T12:00:00Z",
  };
  let pendingRequests = [
    {
      accountId: ID,
      firstName: "Grace",
      lastName: "Member",
      requestedAt: "2026-10-18T12:00:00Z",
    },
  ];
  let groupMembers = [];
  await page.route("**/js/config.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "globalThis.City4ChristConfig={API_URL:'/'};",
    }),
  );
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      u = new URL(request.url()),
      path = u.pathname,
      method = request.method();
    let body;
    try {
      body = request.postDataJSON();
    } catch {}
    calls.push({
      path,
      method,
      body,
      headers: request.headers(),
      query: u.searchParams,
    });
    const ok = (data) =>
      route.fulfill({
        json: { data },
        headers: { "Cache-Control": "no-store" },
      });
    const error = (status, code, message, fields = {}) =>
      route.fulfill({
        status,
        json: {
          error: { code, message, fields, requestId: "preview-request" },
        },
      });
    if (path.endsWith("/auth/refresh"))
      return authenticated
        ? ok({ accessToken: "private-browser-token", expiresIn: 600 })
        : error(401, "invalid_session", "Sign in again.");
    if (path.endsWith("/auth/register"))
      return ok({ id: ID, email: body.email });
    if (path.endsWith("/auth/verification/verify"))
      return ok({ status: "email_verified" });
    if (path.endsWith("/auth/verification/resend"))
      return route.fulfill({
        status: 202,
        json: { data: { message: "If needed, email will be sent." } },
      });
    if (path.endsWith("/auth/login")) {
      authenticated = true;
      return ok({ accessToken: "private-browser-token", expiresIn: 600 });
    }
    if (path.endsWith("/auth/logout")) {
      authenticated = false;
      return ok({ status: "logged_out" });
    }
    if (path === "/api/v1/auth/mfa")
      return ok({
        enabled: false,
        pending: false,
        freshUntil: null,
        recoveryCodesRemaining: 0,
      });
    if (path === "/api/v1/auth/reauthentication")
      return ok({
        fresh: true,
        freshUntil: new Date(Date.now() + 300000).toISOString(),
        passwordAvailable: true,
        googleAvailable: false,
      });
    if (path.endsWith("/auth/google/link"))
      return ok({ url: "https://accounts.google.com/auth?state=test-state" });
    if (path === "/api/v1/me/access")
      return authenticated
        ? ok(assignedAccess)
        : error(401, "invalid_session", "Sign in again.");
    if (path === "/api/v1/groups") {
      const leadershipEligible = (assignedAccess.roles || []).some((item) => ["super_administrator", "assistant_pastor", "ministry_leader"].includes(item.role));
      const visibleGroups = [group, otherGroup, ...(leadershipEligible ? [leadershipGroup] : [])];
      return authenticated ? route.fulfill({ json: { data: visibleGroups, meta: { nextCursor: "" } } }) : error(401, "invalid_session", "Sign in again.");
    }
    if (path === `/api/v1/groups/${GROUP}/membership` && method === "POST") {
      group = { ...group, membershipStatus: "pending" };
      return ok({ groupId: GROUP, accountId: ID, status: "pending", requestedAt: new Date().toISOString() });
    }
    if (path === `/api/v1/groups/${GROUP}/membership` && method === "DELETE") {
      group = { ...group, membershipStatus: "left" };
      return ok({ status: "left" });
    }
    if (path === `/api/v1/groups/${GROUP}/membership-requests`)
      return authenticated ? ok(pendingRequests) : error(401, "invalid_session", "Sign in again.");
    if (path === `/api/v1/groups/${GROUP}/membership-requests/${ID}` && method === "PATCH") {
      const approved = body?.decision === "approve";
      pendingRequests = [];
      if (approved) {
        groupMembers = [...groupMembers, { accountId: ID, firstName: "Grace", lastName: "Member" }];
        group = { ...group, memberCount: group.memberCount + 1 };
      }
      return ok({ changed: true });
    }
    if (path === `/api/v1/groups/${GROUP}/members`)
      return authenticated ? ok(groupMembers) : error(401, "invalid_session", "Sign in again.");
    if (
      path.startsWith("/api/v1/admin/sermons") &&
      !assignedAccess.capabilities.some(
        (c) => c.permission === "sermons.manage" && c.scope === "",
      )
    )
      return error(403, "forbidden", "Publishing permission is required.");
    if (
      path.startsWith("/api/v1/admin/accounts/") &&
      !assignedAccess.capabilities.some(
        (c) => c.permission === "roles.manage" && c.scope === "",
      )
    )
      return error(
        403,
        "forbidden",
        "Access management permission is required.",
      );
    if (path === "/api/v1/me") {
      if (!authenticated)
        return error(401, "invalid_session", "Sign in again.");
      if (method === "PATCH") profile = { ...profile, ...body };
      return ok(profile);
    }
    if (path === "/api/v1/members")
      return route.fulfill({
        json: {
          data: profile.directoryVisible
            ? [
                {
                  id: ID,
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                },
              ]
            : [],
          meta: { nextCursor: "" },
        },
      });
    if (path === "/api/v1/sermons")
      return route.fulfill({
        json: {
          data: [
            {
              ...sermon,
              title: "<img src=x onerror=alert(1)>",
              publishedAt: "2026-10-17T12:00:00Z",
            },
          ],
          meta: { nextCursor: "" },
        },
      });
    if (path === "/api/v1/sermons/" + SERMON)
      return ok({ ...sermon, status: "published" });
    if (path === "/api/v1/admin/sermons" && method === "POST") {
      sermon = { ...sermon, ...body };
      return route.fulfill({ status: 201, json: { data: sermon } });
    }
    if (path === "/api/v1/admin/sermons/" + SERMON) {
      if (method === "PATCH")
        sermon = { ...sermon, ...body, version: sermon.version + 1 };
      return ok(sermon);
    }
    if (path.includes("/admin/accounts/"))
      return method === "GET"
        ? ok([{ role: "content_editor", scope: "" }])
        : ok({ changed: true });
    return error(404, "not_found", "Not found.");
  });
  return {
    calls,
    getProfile: () => profile,
    setAccess: (value) => {
      assignedAccess = value;
    },
  };
}
