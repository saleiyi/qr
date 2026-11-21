# Tagronda Pilot Backend Implementation Plan

> **For agentic workers:** Use bounded backend and frontend ownership with shared
> contracts. Read the matching task brief first. Test behavior before implementation.

**Goal:** Complete and deploy the computer -> phone inspection -> management flow
with real accounts, isolated cloud data and private photos.

**Architecture:** Existing Vite/React UI plus Pages Functions, Better Auth, dedicated
D1 and private R2, with separate preview/production resources.

**Tech Stack:** TypeScript, Better Auth 1.7.27, Cloudflare Pages/D1/R2, Playwright.

**Spec:** ../specs/2026-11-21-pilot-backend.md

## Global Constraints

- No public sign-up or locally trusted live roles; no custom password crypto.
- All data access is bound to the authenticated workspace, including photos.
- Preserve the explicit public demo; no live/demo data migration or silent fallback.
- Reuse existing frontend/domain behavior and the pinned lockfile; no billing/AI/ERP.
- Only dedicated Tagronda resources may be modified; no silent paid plan changes.

## Review Focus

- A token holder cannot enroll under a different email/workspace/role.
- A stale or simultaneous command cannot drop another device's work.
- A caller cannot pass another tenant's ID or photo URL to bypass scoping.
- A login expiry or API failure cannot turn real customer data into a demo session.
- Backups/fixtures and owner activation secrets never enter the public repository.

### Task 1: Backend, persistence and authentication

- [x] Define migrations, D1/R2 environment interfaces and Better Auth configuration.
- [x] Write and observe failing real-emulator auth/tenant/command tests.
- [x] Implement invite enrollment, secure sessions, role checks and command API.
- [x] Implement private images, current-clock domain operations and admin export.
- [x] Verify concurrency/idempotency, validation, isolation and role revocation.

### Task 2: Live workspace frontend

- [x] Implement login/activation, demo/live distinction and protected deep links.
- [x] Add typed cloud client and route existing context actions through commands.
- [x] Use authenticated inspector identity and server clock; isolate drafts.
- [x] Add actual invitations, synchronization/retry controls and logout handling.
- [x] Verify original demo tests and two-device live frontend acceptance.

### Task 3: Provisioning, integration and release

- [x] Provision separate Tagronda preview/production D1 and R2, secrets and bindings.
- [x] Run additive migrations and prepare private owner enrollment.
- [x] Exercise local emulator and preview with independent browser contexts.
- [x] Independently review security/correctness; resolve substantive findings.
- [x] Deploy production, verify its API and business flow, document recovery and
      return the private owner activation step plus trial limitations.
