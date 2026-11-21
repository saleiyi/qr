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
- Deployment: **being prepared**.
- SPA: native Pages fallback, no root `404.html`.
- Secrets: existing encrypted local credentials are read only by deployment tools;
  they are never copied into the source or static artifact.
- Source: https://github.com/saleiyi/qr/tree/codex/frontend-demo-polish

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
