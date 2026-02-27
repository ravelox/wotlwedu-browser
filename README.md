# wotlwedu-browser

Desktop-first browser frontend for `wotlwedu-backend`.

Current version: `0.1.3`

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

## Notes
- 2FA-enabled accounts are supported for login (the browser UI prompts for the one-time code after password verification).
- Some backend flows are specialized (for example full 2FA bootstrap/enable and file upload); this UI focuses on broad admin/operations coverage and direct endpoint interaction.
- Authorization is enforced by backend capabilities and tenant/workgroup scope.
- Category assignment is user-scoped in the backend; submitted `categoryId` values must belong to the authenticated user.
- Category-enabled collection endpoints can return grouped category menus via `?collapsible=true`.
- Workgroup/organization IDs are optional in many flows; backend normalizes placeholder values (`""`, `"undefined"`, `"null"`).
