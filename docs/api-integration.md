# Connected preview handoff

Set the frontend hosting environment variable:

```dotenv
API_URL=https://city4christ-staging-api.onrender.com
MEDIA_ORIGIN=https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com
```

Use Node.js 22+, build command `npm ci && npm run build`, and publish directory
`dist`. API_URL is a public origin without `/api/v1`, not a secret. Changing it
requires rebuilding. Never put provider secrets, database credentials or tokens in
the frontend environment. MEDIA_ORIGIN is the public R2 endpoint used by signed
media URLs and must match the bucket selected for the API. For local builds copy
`.env.example` to `.env`.

The canonical app is the repository root. Older duplicate app folders are excluded
from the build. Browser setup is documented in [browser-testing.md](browser-testing.md).

## Pages and features

| Page            | Connected actions                                                                        |
| --------------- | ---------------------------------------------------------------------------------------- |
| `auth.html`     | Register, verify OTP, resend OTP, password/Google sign-in, logout                        |
| `profile.html`  | Own profile, names, directory visibility, session check, explicit Google linking, logout |
| `settings.html` | Profile/privacy controls, local theme, API health                                        |
| `word.html`     | Published sermon search, filters, pagination and detail                                  |
| `members.html`  | Authenticated opt-in directory search and pagination; names and IDs only                 |
| `staff.html`    | Sermon create/load/edit/publish/unpublish/schedule; role read/grant/revoke with reason   |
| `/#/events`     | Published church event calendar, guest-count RSVP/cancellation, event management by capability |
| `/#/prayer`     | Community, active-group and owner-only prayer requests; anonymity and acknowledgements |
| `/#/chat`       | Participant-only direct conversations, directory lookup, durable messages and read receipts |

The backend checks current permissions on every protected request. Staff screens
do not confer access. Access administrators cannot appoint themselves; ministry
scope IDs must already exist. Stale sermon versions require reloading the editor.
Failed mutations are not blindly retried.

The React home, prayer wall, church events and direct messaging now use the API. Bookings, giving and live screens remain previews with inactive controls.

## Code organization

- `js/api.js`: transport, in-memory access token and session handling.
- `js/connected.js`: page dispatch, shared navigation and logout notification.
- `js/pages/`: separate auth, profile, sermon, member and staff controllers.
- `js/components/`: shared pagination and role appointment controls.
- `js/ui.js`: safe DOM, errors and form helpers.
- `scripts/`: build and local preview server.
- `tests/`: unit tests and separate browser scenarios.

Access tokens stay in memory and protected requests use Authorization. Refresh
cookies remain Secure and HttpOnly. Cookie-changing operations run in order and
use Web Locks across tabs when supported. API and authenticated responses are
excluded from service-worker caching.

## Google and release prerequisites

Google's callback remains the backend
`https://city4christ-staging-api.onrender.com/api/v1/auth/google/callback`.
The frontend supplies an allowed HTTPS `auth.html` return URL. The backend binds
it to state/nonce/PKCE and returns there after setting a refresh cookie, without
putting access credentials in URLs. The frontend obtains access through refresh.
An existing password account requires explicit linking from a freshly signed-in
profile; matching email never silently links it.

Allow the frontend's exact HTTPS origin in backend CORS. Cross-site refresh depends
on the browser accepting the backend cookie; third-party-cookie restrictions can
prevent it. Related frontend/API custom domains are preferable for a lasting setup.

Release the backend directory and Google browser-return migrations before the
updated frontend. These changes remain local until explicitly pushed and deployed.
Review the two repositories separately.

## Password recovery

The sign-in page includes Forgot password and an emailed-link reset form. Requests use `POST /api/v1/auth/password/forgot` with `{email, returnTo}` and `POST /api/v1/auth/password/reset` with `{token, password}`. The existing `API_URL` is sufficient; no additional frontend environment variable is needed. The API must allowlist this frontend HTTPS origin. Links expire in 15 minutes and are single-use. The token travels in the URL fragment and is removed from the current history entry on initialization, then retained only in memory. Reopen the email link after a page reload. A reset revokes all sessions and asks the user to sign in again. Google-only accounts continue using Google. Release the backend migration and updated email worker before this frontend.

## Current permissions

`GET /api/v1/me/access` returns the authenticated caller’s `{roles, capabilities}` with exact scopes. It requires a Bearer token and has no query parameters. The preview keeps this display state in memory, refreshes it on page entry/focus or Refresh permissions, and hides staff controls when access is unavailable. An editor sees publishing; an access administrator sees role appointments. A scoped leader receives no global publishing/delegation tools. Every protected API operation still authorizes independently. Release the backend endpoint before this frontend. No additional environment variable is required.

## React interface integration

The responsive React interface is the root entry point (`/#/login`). It shares
`js/api.js` with the existing connected pages: tokens stay in memory, protected
requests use Authorization, and refresh/logout use the backend's HttpOnly cookie.
There is still only one public hosting variable, `API_URL`. `npm run build` now
builds the React bundle and preserves all connected HTML pages in `dist/`.
The CSP uses the configured API origin instead of a hardcoded staging hostname.

Connected React routes:

- `/#/signup` → `/#/verify`: real registration, eight-digit OTP and resend.
- `/#/login`: password login and Google login through the existing callback page.
- `/#/forgot-password`: recovery email; reset links still use `auth.html`.
- `/#/home` and `/#/profile`: restored sessions, actual member identity, profile
  changes, directory opt-in and confirmed logout.
- `/#/word`: public sermon listing, search, pagination and detail.

Profile links retain the existing account-security, member-directory and staff
workflows. Google callbacks return to the already allowed `auth.html`; its signed-in
panel links back to the React home. No additional Google redirect URI is needed.
Staff navigation is shown according to current capabilities; backend authorization
remains authoritative for every request.

Groups, prayer and events retain their visual designs behind an explicit sample
content notice and an inert container. They cannot submit private information,
claim a successful RSVP, publish a prayer or join a ministry. Onboarding does not
send requests to a nonexistent endpoint. These workflows await their domain slices.

The original React integration (PR4) did not include fresh authentication/MFA and
needed no backend change. The subsequent protected church-appointment feature below
now integrates those security controls and requires backend1.10/migration17 first.

Development uses Node 22 and `npm run dev` (Vite); `.env`/hosting `API_URL` works
for both development and production builds. Backend CORS must allow the exact
frontend origin. Cross-site cookie restrictions and real Google acceptance remain
browser/provider checks; automated tests do not claim Safari or live-provider coverage.

## Protected church appointments (feature branch)

The React profile retains its Staff tools link to the connected `staff.html` page.
Church appointments use a separate section from legacy editor appointments:

- `roles.read` exposes bounded authorized name/email candidate lookup and church-role reads.
- `roles.privileged.manage` exposes Super Admin, Assistant Pastor, Staff and Finance Officer appointments.
- `roles.operational.manage` exposes registered-ministry leader appointments only.

The candidate endpoint is `GET /api/v1/admin/role-candidates?query=...&limit=20&cursor=...`. Search requires 3–100 trimmed characters. Selected account IDs are used with `/api/v1/admin/accounts/{id}/church-roles` and its `/revoke` action. Mutation bodies contain `{role,scope,reason}`. Privileged target appointments require confirmed MFA. Browser restrictions are display assistance; the API independently authorizes every request. No bootstrap or self-grant exists. A Super Admin may explicitly revoke their own Super Admin appointment only when the server confirms another active Super Admin remains.

Writes require both fresh primary identity and authenticator confirmation. A `reauthentication_required` or `mfa_required` response asks the user to complete security confirmation and explicitly review/resubmit; the original action is never automatically replayed. Candidate query changes, access invalidation and page exit clear selected private data. Passwords, authenticator seeds and backup codes remain outside browser storage.

Deploy the backend church-role contract before releasing this frontend. `API_URL` remains the only frontend environment setting. This feature documentation is not evidence of a staging deployment or privileged appointment.

## Connected member features

- Events use public published church-wide reads and verified member RSVP. Each
  account has one RSVP with 1–10 attendees; capacity is checked transactionally.
  Event managers need `events.manage`. The React calendar supports registration,
  cancellation and event drafting/publication. Group events and calendar export
  remain future work.
- Prayer requests support church community, active group and owner-only visibility.
  Anonymous requests hide the author from other members; only owners may mark
  their request answered or archived. Moderation, expiry, comments, uploads and
  notifications remain future work.
- Direct messages are one-to-one and visible only to their participants. Any
  verified member can start a chat using the existing opt-in directory. There is
  no staff backdoor; group chats and realtime delivery remain future work.

The React notification bell links to `/#/notifications`. The inbox and unread badge use the same public `API_URL`; no additional frontend environment variable is needed. Notices are private to the signed-in account. Email, SMS, push, broadcasts and domain-event generation are separate follow-up work.
