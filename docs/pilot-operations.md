# Tagronda pilot operations

The pilot uses Cloudflare Pages Functions, Better Auth, D1 and a private R2 bucket.
The public demo is `/demo/app`. Real accounts enter at `/login`; authenticated
equipment labels use `/a/<id>`. API errors never open demo data.

## Provision an owner

Public signup and outgoing email are disabled. Confirm the intended recipient
with the organization before provisioning or sharing an invitation. One identity
belongs to one workspace in this pilot. Do not reuse an email across independent
companies or bypass a reservation to repair an invitation.

1. Create an ignored `.pilot-private/owner-input.json` with `origin`, `email`,
   `name` and `companyName`. Use the production origin for a production owner.
2. Run `node --import tsx scripts/prepare-workspace.ts .pilot-private/owner-input.json`.
   This prepares SQL and the private activation link; it does not change a database.
3. Apply pending migrations to the dedicated database, then import the generated
   `provision.sql` using `wrangler d1 execute <database> --remote --file <file>`.
   Check the selected environment and resource before executing. An identity
   reservation conflict must be investigated, never worked around by deleting data.
4. Share `activation.json`'s link privately with the verified recipient. It expires
   in 48 hours, can be used once, and lets the recipient choose a password of at
   least 12 characters. Never paste the link, identity input or SQL into GitHub.
5. In Settings, the owner creates team invitations and shares each link directly.
   The UI does not send email. Permissions are enforced by the server on every call.

Keep local provisioning artifacts encrypted after use. Once the owner is active,
review the company name and members, invite an operator, add an actual equipment
item and print its QR label. The empty workspace has only a site and basic checklist.

## Release

Install the pinned lockfile with Bun. Run `npm run lint`, `npm test`,
`npm run test:backend`, `npm run test:e2e`, and the isolated live flow
`npm run test:pilot` against a provisioned disposable environment. Build with
`npm run build`.

`wrangler.toml` separates preview and production D1/R2 bindings. Configure a
different secret `BETTER_AUTH_SECRET` in each Pages environment. Do not place it in
Vite variables or tracked files. Apply additive migrations with the corresponding
`--env preview` or `--env production` setting. Deploy `pilot-staging` before the
production branch. Authentication uses the configured exact `APP_ORIGIN`; use the
preview alias rather than a random deployment URL.

## Backup and restore

An admin can download `/api/export`. This contains the workspace snapshot and
attachment manifest, not passwords or photo bytes. It is a business export, not a
complete authentication/database recovery backup.

For a full backup, pause writes for the bounded maintenance period and record the
exact database, bucket, origin, application version and authentication secret
version. Export the full D1 database with
`wrangler d1 export <database> --remote --output <private-path.sql>`. Keep the
export encrypted: it includes account hashes and sessions. Retain the matching
server secret securely, separately from public source.

Copy every manifest object from the private bucket. Its key is
`<workspace-id>/<file-id>`; the API path is `/api/files/<file-id>`. Use
`wrangler r2 object get <bucket>/<key> --remote --file <private-file>` and preserve
the MIME type and a SHA-256 checksum. For multiple workspaces, include every
workspace manifest. Do not publish the bucket or use public object URLs.

Rehearse recovery on a newly created disposable D1 and private R2 bucket. Import
the SQL dump there, upload the saved objects with `r2 object put --remote --file`
and their original `--content-type`, and bind an isolated preview to these resources.
Never run a rehearsal against production data. Use the same origin and matching
secret for the rehearsal or configure a separate exact auth origin intentionally.
Sign in with a fresh browser session; compare the workspace and attachment
manifest, then verify each photo's byte checksum. Check anonymous and other-company
denial. Restore the normal preview bindings and remove only the recorded disposable
resources after verification. Resume writes only after the original service is healthy.

## Support and trial bounds

This release supports a supervised first-customer trial. It does not include
billing, automatic email delivery, self-service password recovery, arbitrary file
uploads, a native app or fully offline submission. Drafts can be kept in the current
browser; a completed inspection must receive server confirmation. Signing out or
switching accounts removes private local drafts.

Before a password recovery or workspace transfer, verify the person's identity
through the organization, back up the database, and use an audited operator
procedure supported by the authentication library. Never set a customer password
in chat, edit a password hash by hand, or claim that a recovery email was sent.

Backups and restore rehearsals are manual in this pilot. Before broader rollout,
add scheduled encrypted backups, uptime/error alerts, retention rules and a
documented support/recovery process. Reassess aggregate snapshot reads and storage
limits as usage grows. A new paid plan requires explicit authorization.

Recurring plans have a projection budget, with one year of admission headroom.
If an older/imported schedule exceeds the budget, the app explicitly marks the
agenda as requiring maintenance and refuses new plans. Saved records, equipment,
ordinary QR inspections and admin export remain available. The export retains
the durable plans and stored task history and includes the same warning; it must
not be interpreted as a complete projected agenda while that warning is present.
Contact the operator to rebalance the schedule before extending the trial.
