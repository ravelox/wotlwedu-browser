# Changelog

This project follows a lightweight changelog format inspired by "Keep a Changelog".

## Unreleased

## 0.1.43 - 2026-05-19
- Add a unified Audit Explorer page with auth, support, and public-poll audit
  timelines, shared filters, expandable raw metadata, and CSV/JSON export.

## 0.1.42 - 2026-05-19
- Add visible resource-table bulk selection with scoped bulk export, guarded
  delete, people deactivation, category assignment, and per-row result details.

## 0.1.41 - 2026-05-19
- Add inline resource row actions and a read-only inspect drawer with related
  resource links and JSON export.

## 0.1.40 - 2026-05-19
- Add saved resource views with local custom view persistence for common admin
  support tasks.
- Add configurable resource and audit-table columns, density preferences, and
  copyable ID controls.

## 0.1.39 - 2026-05-19
- Add structured People and Poll resource filters with visible removable filter chips.
- Add structured Support Auth Audit and Public Poll Abuse filters, including date ranges and matching CSV export filters.

## 0.1.38 - 2026-05-18
- Add a global command palette with `Ctrl/Cmd+K` navigation, keyboard selection, admin actions, and scoped resource lookup.
- Support direct record selection from command results through resource-page `id` query links.

## 0.1.37 - 2026-05-18
- Add first-run diagnostics and glossary guidance to the dashboard.
- Add explanatory empty states for resource tables and disabled-reason text for backup, restore, upload, and delete actions.

## 0.1.36 - 2026-05-17
- Turn the dashboard into a task-oriented admin action center with direct links into support, notification, backup, people, and picture workflows.
- Replace always-visible raw health JSON with summarized backend health and expandable diagnostics.

## 0.1.35 - 2026-05-17
- Add persistent admin scope badges for organization, space, global read-only, and global write-enabled modes.
- Make global write confirmation short-lived and reset it after successful cross-tenant support, resource, backup, and token actions.
- Add stronger scope and impact cues to support, backup, resource, and token-lab workflows.

## 0.1.34 - 2026-05-17
- Restore visible labels for admin action buttons and remove generic generated action icons.
- Add clearer labels and tooltips for repeated search, pagination, export, restore, refresh, reset, save, and delete controls.

## 0.1.33 - 2026-05-16
- Add CI for production dependency audit, frontend build, and container build.
- Update production dependency locks to clear high-severity audit findings.

## 0.1.32 - 2026-05-15
- Simplify the browser console styling to flat black, white, and red themes with no gradients.
- Convert common action-row buttons to icon-first controls.
- Render Profile sessions in a table instead of cards.

## 0.1.31 - 2026-05-15
- Complete Priority 7 support workflows with full-result audit CSV exports, operations dashboard cards, account recovery actions, and ownership transfer remediation from the Support console.

## 0.1.30 - 2026-05-15
- Add a Backup console page for whole-system, organization, and space-scoped JSON export/restore operations.

## 0.1.29 - 2026-05-15
- Render profile account and organization audit feeds as tabular operator views instead of cards.

## 0.1.28 - 2026-05-15
- Add tenant-aware organization and space scope controls, global-mode warnings, and visible scope breadcrumbs for system-admin/support workflows.
- Add paginated generic resource tables with totals, next/previous navigation, page sizing, and sortable visible columns.
- Replace eager admin lookup loads with server-backed searchable pickers for organizations, people, spaces, categories, pictures, lists, polls, votes, notifications, and Token Lab users.
- Add scoped support loading, audit CSV export, paginated auth/public-poll feeds, recipient suppression, and confirmation/reason dialogs for session revocation and public-poll moderation.
- Add operations dashboard cards for tenant scale, active sessions, mail failures, storage provider state, and database update metadata.
- Add public-poll abuse review and moderation controls to Support, including lock, restore, and remove-public-access actions.
- Automatically refresh expired access tokens with refresh-token rotation.
- Add Profile controls to view/revoke active sessions and log out all devices.
- Add support-console session visibility and revocation for selected people.

## 0.1.25 - 2026-05-10
- Align browser-console auth/error handling with backend Priority 1 hardening: only `401` clears the session, while `403` stays visible as an authorization error.
- Add rate-limit, body-size, upload-validation, and network/CORS-aware API error messages.
- Validate picture uploads client-side before multipart submission, including PNG/JPEG extension, MIME type, and size checks.

## 0.1.24 - 2026-05-10
- Refresh Codex agent guidance for the browser/admin repository.
- Update README release metadata and deployment notes.
- Keep the displayed app fallback version aligned with package metadata.

## 0.1.23 - 2026-05-06
- Add a runtime config display for system-admin diagnostics.
- Improve role capability controls in the resource editor.
- Copy the custom Nginx config into the runtime image so SPA routes are served through `index.html`.

## 0.1.22 - 2026-05-06
- Keep long resource tables and capability pickers scrollable instead of expanding the page.

## 0.1.21 - 2026-05-05
- Run the resource filter when Enter is pressed in the filter input.

## 0.1.20 - 2026-05-05
- Update browser-console labels for Circle, Picture, Person, Space, and Poll terminology.
- Replace Options terminology with Ideas where it appears in browser-console copy.
- Move browser-console API calls to clean terminology endpoints and the `/v1` API base.

## 0.1.16 - 2026-03-25
- Remove `CHECKPOINT.md` as part of the cross-repo cleanup.

## 0.1.15 - 2026-03-24
- Mark the repo as archived and obsolete in the checkpoint state.
- Record that `wotlwedu-admin` supersedes this repo for operational admin workflows.

## 0.1.11 - 2026-03-24
- Add Google sign-in and invite-aware login to the browser console.
- Add a Profile page with organization invite create, list, resend, revoke, and history controls.
- Add build-time Google client ID support for Docker and Vite configuration.

## 0.1.10 - 2026-03-10
- Update Token Lab token generation to use a typedown combobox for selecting user name.
- Resolve combobox selection to user ID before minting test tokens.

## 0.1.9 - 2026-03-09
- Harden client session persistence by validating/restoring token payloads defensively before use.
- Keep Token Lab testing workflow support aligned with backend test-token mint/revoke behavior.

## 0.1.8 - 2026-03-09
- Add a system-admin-only Token Lab page to mint testing bearer tokens via backend operator endpoint `POST /support/session/testtoken`.
- Allow custom token lifetime input (`expiresInMinutes`) and support copying tokens directly from the UI.
- Add a "Use In Session" action to apply the generated token to the current browser session for live permission/scoping tests.
- Add a Token Lab revoke action (`POST /support/session/testtoken/revoke`) so test tokens can be invalidated immediately.

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
- Add image file upload support in the Images pane (multipart upload to `/picture/file/:imageId`).
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
