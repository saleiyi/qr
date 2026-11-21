# Tagronda

Portuguese equipment records, QR labels, inspections, issue treatment and reports.
The invite-only pilot connects the React frontend to Cloudflare Pages Functions,
Better Auth, D1 and private R2. Real workspaces use authenticated accounts and
server permissions; equipment and inspection records synchronize between devices.

Website: [tagronda.com](https://tagronda.com). Sign in at `/login`; the explicit
public demo is `/demo/app` and stores its examples only in the current browser.
The `www` hostname redirects to
the primary HTTPS domain while preserving equipment links and query parameters.

## Development

Install Node.js and Bun, then use the existing lockfile:

```sh
bun install --frozen-lockfile
bun run dev
```

Vite development mode opens the local demonstration. To test real accounts, build
the app and run `wrangler pages dev dist --port 8788` with local D1 migrations,
private R2 bindings and an ignored `.dev.vars` based on `.dev.vars.example`.
The equipment scan pages use `/a/:id`; a
phone needs a reachable preview URL to open a QR link generated on another device.

## Verification

```sh
bun run lint
bun run test
bun run test:backend
bun run build
bunx playwright install chromium
bun run test:e2e
```

The demo browser suite starts Vite on `127.0.0.1:4174`. To use an installed Chrome
instead of Playwright Chromium, set `PLAYWRIGHT_CHANNEL=chrome` in the environment.
Screenshots, failure traces, and an example complete report PDF are written under
`test-results/` and are not committed.

`bun run test:pilot` runs the production-bundle desktop/phone acceptance flow.
It needs disposable provisioned workspaces and an ignored fixture selected by
`PILOT_TEST_FIXTURE`; set `PILOT_TEST_ORIGIN` for an isolated cloud preview.
Pilot screenshots and traces stay in the ignored `.superpowers/pilot-test-results/`.
Never point acceptance seeding at a real customer's workspace.

Browser tests cover reports exceeding 20 records, inspection evidence, failed
draft persistence and retry, navigation/unload protection, nested modal keyboard
navigation, pending photo processing, inspector-only edits, reverting saved input,
mobile menu resizing, submission/issue treatment, and 375px/768px/1440px layouts.

## Preview hosting

`bun run build` produces `dist/`. Hosting must serve `index.html` as the
fallback for application paths such as `/app/assets/eq-001` and `/a/eq-001`.

The Cloudflare Pages project is `tagronda`, with `/api/*` served by Pages Functions.
Its native SPA fallback serves application
routes; do not add a root `404.html` without replacing that fallback. Deploy the
built directory using `wrangler pages deploy dist --project-name tagronda
--branch main` with credentials supplied through the environment. No credentials
belong in this repository. See [the launch record](docs/LAUNCH.md) for domain and
deployment status. See [pilot operations](docs/pilot-operations.md) for private owner
provisioning, preview/production bindings, migrations, backup/restore and trial limits.

Demo data and local drafts are browser-local. Use the demo reset in Settings to return
to the initial examples. Failed saves preserve current input and display a retry
action; the browser warns before leaving with unsaved inspection input.
While a photo is being processed, saving and submission wait for the attachment.

## Inspection operations

The behaviors below are also available in the demonstration. Its browser locking,
role simulator and local persistence are specific to the demo. Live workspaces use
server commands, authenticated actors, database revisions and workspace isolation.

- `/app/plans`: daily, weekly or monthly plans for selected equipment, a published
  checklist and an inspector. Agenda and calendar show linked task executions.
  Creation and reload use the same bounded window: the previous 30 and next 90
  days. Existing older task instances remain available. Failed materialization is
  reported rather than silently creating an incomplete plan.
  Month-end schedules retain their original day; completed instances are retained.
- `/a/:id/request`: standalone QR repair requests with priority and optional photo.
  Requests enter `/app/issues` unassigned. Assign a technician and deadline, start
  treatment, submit notes/photos for review, then approve or return with a reason.
  An order awaiting review still counts as unresolved.
- `/app/templates`: create/copy checklists, save drafts separately, test a phone
  preview, and publish a numbered version. Fields support conformity, numbers,
  single choices and dates; conditions refer to preceding answers. Out-of-range
  readings require a non-conformity description. Hidden answers are not submitted.

Scheduled inspections have separate draft keys and complete their task atomically
with the record. Reopening a completed task links to the saved result. Old browser
saves retain equipment edits when the new collections are added. Existing records
retain their question/answer snapshots; new records also retain template versions.

Writes use an origin-wide browser lock. Inspection submission reads the latest
persisted state inside the lock, so two tabs cannot replace a completed task or
erase an unrelated request. Other stale edits are rejected while keeping input.
Saving requires HTTPS or localhost and a browser with the Web Locks API.

Inspection drafts retain question snapshots. Revised questions require new
answers; prior drafts are archived before replacement and can be downloaded with
their photos. Treatment events retain each submission's evidence and assignment
events retain their technician, deadline and priority.

The demo profile switch demonstrates administrator/operator/viewer interfaces within
the current app session. It provides no real authentication or access security.
The demo does not synchronize devices. Neither mode sends email or WhatsApp messages;
live invitations are shared manually by the administrator.
