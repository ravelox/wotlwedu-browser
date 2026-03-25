# Checkpoint

Last updated: 2026-03-24
Repo: `wotlwedu-browser`
Current version: `0.1.12`

## Current Focus

This repo has been brought into parity with the backend support/admin auth hardening slice.

## Implemented State

- Google sign-in and invite-aware onboarding already existed.
- The login flow now handles expired deferred Google-link tokens more clearly.
- The profile/admin flow now includes:
  - linked sign-in method visibility
  - unlink actions for removable social identities
  - recent account activity from `/user/:userId/authaudit`
  - organization audit activity for admins from `/organization/:organizationId/authaudit`
  - improved invite conflict messaging when the backend reports cross-organization user conflicts

## Main Files Changed In This Uncommitted Slice

- [src/pages/LoginPage.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-browser/src/pages/LoginPage.jsx)
- [src/pages/ProfilePage.jsx](/Users/dkelly/Projects/wotlwedu/wotlwedu-browser/src/pages/ProfilePage.jsx)
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

1. Stage, commit, tag, and push this uncommitted slice if accepted.
2. Optionally expand support/admin views if you want deeper diagnostics than the current profile-based surfaces.
