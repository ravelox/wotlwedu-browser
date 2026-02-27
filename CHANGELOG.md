# Changelog

This project follows a lightweight changelog format inspired by "Keep a Changelog".

## Unreleased

## 0.1.3 - 2026-02-27
- Update compatibility notes for backend category behavior:
- Category assignment is user-scoped per authenticated user.
- Category-enabled collection endpoints may return grouped menus when `collapsible=true`.
- Backend now normalizes placeholder ID values for `workgroupId` and `organizationId` (`""`, `"undefined"`, `"null"`).

## 0.1.2 - 2026-02-14
- Add image file upload support in the Images pane (multipart upload to `/image/file/:imageId`).
- Fix Users pane workgroup scoping (send `workgroupId` when a scope is selected).
- Prepopulate new-user `organizationId` from selected workgroup scope.
- Ensure resource panes remount on nav changes to avoid stale table/form state.
- Remove AI workbench UI (backend `/ai` endpoints removed).

## 0.1.1 - 2026-02-14
- Add 2FA login flow support (`/login` -> `/login/verify2fa`).
- Add workgroup scoping support for workgroup-aware endpoints.
- Add configurable API base URL via `VITE_WOTLWEDU_API_BASE_URL` and UI override.
- Add `AGENTS.md`, Dockerfile, and expand `.gitignore`.

## 0.1.0 - 2026-02-12
- Initial desktop-first browser frontend for `wotlwedu-backend`.
- Resource-based admin UI (organizations, workgroups, users, roles/capabilities, categories, items, images, lists, elections, votes, notifications, preferences).
- AI workbench for `/ai/*` endpoints.
