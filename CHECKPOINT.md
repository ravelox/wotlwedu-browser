# Checkpoint

Last updated: 2026-03-24
Repo: `wotlwedu-browser`
Current version: `0.1.14`

## Current Focus

This repo is the main admin/support client for the backend auth hardening and observability slice.

## Implemented State

- Google sign-in and invite-aware onboarding already existed.
- The login flow now handles expired deferred Google-link tokens more clearly.
- The profile/admin flow now includes:
  - linked sign-in method visibility
  - unlink actions for removable social identities
  - recent account activity from `/user/:userId/authaudit`
  - organization audit activity for admins from `/organization/:organizationId/authaudit`
  - improved invite conflict messaging when the backend reports cross-organization user conflicts
- A dedicated `Support` console now exists for org/system admins:
  - auth/invite overview metrics from `/support/auth/overview`
  - paged support audit feed from `/support/auth/audit`
  - targeted user investigation with sign-in method and recent audit lookup

## Key Files For This Baseline

- [src/App.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-browser/src/App.jsx)
- [src/components/Shell.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-browser/src/components/Shell.jsx)
- [src/pages/LoginPage.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-browser/src/pages/LoginPage.jsx)
- [src/pages/ProfilePage.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-browser/src/pages/ProfilePage.jsx)
- [src/pages/SupportPage.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-browser/src/pages/SupportPage.jsx)
- [README.md](/Users/dkelly/Projects/wotlwedu/wotlwedu-browser/README.md)

## Verification Already Run

Passed:

```bash
npm run build
```

## Notes

- There is already a top-level [`.env.example`](/Users/dkelly/Projects/wotlwedu/wotlwedu-browser/.env.example).
- This client is intended to have full admin parity with the web UI for invite/audit tooling.

## Likely Next Actions

1. Validate the support console against the deployed backend with real auth/invite traffic.
2. Expand support/admin workflows only if you want more than overview, recent failures, and targeted user investigation.
