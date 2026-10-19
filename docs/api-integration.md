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
