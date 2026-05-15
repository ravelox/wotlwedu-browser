# AGENTS.md (wotlwedu-browser)

Local instructions for Codex-style agents working in this repository.

## Repo Summary

- App: desktop-first admin/support browser UI for `wotlwedu-backend`.
- Package: `wotlwedu-browser` version `0.1.30`.
- Stack: React 18, Vite 5, React Router 6, Axios.
- Deploy target: static bundle served by Nginx.
- Default backend: `https://api.wotlwedu.com:9876`.

## Key Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

`npm run build` is the main verification command for most UI code changes.

## API Base URL Configuration

The Axios client uses a configurable API base URL:

- Build/dev default: `VITE_WOTLWEDU_API_BASE_URL`.
- User override: `localStorage["wotlwedu_browser_api"]`.
- Final fallback: `https://api.wotlwedu.com:9876`.

## Local Storage Keys

- Session: `wotlwedu_browser_session`.
- Active workgroup scope: `wotlwedu_browser_active_workgroup`.
- API override: `wotlwedu_browser_api`.

## Backend Contract Notes

- 2FA login:
  - `POST /login` returns `200` with tokens for non-2FA accounts.
  - `POST /login` returns `302` with
    `data.toURL = "/auth/verify/:userId/:verificationToken"` for 2FA-enabled
    accounts.
  - The client then calls `POST /login/verify2fa` with `userId`,
    `verificationToken`, and `authToken`.
- Admin/support workflows must stay aligned with backend auth, capability,
  organization, workgroup, role, user, invite, support, and token-lab contracts.
- Workgroup-scoped admin actions must preserve backend tenancy and scope rules.

## Where To Make Changes

- Route composition and auth gates: `src/App.jsx`.
- App entry: `src/main.jsx`.
- Shell/chrome components: `src/components/`.
- Login UX: `src/pages/LoginPage.jsx`.
- Dashboard/profile/config/token lab/support screens: `src/pages/`.
- Generic resource CRUD: `src/lib/resourceDefs.js`,
  `src/pages/ResourcePage.jsx`.
- API client/interceptors: `src/lib/api.js`.
- Session persistence: `src/lib/session.js`.
- Workgroup scoping: `src/lib/workgroupScope.js`.
- Global styling: `src/styles.css`.
- Static serving/container behavior: `Dockerfile`, `nginx.conf`.
- Helm chart: `helm/wotlwedu-browser/`.

## UX Notes

- This app is an operational admin/support console, so favor dense, scannable,
  predictable interfaces over marketing-style layouts.
- Keep controls explicit and efficient for repeated admin workflows.
- Preserve SPA deep-link behavior; Nginx and Helm deployment config should serve
  client routes through `index.html`.

## Testing Expectations

- Run `npm run build` for browser/admin UI implementation changes when
  practical.
- For visual or interaction changes, start `npm run dev` and inspect the changed
  flow in a browser when practical.
- Mention any skipped tests or environment blockers in the final response.

## Repo Hygiene

- Do not commit `node_modules/`, `dist/`, `.env*`, secrets, or generated
  archives.
- Keep `README.md` and `CHANGELOG.md` aligned with behavior changes.
- Keep endpoints aligned with `wotlwedu-backend`, especially URLs, auth,
  capabilities, organization/workgroup tenancy, and scope behavior.
- Keep Helm and Nginx behavior aligned when deployment behavior changes.
