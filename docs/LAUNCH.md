# Tagronda launch record

Date: 2026-11-21 (Asia/Taipei).

## Brand and domain

- Recommended primary domain: `tagronda.com`.
- Backup: `zelativo.com`.
- Cloudflare Registrar Check: both standard and registrable, USD 11.17 for the
  first year and USD 11.17 current annual renewal. Prices can change; this is
  a live quote, not a completed purchase or reservation.
- Public exact-name software searches found no obvious Tagronda product.
- RondaQR was rejected because an existing Brazilian QR application uses it.
- Domain registration: **pending exact-domain and purchase confirmation**.
- Custom-domain DNS and HTTPS: **not configured**.

## Hosting

- Platform: Cloudflare Pages, static Direct Upload.
- Project name: `tagronda`; separate from existing account projects.
- Public URL: https://tagronda.pages.dev
- Immutable deployment URL: https://16cf8268.tagronda.pages.dev
- Deployment ID: `16cf8268-1304-4c05-80b9-8a67c6fa8f60`.
- Deployment state: **production / deploy success** (Cloudflare API read-back).
- Deployed source commit: `e63efa6344b250e767dfd91ba2901f26550e2aef`.
- SPA: native Pages fallback, no root `404.html`.
- Secrets: existing encrypted local credentials are read only by deployment tools;
  they are never copied into the source or static artifact.
- Source: https://github.com/saleiyi/qr/tree/codex/frontend-demo-polish

## Verified on the public origin

- TypeScript check and production build passed; static artifact inspection found
  no credential patterns, environment files or source maps.
- HTTPS returned 200 with normal certificate validation. The presented
  `tagronda.pages.dev` certificate covers the primary and wildcard preview hosts
  and is valid from 2026-11-21 to 2027-02-19.
- Chrome checked 375px and 1440px homepages and captured screenshots; both fit
  without horizontal overflow. Visual inspection confirmed the longer brand fits.
- Direct visits to `/app/plans`, `/app/issues`, `/app/templates`, `/a/eq-001` and
  `/a/eq-001/request` returned 200, rendered successfully and returned `noindex`.
- The public origin reports a secure context and Web Locks support. A QR repair
  request was saved and still appeared after a reload. This test used a fresh,
  disposable browser context, with no real customer information.
- No browser page errors occurred during that public-origin smoke check.
- Local verification artifacts are ignored under `.superpowers/launch-public/`.
  The headless browser required the machine's existing HTTP proxy; TLS validation
  remained enabled. Initial direct/browser and Python requests failed before the
  successful verified curl and Chrome checks.

## Public scope

The site is an interactive Portuguese frontend demonstration. Data, drafts,
uploaded demo photos and mock roles live only in each browser. There are no real
user accounts, server persistence, email delivery, production payments or
multi-device synchronization. Use sample information in this environment.

The temporary Pages hostname and `/app`, `/app/*`, `/a/*` return noindex directives.
Robots exclusions are indexing hints, not access controls. Purchase and bind the
primary domain before adding its canonical URL or sitemap.

## Deployment command

Build with the existing lockfile/dependencies, then run:

```sh
npm run build
npx wrangler pages deploy dist --project-name tagronda --branch main
```

Supply `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` through the deployment
environment. Do not put a token in command arguments or tracked files. The `main`
deployment branch selects the Pages production alias; it does not merge GitHub
branches.
