# wotlwedu-browser

Desktop-first browser frontend for `wotlwedu-backend`.

Current version: `0.1.36`

## Features
- Modern responsive UI optimized for desktop workflows (not mobile-first).
- JWT-authenticated login against `/login`.
- Google sign-in against `/login/google`.
- Invite-aware Google join flow via `/login?invite=...`.
- Organization-admin invitation management with resend, revoke, and invite history.
- Linked sign-in method visibility plus unlink controls for removable social identities.
- Account activity and organization audit feeds for support/admin review.
- Dedicated `Support` console for scoped auth/invite observability, paginated audit export, public-poll abuse moderation, recipient suppression, recent failures, and targeted user investigation.
- Dedicated `Backup` console for whole-system, organization, and space-scoped JSON export/restore operations.
- Tenant-aware organization/space scope controls, explicit global-mode confirmation, and server-backed searchable pickers for large admin datasets.
- Tenant-aware administration screens for:
  - organizations
  - workgroups
  - users
  - roles and capabilities
- CRUD management screens for categories, items, images, lists, polls, votes, notifications, and preferences.
- Runtime config display for system-admin diagnostics.
- Dashboard with health/status, ping, unread notification count, and smart defaults.
- System-admin Token Lab for minting short-lived testing bearer tokens with custom expiration.

## Tech stack
- React 18
- React Router
- Axios
- Vite

## Run locally
```bash
cd wotlwedu-browser
npm install
npm run dev
```

App runs by default on `http://localhost:5173`.

The root monorepo compose stack publishes the browser/admin UI on `http://localhost:4173`.

## Backend API URL
The UI includes an editable "API Base URL" field in the header area. Default value:

`https://api.wotlwedu.com:9876`

For local backend development, set it to your local backend URL (for example `https://localhost:9876`).

You can set the default at build/dev time with:

`VITE_WOTLWEDU_API_BASE_URL`

Google sign-in can be enabled at build/dev time with:

`VITE_GOOGLE_CLIENT_ID`

An example file is included at `.env.example`.

Examples:
```bash
VITE_WOTLWEDU_API_BASE_URL=http://localhost:9876 npm run dev
```

```bash
VITE_WOTLWEDU_API_BASE_URL=http://localhost:9876 \
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com \
npm run dev
```

```bash
docker build \
  --build-arg VITE_WOTLWEDU_API_BASE_URL=http://localhost:9876 \
  --build-arg VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com \
  -t wotlwedu-browser .
```

Runtime behavior:
- If `localStorage["wotlwedu_browser_api"]` exists, that value is used.
- Otherwise, `VITE_WOTLWEDU_API_BASE_URL` is used.
- If neither is set, the fallback is `https://api.wotlwedu.com:9876`.
- API errors are normalized for operators, including rate limits, body-size limits, invalid uploads, and CORS/network failures. `401` clears the session; `403` is shown as an authorization error.
- Picture uploads are prevalidated before calling `POST /picture/file/:imageId`. The browser console accepts PNG/JPEG files only and defaults to a 5 MB client-side limit. Override the client limit with `VITE_WOTLWEDU_IMAGE_UPLOAD_MAX_BYTES` when the backend uses a different `WOTLWEDU_UPLOAD_MAX_BYTES`.
- Expired access tokens are refreshed automatically through `/login/refresh` when a refresh token is present. Set `VITE_WOTLWEDU_REFRESH_COOKIE_ENABLED=true` when the backend stores refresh tokens in HTTP-only cookies.
- Profile shows active sessions and supports device revocation; Support can inspect and revoke sessions for selected people.
- Support shows public-poll abuse metrics and audit events, and can lock, restore, remove public access, or suppress invite recipients for reported polls.

## Helm
A Helm chart is available under `helm/wotlwedu-browser`.

Typical install:
```bash
helm upgrade --install wotlwedu-browser ./helm/wotlwedu-browser
```

Notes:
- The chart deploys the existing NGINX-based browser image and exposes HTTP on port `80`.
- The image copies `nginx.conf`, which rewrites SPA routes to `index.html`.
- Ingress TLS is handled at the Kubernetes ingress layer; the container itself does not terminate TLS.
- The default API base URL is baked into the image at build time via `VITE_WOTLWEDU_API_BASE_URL`. If you need a different default in-cluster, build/publish the image with the desired build arg and point the chart at that image tag.
- Users can still override the API base URL at runtime in the browser UI via local storage.
- Set `environment` and `environments.<name>.service` / `environments.<name>.ingress` in Helm values to apply optional per-environment service and ingress overrides.

## Notes
- `Profile` includes organization invite management for organization admins and system admins.
- `Profile` also shows linked sign-in methods, recent account activity, and organization audit activity when the authenticated user has access.
- `Support` gives org/system admins a dedicated auth/invite investigation surface backed by `/support/auth/overview`, `/support/auth/audit`, and the operator aliases under `/support/people/*` and `/support/organizations/*`.
- 2FA-enabled accounts are supported for login (the browser UI prompts for the one-time code after password verification).
- System admins can open `Token Lab` to create test tokens for a target user by duration (`expiresInMinutes`), revoke issued test tokens, and optionally apply a token to the current session.
- Some backend flows are specialized (for example full 2FA bootstrap/enable and file upload); this UI focuses on broad admin/operations coverage and direct endpoint interaction.
- Authorization is enforced by backend capabilities and tenant/space scope.
- Category assignment is user-scoped in the backend; submitted `categoryId` values must belong to the authenticated user.
- When a system admin edits categories, the Categories pane can now target a specific category owner.
- When a system admin edits an item/picture/list/circle/space/poll, the category dropdown is populated from the categories owned by that object's creator.
- Category-enabled collection endpoints can return grouped category menus via `?collapsible=true`.
- Workgroup/organization IDs are optional in many flows; backend normalizes placeholder values (`""`, `"undefined"`, `"null"`).
- Role capability controls support bulk capability assignment from the resource editor.
