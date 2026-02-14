# Changelog

This project follows a lightweight changelog format inspired by "Keep a Changelog".

## Unreleased

## 0.1.1 - 2026-02-14
- Add 2FA login flow support (`/login` -> `/login/verify2fa`).
- Add workgroup scoping support for workgroup-aware endpoints.
- Add configurable API base URL via `VITE_WOTLWEDU_API_BASE_URL` and UI override.
- Add `AGENTS.md`, Dockerfile, and expand `.gitignore`.

## 0.1.0 - 2026-02-12
- Initial desktop-first browser frontend for `wotlwedu-backend`.
- Resource-based admin UI (organizations, workgroups, users, roles/capabilities, categories, items, images, lists, elections, votes, notifications, preferences).
- AI workbench for `/ai/*` endpoints.
