# Tagronda public frontend launch

The user asked to choose a domain and get the existing frontend online today.
The existing Brazil-first equipment, QR, inspection and work-order demo remains
browser-local, without backend accounts, payments or cross-device persistence.

The launch recommendation is Tagronda, combining equipment tags and inspection
rounds. On 2026-11-21, Verisign RDAP returned no registration for tagronda.com;
Cloudflare's live Registrar Check confirmed standard availability at USD 11.17
registration and USD 11.17 renewal. Search found no obvious exact-name software
product. This is an initial naming check, not trademark clearance or a reservation.
Zelativo.com is a same-price backup. RondaQR was rejected because an existing
Brazilian QR inspection application already uses that name.

## Approach

Reuse the user's existing Cloudflare account and create a separate free static
Pages project, `tagronda`. Upload the reviewed Vite production build, retaining
the native Pages SPA fallback. A new hosting provider/account adds no value for
today's frontend release. The existing GitHub repository remains the source of
truth; deploying this branch does not require merging its draft PR.

Use Tagronda in the central brand configuration, HTML metadata and favicon.
Retain storage keys so rebranding does not discard local work. Exclude the
mock application and equipment paths from indexing. Keep the temporary Pages
host unindexed and enable the purchased brand domain separately.

## Purchase and verification

Confirm the exact domain and billable amount before registration. Buy one year,
no paid hosting or add-ons, and explicitly disclose the automatic-renewal choice.
Do not invent registrant contact details or silently accept new legal terms.
Use existing account defaults only if configured and authorized.

Verify build output, public HTTPS, root and deep routes, response headers, mobile
layout and a browser-local save on the deployed origin. Report deployment,
registration, DNS and certificate states independently. Add the canonical URL and
sitemap after the primary domain has actually been registered and bound.
