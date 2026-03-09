# wotlwedu-browser

Desktop-first browser frontend for `wotlwedu-backend`.

Current version: `0.1.9`

## Features
- Modern responsive UI optimized for desktop workflows (not mobile-first).
- JWT-authenticated login against `/login`.
- Tenant-aware administration screens for:
  - organizations
  - workgroups
  - users
  - roles and capabilities
- CRUD management screens for categories, items, images, lists, elections, votes, notifications, and preferences.
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

## Backend API URL
The UI includes an editable "API Base URL" field in the header area. Default value:

`https://api.wotlwedu.com:9876`

For local backend development, set it to your local backend URL (for example `https://localhost:9876`).

You can set the default at build/dev time with:

`VITE_WOTLWEDU_API_BASE_URL`

Examples:
```bash
VITE_WOTLWEDU_API_BASE_URL=http://localhost:9876 npm run dev
```

```bash
docker build \
  --build-arg VITE_WOTLWEDU_API_BASE_URL=http://localhost:9876 \
  -t wotlwedu-browser .
```

Runtime behavior:
- If `localStorage["wotlwedu_browser_api"]` exists, that value is used.
- Otherwise, `VITE_WOTLWEDU_API_BASE_URL` is used.
- If neither is set, the fallback is `https://api.wotlwedu.com:9876`.

## Helm
A Helm chart is available under `helm/wotlwedu-browser`.

Typical install:
```bash
helm upgrade --install wotlwedu-browser ./helm/wotlwedu-browser
```

Notes:
- The chart deploys the existing NGINX-based browser image and exposes HTTP on port `80`.
- Ingress TLS is handled at the Kubernetes ingress layer; the container itself does not terminate TLS.
- The default API base URL is baked into the image at build time via `VITE_WOTLWEDU_API_BASE_URL`. If you need a different default in-cluster, build/publish the image with the desired build arg and point the chart at that image tag.
- Users can still override the API base URL at runtime in the browser UI via local storage.
- Set `environment` and `environments.<name>.service` / `environments.<name>.ingress` in Helm values to apply optional per-environment service and ingress overrides.

## Notes
- 2FA-enabled accounts are supported for login (the browser UI prompts for the one-time code after password verification).
- System admins can open `Token Lab` to create test tokens for a target user by duration (`expiresInMinutes`), revoke issued test tokens, and optionally apply a token to the current session.
- Some backend flows are specialized (for example full 2FA bootstrap/enable and file upload); this UI focuses on broad admin/operations coverage and direct endpoint interaction.
- Authorization is enforced by backend capabilities and tenant/workgroup scope.
- Category assignment is user-scoped in the backend; submitted `categoryId` values must belong to the authenticated user.
- When a system admin edits categories, the Categories pane can now target a specific category owner.
- When a system admin edits an item/image/list/group/workgroup/election, the category dropdown is populated from the categories owned by that object's creator.
- Category-enabled collection endpoints can return grouped category menus via `?collapsible=true`.
- Workgroup/organization IDs are optional in many flows; backend normalizes placeholder values (`""`, `"undefined"`, `"null"`).
