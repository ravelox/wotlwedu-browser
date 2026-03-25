# Checkpoint

Last updated: 2026-03-24
Repo: `wotlwedu-browser`
Current version: `0.1.15`

## Current Focus

This repo is archived and obsolete. It should be treated as locked and retained only for historical reference unless an explicit exception is requested.

## Implemented State

- This repo is no longer the primary admin/support console.
- `wotlwedu-admin` now supersedes it for sysops and support operations.
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
- This repo is archived and should not receive routine feature work.

## Likely Next Actions

1. Leave locked unless a migration, emergency fix, or explicit archival exception is requested.
2. Direct new operational admin work into `wotlwedu-admin` instead.
