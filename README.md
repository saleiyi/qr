# Ativos frontend demonstration

Portuguese equipment records, QR labels, inspections, issue treatment, and
printable reports. This is a frontend prototype: application data and inspection
drafts stay in the current browser's local storage. It does not provide backend
accounts, payments, or synchronization between devices.

## Development

Install Node.js and Bun, then use the existing lockfile:

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed by Vite. The equipment scan pages use `/a/:id`; a
phone needs a reachable preview URL to open a QR link generated on another device.

## Verification

```sh
bun run lint
bun run test
bun run build
bunx playwright install chromium
bun run test:e2e
```

The browser suite starts Vite on `127.0.0.1:4173`. To use an installed Chrome
instead of Playwright Chromium, set `PLAYWRIGHT_CHANNEL=chrome` in the environment.
Screenshots, failure traces, and an example complete report PDF are written under
`test-results/` and are not committed.

Browser tests cover reports exceeding 20 records, inspection evidence, failed
draft persistence and retry, navigation/unload protection, nested modal keyboard
navigation, pending photo processing, inspector-only edits, reverting saved input,
mobile menu resizing, submission/issue treatment, and 375px/768px/1440px layouts.

## Preview hosting

`bun run build` produces `dist/`. Static hosting must serve `index.html` as the
fallback for application paths such as `/app/assets/eq-001` and `/a/eq-001`.

Drafts and demo data are browser-local. Use the reset action in Settings to return
to the initial examples. Failed saves preserve current input and display a retry
action; the browser warns before leaving with unsaved inspection input.
While a photo is being processed, saving and submission wait for the attachment.

## Inspection operations

- `/app/plans`: daily, weekly or monthly plans for selected equipment, a published
  checklist and an inspector. Agenda and calendar show linked task executions.
  The browser materializes a 90-day window and extends it when data loads.
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

The profile switch demonstrates administrator/operator/viewer interfaces within
the current app session. It provides no real authentication or access security.
These operations do not send emails or WhatsApp messages or synchronize devices.
