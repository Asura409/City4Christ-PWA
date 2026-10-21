# Browser checks

Use Node.js 22 or newer. Run these commands from the frontend repository:

```sh
npm ci
npx playwright install --with-deps chromium
API_URL=/ npm run build
npm test
npm run test:browser
```

The first browser installation downloads official Playwright Chromium builds. On Linux,
`--with-deps` also installs the operating-system libraries needed to launch Chromium
and may request administrator access. Browsers are development tools; they are not
included in the published `dist/` site.

Playwright starts and stops its own loopback-only preview server on port 4173.
The desktop and mobile projects both use Chromium; mobile emulates an iPhone-sized
touch browser and is not a Safari compatibility check.

The current `preview.spec.mjs` scenarios intercept API requests with test responses.
They check registration and verification forms, sign-in/out, profile edits, directory
visibility, sermon browsing and publishing, and explicit role grants. They do not
send emails, contact Google, or change staging data. Passing these checks does not
establish that a deployed backend or real Google login works.

The separate `real-api.spec.mjs` suite runs through the backend harness:

```sh
go test -race -tags frontend_e2e ./internal/app -run TestFrontendWithRealAPI -count=1 -timeout=4m -v
```

Run that command from the backend root after building this frontend. It starts
temporary loopback HTTPS and disposable PostgreSQL, exercising real registration,
OTP, login, refresh rotation, profile/privacy, directory, sermon publication and
logout. Test-only inbox/role fixtures never enter the production binary. This suite
rejects non-loopback targets; no staging data, external email or Google is used.

Inspect a failed test's local trace using the command printed in its failure output.
`test-results/`, `playwright-report/`, downloaded dependencies and build output are
excluded from Git. Traces can contain test request data; use synthetic credentials.

## Frontend hosting configuration

Set this public build environment variable in the frontend hosting service:

```dotenv
API_URL=https://city4christ-staging-api.onrender.com
```

Use build command `npm ci && npm run build` and publish directory `dist`.
The URL is an origin, without `/api/v1`. It is public configuration, not a secret.
Changing it requires a new build. Never put API keys, Google client secrets,
database credentials or access tokens in frontend environment variables.

The backend must allow the frontend's exact HTTPS origin through its CORS
configuration. Cross-site refresh also requires browser acceptance of the backend's
Secure cookie. Google browser-return support and the new directory endpoint must be
released on the backend before those new frontend flows can work against staging.

The React integration adds `react.spec.mjs` for desktop/mobile signup, OTP, login,
profile changes, safe public sermons, recovery, error handling, inert previews and
a stale session response regression. The real API suite also exercises React signup,
OTP, secure refresh-cookie rotation on reload, profile persistence across interfaces,
and logout against disposable PostgreSQL. Run browser suites sequentially so their
preview server and trace output do not conflict.

React integration release verification (21 October 2026): 18 unit/build checks,
32 desktop/mobile browser scenarios, and six real API workflows passed. The latter
ran through the global Go app with race detection and a disposable PostgreSQL
cluster; the harness served this release checkout's exact `dist/`. Failing tests
were observed before the OTP route, stale-session guard, inert preview boundary,
public bundle cache and development API_URL corrections. No staging database was
modified, and no real email or Google-provider acceptance is claimed.
