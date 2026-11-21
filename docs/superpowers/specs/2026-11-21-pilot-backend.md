# Tagronda first-customer pilot backend

## Authorized outcome

The user explicitly expanded the earlier frontend-only scope: connect a real
backend so a computer creates a new equipment item, an independently logged-in
phone scans its QR and submits an inspection, and management receives the record.
Make this safe enough for a first bounded customer trial. Preserve the existing
Portuguese UI and public demo; do not add billing, ERP, AI or native applications.
The owner email is supplied privately during provisioning, never committed.

## Architecture and approach

Keep React/Vite and the existing Cloudflare Pages project. Add same-origin Pages
Functions under `/api`, a dedicated D1 database, and a private R2 bucket. Production
and preview use distinct physical data and secrets. Access/Zero Trust API reads
returned 403 with the current credential; do not upgrade that credential or depend
on Access. Use pinned Better Auth 1.7.27 with its D1 adapter and password/session
implementation. No custom password cryptography. Use invite-only enrollment;
public sign-up is never routed. The first owner receives a private one-time
activation link and sets their own password. Do not send email from tools.

Alternatives considered: a new hosted authentication/database vendor requires new
account configuration; reusing the unrelated SaaS Factory would add another
deployment and licensing surface. Existing D1/R2 permissions and a maintained
authentication library keep this pilot within the current account and app.

## Identity and enrollment

Minimum password length 12, maximum 128. Better Auth supplies hashing, session
creation/verification and secure HttpOnly cookies. Only allowed auth routes are
sign-in/email, sign-out, get-session and change-password. Internal sign-up is used
only after a valid invite. Use database-backed persistent rate limits on login
and invitation attempts. State-changing routes require matching Origin and JSON
content type; never trust supplied workspace/user/role/actor IDs. Secure cookies
in HTTPS environments; local HTTP exceptions must be restricted to localhost.

An admin creates an invitation with email/name/role. Return a private URL like
`/activate#<random-token>` so tokens never enter URL request logs or referrers.
Store only its SHA-256 hash, target workspace/member/email, expiry and single-use
status. Invitations expire within 48 hours. Renewing an invitation revokes the
previous pending token. New users set a password; an existing user must sign in
before accepting an email-matching invite. Enrollment/claim must tolerate crashes
and races without account takeover, duplicate memberships or public registration.
The pilot supports one workspace per account; reject cross-workspace enrollment.
No automatic email verification claim. The operator gets the invite manually
from their administrator. Owner recovery is an authenticated operational procedure
until a mail provider is configured, and must be documented honestly.

Each API request resolves the current D1 membership, including active status and
role; revocation takes effect without waiting for a client role cache. At least one
active administrator must remain. Existing frontend role toggles and simulation/
reset controls are available only in demo mode, never the live workspace.

## Data and command boundary

Contract: `src/types/pilot.ts`. `/api/workspace` returns the authenticated identity,
state and authoritative clock. `/api/session` returns the same shape, or 401.
`POST /api/commands` accepts `PilotCommandRequest` and returns
`PilotCommandResponse`, or `{ok:false, code, error}` with an appropriate status.
No generic whole-state PUT, browser-authoritative role or automatic local-data
migration. All commands are recomputed and validated on the server.

All business reads/writes include the authenticated workspace ID. Use normalized
entity rows (JSON payloads per asset/template/record/etc are acceptable), not one
ever-growing workspace JSON row. Separate membership/auth tables are the source
of truth. Use prepared SQL and transactional D1 batches. A workspace revision and
compare-and-swap guard prevent overwrites; an unsuccessful CAS changes no entity,
audit or idempotency row. Command IDs are workspace-scoped, payload-bound and
idempotent. Repeating one ID with a different payload is a conflict. Inspection
submission can rebase safely on current data and must not duplicate records,
tasks or generated issues under retries/concurrent requests.

Admins manage equipment/configuration/plans/members and assign/approve/reject
work orders. Operators inspect and report problems; treatment is limited to their
assigned orders. Viewers cannot mutate. Inspector/actor names and IDs come from
the server identity, and attempts to impersonate another member are rejected.
Inspection records and evidence snapshots remain immutable. Validate template
versions, task ownership/completion, required/conditional fields, numeric bounds,
inactive assets and references to the current workspace. Reuse pure existing
domain helpers with an explicit real clock; never import demo state for live data.

Start a clean workspace with its owner, one default site, an editable basic
published checklist, and zero equipment/records/issues. Use current UTC timestamps
and a workspace timezone (default America/Sao_Paulo), not the fixed demo date.

## Photos and private files

Persist photos in the dedicated private R2 bucket; business records contain
same-origin authenticated URLs. Validate file size, allowed raster image type
and magic bytes; reject SVG/HTML, arbitrary URLs, cross-workspace file references
and paths. Files are served only to active workspace members with private/no-store
headers, correct MIME and nosniff. Existing data URL inputs can be ingested by the
server and replaced with R2 references. Retry must not grow storage indefinitely;
content-addressing within a workspace is acceptable. A failed file write must not
produce a successful inspection or a dangling record. Record attachments survive
future form/template edits.

## Frontend and demo

Live `/app` and real `/a/:id` require login, preserving the requested deep link.
Landing page offers distinct live login and explicit demo entry (`/demo/app`).
The demo uses a router basename, including `/demo/a/:id` QR links; it shares no
mode-switching session flag with the live workspace.
Demo data, cloud workspace state and pending drafts must never be mixed. Keep
cloud state in memory and server storage; namespace drafts per workspace/user,
clear them on logout/account switch and never store auth tokens in localStorage.
Local Vite without an API must retain explicit demo QA and existing browser tests;
production must never silently fall back to a local demo after an API failure.

Use server-backed commands for existing context actions; reject/disable any
unsupported action explicitly. No fake successful member invitations or settings
saves. Inspectors use their real identity rather than choosing another member.
Hide demo resets/roles/simulated pricing messages in a live workspace. Show loading,
offline/retry and synchronization states. Refresh workspace on focus and periodic
polling without overwriting a dirty form; stale revisions fail visibly. An admin
can manually refresh to see an inspection submitted on another device.

## Trial operations and acceptance

Provide an authenticated admin export plus a documented and tested staging
backup/restore procedure (including photos). Structured errors must not expose
SQL, passwords, cookies, tokens or other tenants' data. Database and bucket are
dedicated to Tagronda. Apply only additive migrations to new resources. Restore
tests must target a disposable staging workspace/database, never real data.

Required verification on real local D1/R2 emulation, then the isolated preview:

1. Activate admin, create a genuinely new asset, and print/read its QR URL.
2. Activate operator in a separate browser context, open that URL, fill checklist,
   attach a photo and submit. Use a current timestamp.
3. Management fetches/reloads and sees that exact record, photo, updated equipment
   history and generated issue where appropriate.
4. Repeated/concurrent submission creates one inspection; a template change and a
   stale write cannot overwrite newer data.
5. Another workspace cannot read/change this equipment, record, member or photo,
   even by guessing IDs or forging body workspace/role/actor fields.
6. Anonymous and viewer writes fail; operator admin/configuration attempts fail;
   deactivated members/signed-out sessions lose access.
7. The explicit public demo and baseline domain/browser tests still work.
8. Verify admin export/restore and deployed production health before handoff.

Deploy production only after those checks and a security/code review. The task
authorizes completing this deployment; no new paid plan may be silently added.
Return the live URL, private first-owner activation step, verification evidence,
and precise pilot limitations. Do not claim a real customer has already trialed it.
