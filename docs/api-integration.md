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
| `/#/chat`       | Participant-only direct conversations, eligible group chats, durable history, read receipts and realtime updates |

The backend checks current permissions on every protected request. Staff screens
do not confer access. Access administrators cannot appoint themselves; ministry
scope IDs must already exist. Stale sermon versions require reloading the editor.
Failed mutations are not blindly retried.

The React home, prayer wall, church events, groups and messaging now use the API. Bookings, giving and live screens remain previews with inactive controls.

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

Groups, prayer and events use their implemented API flows. Onboarding does not
send requests to a nonexistent endpoint and remains a separate domain slice.

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
  no staff backdoor. Group chats are restricted by current group eligibility;
  direct and group chat use realtime message notifications with REST history for
  durable catch-up.

### Realtime messaging

The React chat requests `POST /api/v1/realtime/tickets` with the active Bearer
session, then opens `wss://<API_URL>/api/v1/realtime`. It sends the opaque,
single-use ticket in the first JSON WebSocket frame; the ticket is never placed
in a URL. The client fetches a new ticket for each connection and uses bounded
automatic reconnects. After every connection and message event it refreshes the
relevant REST conversation list/history, merging messages by ID and sequence.
WebSocket events contain message metadata only, so REST remains the source of
message content and reconnect recovery. Logging out or losing the session closes
the client connection. `API_URL` remains the only required frontend environment
variable; the backend must allow the frontend's exact origin and have realtime
transport enabled before release. This frontend change is local and is not yet
deployed to the preview.

The React notification bell links to `/#/notifications`. The inbox and unread badge use the same public `API_URL`; no additional frontend environment variable is needed. Notices are private to the signed-in account. Email, SMS, push, broadcasts and domain-event generation are separate follow-up work.

The React church feed reads `GET /api/v1/posts`, supports scanned media,
per-member Amen reactions, and paginated comments at
`GET /api/v1/posts/{postId}/comments`. Verified members add comments with
`POST /api/v1/posts/{postId}/comments` and can delete only their own comments
with `DELETE /api/v1/posts/{postId}/comments/{commentId}`. Comments are visible
church-wide to signed-in members; leaders’ moderation actions remain a separate
backend slice.

## React Google sign-in and linking

The main React login uses `/oauth/auth.html` as its frontend return page. Linking
starts directly from the React profile and uses `/account/auth.html`. Both pages
load the same React bundle and restore access through the HttpOnly refresh cookie;
there is no token in the redirect URL. Only known error codes are forwarded into
React routing. Existing `auth.html` and `profile.html` remain advanced test-console
pages for recovery, MFA and staff workflows; normal React Google flows no longer
navigate through them.

An existing local account must sign in and explicitly choose **Link Google** on
its profile. Expired confirmation can be renewed with the current password in the
same React page. Google-only accounts use Google confirmation; accounts requiring
MFA must confirm an authenticator code. These controls never bypass backend checks.

The registered Google OAuth redirect URI remains the backend
`/api/v1/auth/google/callback`; no Google Console change is needed for these frontend
return pages. Deploy the frontend build to make this routing fix available live.
The UI regression is part of frontend CI. The optional backend browser harness
also runs `google-real.spec.mjs` with synthetic Google identities and disposable
PostgreSQL; actual Google consent/account access still needs private live acceptance.

Local verification for this fix: 38 frontend unit tests and the build passed;
10 Google UI browser cases passed across desktop/mobile; 20 existing React/preview
browser cases passed; four real Go/PostgreSQL Google workflows passed using the
synthetic provider. The initial missing-link/wrong-interface cases were reproduced
as failing tests before implementation. No real Google account was linked by these
checks. Actual provider consent remains a live release acceptance step.
