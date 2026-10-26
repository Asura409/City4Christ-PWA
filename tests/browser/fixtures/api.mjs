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
  { signedIn = false, access = { roles: [], capabilities: [] }, activeGroupMembership = false } = {},
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
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    imageUrl: "https://images.unsplash.com/photo-1770097286875-0cbf4ca2f8c1?auto=format&fit=crop&w=1200&q=80",
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
  if (activeGroupMembership) group = { ...group, membershipStatus: "active" };
  let prayers = [{
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    body: "Please pray for peace in our community.",
    visibility: "community",
    anonymous: true,
    status: "open",
    author: "Anonymous",
    isOwner: false,
    createdAt: "2026-10-22T12:00:00Z",
    expiresAt: "2027-04-20T12:00:00Z",
    prayerCount: 2,
    hasPrayed: false,
  }];
  let managedGroups = [];
  let appointedLeaders = [];
  const roleCandidate = {
    id: "77777777-7777-4777-8777-777777777777",
    firstName: "Joy",
    lastName: "Leader",
    email: "joy.leader@example.invalid",
    mfaEnabled: true,
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
  managedGroups = [group, otherGroup, leadershipGroup];
  let pendingRequests = [
    {
      accountId: ID,
      firstName: "Grace",
      lastName: "Member",
      requestedAt: "2026-10-18T12:00:00Z",
    },
  ];
  let groupMembers = [];
  let notifications = [];
  let posts = [{
    id: "99999999-9999-4999-8999-999999999999",
    authorId: ID,
    firstName: "Grace",
    lastName: "Member",
    body: "Welcome to church this Sunday.",
    createdAt: "2026-10-20T10:00:00Z",
    amenCount: 0,
    reacted: false,
    commentCount: 0,
  }];
  let postComments = [];
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
    if (path === "/api/v1/notifications/unread-count") {
      if (!authenticated) return error(401, "invalid_session", "Sign in again.");
      return ok({ unreadCount: notifications.filter((item) => !item.readAt).length });
    }
    if (path === "/api/v1/notifications" && method === "GET") {
      if (!authenticated) return error(401, "invalid_session", "Sign in again.");
      return route.fulfill({ json: { data: notifications, meta: { nextCursor: "" } } });
    }
    const notificationRead = path.match(/^\/api\/v1\/notifications\/([^/]+)\/read$/);
    if (notificationRead && method === "PUT") {
      if (!authenticated) return error(401, "invalid_session", "Sign in again.");
      const item = notifications.find((entry) => entry.id === notificationRead[1]);
      if (!item) return error(404, "notification_not_found", "Notification not found.");
      const changed = !item.readAt;
      item.readAt = item.readAt || new Date().toISOString();
      return ok({ changed });
    }
    if (path === "/api/v1/posts") {
      if (!authenticated) return error(401, "invalid_session", "Sign in again.");
      if (method === "POST") {
        const created = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", authorId: ID, firstName: profile.firstName, lastName: profile.lastName, body: body.body, attachments: body.attachmentIds?.map((id) => ({ id, contentType: "image/png", size: 16, url: "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/available/photo.png?signature=fixture", expiresAt: new Date(Date.now() + 60000).toISOString() })) || [], amenCount: 0, reacted: false, commentCount: 0, createdAt: new Date().toISOString() };
        posts = [created, ...posts];
        return route.fulfill({ status: 201, json: { data: created } });
      }
      return route.fulfill({ json: { data: posts, meta: { nextCursor: "" } } });
    }
    const commentRoute = path.match(/^\/api\/v1\/posts\/([^/]+)\/comments(?:\/([^/]+))?$/);
    if (commentRoute) {
      if (!authenticated) return error(401, "invalid_session", "Sign in again.");
      const post = posts.find((item) => item.id === commentRoute[1]);
      if (!post) return error(404, "comment_not_found", "Post or comment not found.");
      if (method === "GET") return route.fulfill({ json: { data: postComments.filter((item) => item.postId === post.id), meta: { nextCursor: "" } } });
      if (method === "POST") {
        const created = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", postId: post.id, authorId: profile.id, firstName: profile.firstName, lastName: profile.lastName, body: body.body, createdAt: new Date().toISOString() };
        postComments.unshift(created);
        post.commentCount = postComments.filter((item) => item.postId === post.id).length;
        return route.fulfill({ status: 201, json: { data: created } });
      }
      if (method === "DELETE") {
        const index = postComments.findIndex((item) => item.id === commentRoute[2] && item.postId === post.id && item.authorId === profile.id);
        if (index < 0) return error(404, "comment_not_found", "Post or comment not found.");
        postComments.splice(index, 1);
        post.commentCount = postComments.filter((item) => item.postId === post.id).length;
        return route.fulfill({ status: 204, body: "" });
      }
    }
    const postReaction = path.match(/^\/api\/v1\/posts\/([^/]+)\/reaction$/);
    if (postReaction) {
      if (!authenticated) return error(401, "invalid_session", "Sign in again.");
      const post = posts.find((item) => item.id === postReaction[1]);
      if (!post) return error(404, "post_not_found", "Post not found.");
      const reacted = method === "PUT";
      post.reacted = reacted;
      post.amenCount = Math.max(0, Number(post.amenCount || 0) + (reacted ? 1 : -1));
      return ok({ postId: post.id, amenCount: post.amenCount, reacted });
    }
    if (path === "/api/v1/uploads/presign" && method === "POST")
      return ok({ uploadId: "88888888-8888-4888-8888-888888888888", url: "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/upload?signature=fixture", method: "PUT", headers: { "Content-Type": body.contentType }, expiresAt: new Date(Date.now() + 300000).toISOString() });
    if (path === "/api/v1/uploads/88888888-8888-4888-8888-888888888888/complete")
      return route.fulfill({ status: 202, json: { data: { id: "88888888-8888-4888-8888-888888888888", status: "scan_queued" } } });
    if (path === "/api/v1/uploads/88888888-8888-4888-8888-888888888888")
      return ok({ id: "88888888-8888-4888-8888-888888888888", status: "available" });
    if (path === "/api/v1/prayer/requests") {
      if (!authenticated) return error(401, "invalid_session", "Sign in again.");
      if (method === "POST") {
        const created = {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          body: body.body,
          visibility: body.visibility,
          groupId: body.groupId,
          anonymous: body.anonymous,
          status: "open",
          author: body.anonymous ? "You" : `${profile.firstName} ${profile.lastName}`,
          isOwner: true,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          prayerCount: 0,
          hasPrayed: false,
        };
        prayers = [created, ...prayers];
        return route.fulfill({ status: 201, json: { data: created } });
      }
      const requestedStatus = u.searchParams.get("status") || "open";
      return route.fulfill({
        json: { data: prayers.filter((item) => item.status === requestedStatus), meta: { nextCursor: "" } },
      });
    }
    const prayerAction = path.match(/^\/api\/v1\/prayer\/requests\/([^/]+)(?:\/(prayed))?$/);
    if (prayerAction) {
      if (!authenticated) return error(401, "invalid_session", "Sign in again.");
      const item = prayers.find((request) => request.id === prayerAction[1]);
      if (!item) return error(404, "prayer_not_found", "Prayer request not found.");
      if (method === "PUT" && prayerAction[2] === "prayed") {
        const changed = !item.hasPrayed;
        if (changed) {
          item.hasPrayed = true;
          item.prayerCount++;
        }
        return ok({ changed });
      }
      if (method === "PATCH" && !prayerAction[2]) {
        const changed = item.status !== body.status;
        item.status = body.status;
        return ok({ changed });
      }
      if (method === "GET" && !prayerAction[2]) return ok(item);
    }
    const canManageGroups = () =>
      (assignedAccess.capabilities || []).some(
        (capability) => capability.permission === "groups.manage" && capability.scope === "",
      );
    if (path === "/api/v1/admin/groups") {
      if (!canManageGroups()) return error(403, "forbidden", "You are not authorized to manage groups.");
      if (method === "GET") {
        const includeArchived = u.searchParams.get("includeArchived") === "true";
        const leadershipEligible = (assignedAccess.roles || []).some((item) => ["super_administrator", "assistant_pastor", "ministry_leader"].includes(item.role));
        return ok(managedGroups.filter((item) => (includeArchived || !item.archived) && (item.audience !== "leadership" || leadershipEligible)));
      }
      if (method === "POST") {
        const created = {
          id: "88888888-8888-4888-8888-888888888888",
          name: body.name,
          description: body.description || "",
          audience: body.audience,
          joinPolicy: body.joinPolicy,
          memberCount: 0,
          archived: false,
          createdAt: new Date().toISOString(),
        };
        managedGroups = [...managedGroups, created];
        return route.fulfill({ status: 201, json: { data: created } });
      }
    }
    const lifecycleMatch = path.match(/^\/api\/v1\/admin\/groups\/([^/]+)$/);
    if (lifecycleMatch && method === "PATCH") {
      if (!canManageGroups()) return error(403, "forbidden", "You are not authorized to manage groups.");
      managedGroups = managedGroups.map((item) => item.id === lifecycleMatch[1]
        ? { ...item, archived: body.status === "archived" }
        : item);
      return ok({ changed: true });
    }
    const leadersMatch = path.match(/^\/api\/v1\/admin\/groups\/([^/]+)\/leaders$/);
    if (leadersMatch && method === "GET") {
      if (!canManageGroups()) return error(403, "forbidden", "You are not authorized to manage groups.");
      return ok(appointedLeaders);
    }
    if (path === "/api/v1/admin/role-candidates") {
      if (!(assignedAccess.capabilities || []).some((capability) => capability.permission === "roles.read"))
        return error(403, "forbidden", "Role lookup is not permitted.");
      return route.fulfill({ json: { data: [roleCandidate], meta: { nextCursor: "" } } });
    }
    const churchRoleMatch = path.match(/^\/api\/v1\/admin\/accounts\/([^/]+)\/church-roles(?:\/revoke)?$/);
    if (churchRoleMatch) {
      if (!(assignedAccess.capabilities || []).some((capability) => ["roles.read", "roles.operational.manage"].includes(capability.permission)))
        return error(403, "forbidden", "Church role management is not permitted.");
      if (method === "GET") return ok(appointedLeaders.some((item) => item.accountId === churchRoleMatch[1])
        ? [{ role: "ministry_leader", scope: GROUP }]
        : []);
      if (!(assignedAccess.capabilities || []).some((capability) => capability.permission === "roles.operational.manage"))
        return error(403, "forbidden", "Church role management is not permitted.");
      if (path.endsWith("/revoke")) appointedLeaders = appointedLeaders.filter((item) => item.accountId !== churchRoleMatch[1]);
      else appointedLeaders = [...appointedLeaders, { accountId: churchRoleMatch[1], firstName: roleCandidate.firstName, lastName: roleCandidate.lastName }];
      return ok({ changed: true });
    }
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
        (c) => ["roles.manage", "roles.read"].includes(c.permission) && c.scope === "",
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
    if (path === "/api/v1/sermons/series") return ok([]);
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
      sermon = { ...sermon, ...body, attachments: body.attachmentIds?.map((id) => ({ id, contentType: "image/png", size: 16, url: "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/available/sermon.png?signature=fixture", expiresAt: new Date(Date.now() + 60000).toISOString() })) || [] };
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
