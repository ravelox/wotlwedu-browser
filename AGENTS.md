# AGENTS.md (wotlwedu-browser)

Local instructions for Codex-style agents working in this repository.

## Repo Summary
- App: desktop-first browser UI for `wotlwedu-backend`
- Stack: React 18 + React Router + Axios + Vite

## Key Commands
```bash
npm install
npm run dev
npm run build
npm run preview
```

## API Base URL Configuration
The Axios client uses a configurable API base URL:
- Build/dev default: `VITE_WOTLWEDU_API_BASE_URL`
- User override: `localStorage["wotlwedu_browser_api"]`
- Final fallback: `https://api.wotlwedu.com:9876`

## Local Storage Keys
- Session: `wotlwedu_browser_session` (stores JWT + user context)
- Active workgroup scope: `wotlwedu_browser_active_workgroup`
- API override: `wotlwedu_browser_api`

## 2FA Login Contract (Backend)
Backend behavior:
- `POST /login` returns `200` with tokens for non-2FA accounts.
- `POST /login` returns `302` with `data.toURL = "/auth/verify/:userId/:verificationToken"` for 2FA-enabled accounts.
- Client must then call `POST /login/verify2fa` with:
  - `userId`
  - `verificationToken`
  - `authToken` (the 6-digit TOTP code)

## Where To Make Changes
- Login UX: `src/pages/LoginPage.jsx`
- Session persistence: `src/lib/session.js`
- API client/interceptors: `src/lib/api.js`
- Resource CRUD wiring: `src/lib/resourceDefs.js`, `src/pages/ResourcePage.jsx`
- Workgroup scoping: `src/lib/workgroupScope.js`

## Repo Hygiene
- Do not commit `node_modules/`, `dist/`, `.env*`, or secrets.
- Keep endpoints aligned with `wotlwedu-backend` (URLs, auth, and tenancy/workgroup scoping).

