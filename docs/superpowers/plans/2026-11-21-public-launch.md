# Tagronda Public Launch Implementation Plan

> **For agentic workers:** Use native execution in this session for these small,
> dependent hosting steps; no subagents are needed.

**Goal:** Publish the approved frontend today and prepare the recommended domain purchase.

**Architecture:** Static Vite output on a new Cloudflare Pages project in the existing
account. Keep demo storage browser-local and retain the current app routes.

**Tech Stack:** React, TypeScript, Vite, Cloudflare Pages and Wrangler.

**Spec:** ../specs/2026-11-21-public-launch.md

## Global Constraints

- No backend accounts, payments or cross-device persistence.
- No dependency upgrades or changes to existing storage keys.
- Exact domain and price confirmation precedes a billable registration.
- Preserve the draft PR and existing Cloudflare projects.

## Review Focus

- Opening a QR deep link directly must load the application.
- HTTPS must provide Web Locks for safe browser-local saves.
- Mock equipment and application pages must return noindex headers.
- A longer brand name must fit the 375px navigation.
- Bundled output must contain no credentials or private runtime configuration.

### Task 1: Prepare the public artifact

- [x] Update `src/config/appConfig.ts`, `index.html` and README branding.
- [x] Add `public/favicon.svg`, `public/robots.txt`, `public/_headers` and `wrangler.toml`.
- [x] Run `npm run lint`, `npm run build`, inspect the resulting static files,
      and verify mobile navigation without changing application logic.

### Task 2: Publish and verify

- [x] Create the separate Pages project after checking for an existing match.
- [x] Commit the prepared source and deploy `dist` with its source revision.
- [x] Verify public HTTPS, root/deep routes, indexing headers and a browser-local save.
- [x] Record the actual deployment URL and evidence in `docs/LAUNCH.md`.

### Task 3: Complete the domain handoff

- [x] Present the exact live domain quote and renewal terms for confirmation.
- [x] User chose manual purchase; prepare the free zone and provide its two NS.
      Do not execute the earlier authorized purchase; it has been superseded.
- [x] Associate apex/www with Pages and write/read back both proxied CNAME records.
- [x] After the user completes purchase/delegation, verify public NS and TLS,
      add canonical metadata/sitemap and redeploy.
- [x] Verify Full strict, HTTP -> HTTPS and www -> apex with path/query preservation.
- [x] Repeat the browser-local save and reload check on the working custom origin.
