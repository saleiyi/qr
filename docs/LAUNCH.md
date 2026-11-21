# Tagronda launch record

Date: 2026-11-21 (Asia/Taipei).

## Brand and domain

- Primary domain: https://tagronda.com
- Backup: `zelativo.com`.
- Initial Cloudflare quote before registration: standard, USD 11.17 for the
  first year and USD 11.17 current annual renewal. The actual registrar purchase
  was handled manually by the user; no registrar charge was made by the agent.
- Public exact-name software searches found no obvious Tagronda product.
- RondaQR was rejected because an existing Brazilian QR application uses it.
- Domain registration: **completed manually by the user**, confirmed against
  Verisign RDAP. Registered 2026-11-21T13:06:42Z; expires 2027-11-21T13:06:42Z.
  Do not issue another registration or registrar charge.
- Custom-domain DNS: **active and verified**, with matching public nameservers.
- Custom-domain HTTPS: **verified in Chrome**, with normal TLS validation.

## Cloudflare DNS and HTTPS

- Zone: `66d5464a4df166f53757fc0682f7c505`, Free Website (USD 0).
- Zone status: `active`.
- Verified registrar/public nameservers:
  - `arch.ns.cloudflare.com`
  - `joyce.ns.cloudflare.com`
- Proxied CNAME, TTL Auto: `tagronda.com` -> `tagronda.pages.dev`.
- Proxied CNAME, TTL Auto: `www.tagronda.com` -> `tagronda.pages.dev`.
- Both hostnames have active Pages domain and certificate verification.
- SSL mode: `strict` (Full strict), read back after writing.
- Always Use HTTPS: `on`, read back after writing and verified as a 301.
- `www.tagronda.com` redirects to `https://tagronda.com` with a 301; path and
  query parameters are preserved. Rule ref: `tagronda_www_to_apex`, ruleset
  `164d32cd8bd8496f95ad8381ba49d627`.

## Hosting

- Platform: Cloudflare Pages, static Direct Upload.
- Project name: `tagronda`; separate from existing account projects.
- Public URL: https://tagronda.com
- Temporary host: https://tagronda.pages.dev
- Immutable deployment URL: https://6d523b97.tagronda.pages.dev
- Deployment ID: `6d523b97-7f46-4a19-ad74-0e4c26b3e672`.
- Deployment state: **production / deploy success** (Cloudflare API read-back).
- Deployed source commit: `567b65b9fc4bdf6122ebf6c37ff3bfb76ae837e5`.
- SPA: native Pages fallback, no root `404.html`.
- Secrets: existing encrypted local credentials are read only by deployment tools;
  they are never copied into the source or static artifact.
- Source: https://github.com/saleiyi/qr/tree/codex/frontend-demo-polish

## Verified on the public origin

- Primary domain returned 200 in Chrome using TLS 1.3, issuer WE1, subject
  `tagronda.com`. The homepage canonical and Open Graph URL are
  `https://tagronda.com/`, and the homepage does not return a noindex header.
- `robots.txt` and `sitemap.xml` returned 200. The sitemap contains only the
  homepage. Mock equipment and application pages remain excluded from indexing.
- The complete phone/desktop and repair-save smoke check also passed on
  `https://tagronda.com`, with Web Locks, persistence after reload and no page errors.
- Real requests confirmed `www` 301 -> apex and HTTP 301 -> HTTPS, preserving
  `/a/eq-001` and its query string. Evidence is in `.superpowers/launch-domain/`.
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
Robots exclusions are indexing hints, not access controls. The registered primary
domain's homepage has canonical metadata and a homepage-only sitemap.

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
