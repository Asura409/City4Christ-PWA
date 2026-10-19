# Vercel setup

1. Import `Asura409/City4Christ-PWA` into Vercel.
2. Use branch `feat/backend-preview-integration` for this integration preview.
   The changes are not on `main` until separately merged. For a project whose
   deployments follow this branch, select it under Settings > Git > Production
   Branch. Vercel's “Production” label does not make the backend a production API.
3. Keep Root Directory at the repository root (`.`), not `frontend/` or one of the
   older duplicate app directories. The frontend is its own repository.
4. Before the first build, add `API_URL` for the Vercel environments you will use:

   ```dotenv
   API_URL=https://city4christ-staging-api.onrender.com
   ```

5. `vercel.json` selects Other as the framework, installs with `npm ci`, builds
   with `npm run build`, and publishes only `dist/`. `package.json` selects Node
   22.x. Keep these defaults rather than adding dashboard build overrides.
6. Deploy when ready, then provide the exact HTTPS URL so its origin can be added
   to the backend's `CORS_ORIGINS`, preserving existing origins. Use a stable
   project URL for beta testing; per-commit preview URLs change and are not
   automatically trusted. Do not allow all `*.vercel.app` origins.

Google's registered callback remains the Render API callback. The backend must
have the directory and Google browser-return changes released before those new
flows are available. The frontend config does not deploy the backend.

`.html` paths are retained for sign-in return URLs. No catch-all SPA rewrite is
used because this app contains separate HTML pages. Service worker and public
API configuration are served with `Cache-Control: no-store` so a new deployment's
configuration can be obtained. These headers do not store API responses on Vercel;
the browser calls the configured API origin directly.

Cross-site refresh depends on third-party cookie support in the browser. Related
frontend/API custom domains remain the preferred lasting setup.

Official reference: [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json).
