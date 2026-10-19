# City4Christ PWA preview

The root app connects to the City4Christ Go API. See the
[frontend handoff](docs/api-integration.md) for supported pages, code organization,
Google/CORS prerequisites and hosting settings, and
[browser testing](docs/browser-testing.md) for local checks.

For Vercel, follow [the Vercel setup guide](docs/vercel.md). The checked-in config
sets the install/build commands and `dist/` output directory.

With Node.js 22 or newer:

```sh
npm ci
cp .env.example .env
npm run build
npm run preview
```

Open the printed local address. The preview server binds only to this machine.
For hosting, set `API_URL=https://city4christ-staging-api.onrender.com`, build with
`npm ci && npm run build`, and publish `dist/`. Never include secrets in API_URL.
The frontend origin must be allowed by the backend's `CORS_ORIGINS` setting.

Older duplicate app directories are excluded from builds. Frontend and backend
remain independent repositories; review, commit and publish them separately.
