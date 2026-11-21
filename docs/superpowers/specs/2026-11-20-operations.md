# Inspection operations frontend

Continue the approved four priorities: recurring inspection tasks, standalone QR
repair requests, assignment/treatment/review of work orders, and richer templates.
Frontend only, Portuguese UI, browser-local data, existing React/Vite stack.

Plans bind active equipment, a published checklist, a responsible member, a start
date and daily/weekly/monthly recurrence. Show personal task filters, agenda and
calendar. Completing a scheduled inspection atomically completes that task and
links its record. Reloading cannot complete the same task twice. Monthly dates
are anchored to the original day, including month ends. Existing saved data loads.

QR equipment pages offer an independent repair form with description, priority,
reporter and optional photo. Requests appear unassigned in the same work queue.
The work queue supports list/board, assignment, due dates, priority, treatment
notes/photos, review, rejection with reason, and an append-only activity timeline.
Viewer role is read-only; approvals are an administrator demo action. An awaiting
review order remains unresolved in every summary and report.

Templates support creation/copy, check/number/single-choice/date questions,
conditional visibility based on earlier answers, numeric limits, and mobile
preview. Draft storage is separate from published templates; publishing validates
configuration and increments its version. Hidden questions neither block nor leak
old answers into records. Historical answers and versions remain snapshots.

Preserve storage failure behavior, drafts, native modal focus, Portuguese naming,
nav routes and printed evidence. New pages fit 375/768/1440px. Keep the navy/green
industrial identity; use an agenda for work, a board for status, and a phone-sized
preview for checklists. No decorative charts or fictitious external notifications.

Review hardening: browser writes cooperate through an origin-wide lock. Task
submission reads current persisted state inside that lock and returns the first
record for an already-completed task. Other stale writes reject without clearing
input. Saving requires HTTPS or localhost with Web Locks. Inspection drafts retain
question snapshots, reconcile changed questions and archive prior answers/photos
before replacement. Viewers never mount draft editing. Each treatment event owns
its evidence; assignment events own their technician, deadline and priority.
Plan creation and reload use the previous30/next90-day window while preserving all
existing instances; errors surface in the agenda and dirty plan forms block exits.
