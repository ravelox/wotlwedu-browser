# wotlwedu-browser

Desktop-first browser frontend for `wotlwedu-backend`.

## Features
- Modern responsive UI optimized for desktop workflows (not mobile-first).
- JWT-authenticated login against `/login`.
- Tenant-aware administration screens for:
  - organizations
  - workgroups
  - users
  - roles and capabilities
- CRUD management screens for categories, items, images, lists, elections, votes, notifications, and preferences.
- AI workbench to call `/ai/*` endpoints directly.
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

## Notes
- Some backend flows are specialized (for example full 2FA bootstrap/verify sequences and file upload); this UI focuses on broad admin/operations coverage and direct endpoint interaction.
- Authorization is enforced by backend capabilities and tenant/workgroup scope.
