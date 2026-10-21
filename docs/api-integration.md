# Connected preview handoff

Set the frontend hosting environment variable:

```dotenv
API_URL=https://city4christ-staging-api.onrender.com
```

Use Node.js 22+, build command `npm ci && npm run build`, and publish directory
`dist`. API_URL is a public origin without `/api/v1`, not a secret. Changing it
requires rebuilding. Never put provider secrets, database credentials or tokens in
the frontend environment. For local builds copy `.env.example` to `.env`.

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

The backend checks current permissions on every protected request. Staff screens
do not confer access. Access administrators cannot appoint themselves; ministry
scope IDs must already exist. Stale sermon versions require reloading the editor.
Failed mutations are not blindly retried.

Home, messaging, community, prayer, events, bookings, giving and live screens remain
design previews with notices and inactive save/post controls.

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


## Fresh identity confirmation

The confirmation panel on profile/settings/staff and signed-in auth pages uses
`GET /api/v1/auth/reauthentication`, `POST /api/v1/auth/reauthentication/password`
and `POST /api/v1/auth/reauthentication/google`. All require the existing Bearer
session; POSTs use allowed Origin, JSON and credentials. No new environment variable
is needed. Role mutations return `403 reauthentication_required` when stale;
confirm identity, then deliberately resubmit. Confirmation never grants roles.

Password fields clear after every attempt; incorrect passwords are not retried by
token refresh. Google-only accounts show Google confirmation instead of a local
password form. Google confirmation navigates through the existing callback back
to an allowlisted `auth.html`. The page reads server status; a URL completion marker
is not proof. No application tokens are placed in URLs or browser storage. The
five-minute server deadline survives normal token rotation without extending it.

Release backend OpenAPI 1.8.0/migration 15 before this frontend. Existing sessions
stay signed in but need confirmation before sensitive actions. Real Google
acceptance is still required after an authorized release; MFA/bootstrap and new
church-role appointments are separate work.


## Authenticator protection

Profile/settings/staff/signed-in auth pages expose optional TOTP protection for
sensitive actions. Use GET `/api/v1/auth/mfa` for private status and POST
`/api/v1/auth/mfa/{enroll,confirm,verify,recovery,recovery/regenerate,disable}` with
Bearer credentials, JSON and allowed Origin. Primary authentication must be fresh.
Once enrolled, role changes and Google linking return `403 mfa_required` until this
session verifies a code. Ordinary first-factor login is not made into a two-stage
login flow in this slice. Google-only users can confirm with Google, then TOTP.

Keep setup keys/URIs/QR and the once-displayed recovery codes private. No browser
storage, URL parameters or external QR services are used. Recovery/regeneration
clear other MFA proofs; disabling requires fresh primary plus MFA. A failed code
is not retried automatically. Explicitly resubmit the intended sensitive action.

Release backend OpenAPI 1.9.0/migration 16 before this frontend. `API_URL` remains
the only hosting variable; no new frontend secret or variable is introduced.
