# Changelog

This project follows a lightweight changelog format inspired by "Keep a Changelog".

## 0.1.8 - 2026-03-09
- Add a system-admin-only Token Lab page to mint testing bearer tokens via backend `POST /login/testtoken`.
- Allow custom token lifetime input (`expiresInMinutes`) and support copying tokens directly from the UI.
- Add a "Use In Session" action to apply the generated token to the current browser session for live permission/scoping tests.
- Add a Token Lab revoke action (`POST /login/testtoken/revoke`) so test tokens can be invalidated immediately.

## 0.1.7 - 2026-02-28
- Let system admins manage categories on a per-user basis by selecting the category owner in the Categories pane.
- When editing category-enabled objects, load category choices from the object owner's category list instead of the currently logged-in admin's categories.
- Replace the New User `organizationId` text field with an organization-name typedown/combobox that resolves to the selected organization ID.
- Add typedown comboboxes for organization and user ID fields across browser resource forms.
- Show the browser app version on the login page and in the sidebar.
- Replace the always-visible table `New` button with an edit-only `Clear Selection` action.
- Fix singular form titles so Categories correctly render as `New Category`.

## 0.1.4 - 2026-02-28
- Add a Helm chart under `helm/wotlwedu-browser` for Kubernetes deployment, matching the browser app's current NGINX/HTTP container model.
- Add `.helmignore` and optional per-environment Helm service/ingress overrides.

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
