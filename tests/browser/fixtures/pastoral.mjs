import { mocked, ID } from "./api.mjs";
export const PASTOR = "88888888-8888-4888-8888-888888888888";
export const SLOT = "99999999-9999-4999-8999-999999999999";
export const BOOKING = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export async function pastoralMock(page, { pastor = false, listed = true } = {}) {
  await mocked(page, { signedIn: true });
  const calls = [];
  const person = {
    id: PASTOR,
    firstName: "Joy",
    lastName: "Pastor",
    bio: "Prayer appointments",
    timeZone: "Africa/Lagos",
    listed,
  };
  const slot = {
    id: SLOT,
    pastorId: PASTOR,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 88200000).toISOString(),
    timeZone: "Africa/Lagos",
    available: true,
  };
  let bookings = pastor
    ? [
        {
          id: BOOKING,
          slotId: SLOT,
          pastorId: PASTOR,
          memberId: ID,
          pastorFirstName: "Joy",
          pastorLastName: "Pastor",
          memberFirstName: "Grace",
          memberLastName: "Member",
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          timeZone: slot.timeZone,
          status: "pending",
          version: 1,
        },
      ]
    : [];
  const handler = async (route) => {
    const r = route.request(),
      u = new URL(r.url());
    let body;
    try {
      body = r.postDataJSON();
    } catch {}
    calls.push({ path: u.pathname, method: r.method(), body });
    const ok = (data) => route.fulfill({ json: { data } });
    const list = (data) =>
      route.fulfill({ json: { data, meta: { nextCursor: "" } } });
    if (u.pathname === "/api/v1/pastors") return list([person]);
    if (u.pathname === "/api/v1/pastors/" + PASTOR + "/availability")
      return list(
        bookings.some((b) => ["pending", "approved"].includes(b.status))
          ? []
          : [slot],
      );
    if (u.pathname === "/api/v1/me/pastoral/profile")
      return pastor
        ? ok(person)
        : route.fulfill({
            status: 404,
            json: {
              error: { code: "pastoral_not_found", message: "Not found." },
            },
          });
    if (u.pathname === "/api/v1/me/pastoral/availability") {
      if (r.method() === "POST")
        return route.fulfill({
          status: 201,
          json: { data: { ...slot, ...body } },
        });
      return list([slot]);
    }
    if (
      u.pathname === "/api/v1/me/pastoral/bookings" ||
      u.pathname === "/api/v1/me/pastor-bookings"
    )
      return list(bookings);
    if (u.pathname === "/api/v1/pastor-bookings" && r.method() === "POST") {
      const b = {
        id: BOOKING,
        slotId: SLOT,
        pastorId: PASTOR,
        memberId: ID,
        pastorFirstName: "Joy",
        pastorLastName: "Pastor",
        memberFirstName: "Grace",
        memberLastName: "Member",
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        timeZone: slot.timeZone,
        status: "pending",
        version: 1,
      };
      bookings = [b];
      return route.fulfill({ status: 201, json: { data: b } });
    }
    if (u.pathname.endsWith("/" + BOOKING)) {
      bookings = bookings.map((b) => ({
        ...b,
        status: r.method() === "DELETE" ? "cancelled" : body.status,
        version: b.version + 1,
      }));
      return ok(bookings[0]);
    }
    return route.fulfill({
      status: 404,
      json: { error: { message: "Not found." } },
    });
  };
  for (const pattern of [
    "**/api/v1/pastors**",
    "**/api/v1/pastor-bookings**",
    "**/api/v1/me/pastoral/**",
    "**/api/v1/me/pastor-bookings**",
  ])
    await page.route(pattern, handler);
  return { calls };
}
