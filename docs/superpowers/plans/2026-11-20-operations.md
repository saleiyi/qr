# Inspection Operations Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, task by task.

**Goal:** Deliver the four approved frontend workflow additions end to end.
**Architecture:** Extend the browser-local domain with plans/tasks, issue events,
and separate template drafts. Pure operations/checklist helpers own invariants;
the existing state context persists atomic changes. Reuse native Modal and theme.
**Tech Stack:** React, TypeScript, React Router, Vite, Tailwind, node:test, Playwright.
**Spec:** ../specs/2026-11-20-operations.md

## Global Constraints
- Frontend only; no backend, external messaging or authentication service.
- Portuguese UI, existing routes, browser-local persistence and mock clock.
- Existing records, drafts and print evidence must continue working.
- A failed save keeps input and never advances a task/order or claims success.
- Keep monthly recurrence anchored and task completion idempotent.

## Review Focus
- Legacy saved data lacks the new arrays and must load without losing edits.
- A scheduled task must complete exactly once using its own template and draft.
- Hidden conditional answers must not produce records, failures or issues.
- Saving a template draft must not change the published form or old records.
- Review-pending orders remain open in dashboard, asset view and reports.

## Task 1: Domain and local state
Files: types/domain.ts, utils/operations.ts, utils/checklist.ts,
utils/operations.test.ts, utils/domainLogic.ts, services/storageAdapter.ts,
data/seedData.ts, context/AppStateContext.tsx, components/StatusBadge.tsx.
Interfaces: generatePlanTasks(plan, throughDate, existing); transitionWorkOrder;
visibleItems(template, answers), effectiveAnswer(item, answer), validateTemplate;
context savePlan, createRepairRequest, changeWorkOrder, saveTemplateDraft,
publishTemplate; state plans/tasks/templateDrafts. Drafts accept optional taskId.
- [x] Add/run failing pure tests for recurrence, stable completion, conditional
  fields, thresholds, invalid rules and work-order transition requirements.
- [x] Implement helpers, backward-compatible state loading and atomic context APIs.
- [x] Run domain suites and TypeScript, then commit.

## Task 2: Plans and scheduled inspections
Files: pages/PlansPage.tsx, pages/InspectionFormPage.tsx, App.tsx,
components/AppShell.tsx, pages/DashboardPage.tsx, tests/operations.spec.ts.
Consumes plan/task context and checklist helpers from Task 1. Route /app/plans;
inspection query taskId selects the task's published template and isolated draft.
- [ ] Add/run failing browser tests for plan creation, scheduled execution and
  reload idempotency, plus a legacy-storage fixture.
- [ ] Implement agenda/calendar, creation, filters, completion links and form fields.
- [ ] Run task browser cases, domain suites and TypeScript; commit.

## Task 3: Repair requests and work orders
Files: components/RepairRequestForm.tsx, pages/MobileScanPage.tsx,
pages/IssuesPage.tsx, components/InspectionReport.tsx, tests/operations.spec.ts.
Consumes createRepairRequest/changeWorkOrder. /a/:id/request is a repair form;
existing /app/issues remains the work queue. Orders retain original record links.
- [ ] Add/run failing browser cases for QR request, assignment, treatment photo,
  review rejection/approval, storage failure and read-only role.
- [ ] Implement connected request, list/board and accessible order details.
- [ ] Run task cases, original regressions and TypeScript; commit.

## Task 4: Template authoring and final acceptance
Files: pages/TemplatesPage.tsx, components/ChecklistPreview.tsx,
tests/operations.spec.ts, README.md.
Consumes separate drafts/publish APIs and checklist helpers. Published template
versions alone are used by equipment/plans; records snapshot the version.
- [ ] Add/run failing browser cases for draft isolation, publishing, branching,
  thresholds and historical snapshots; cover the five Review Focus conditions.
- [ ] Implement creation/copy/editor, publishing validation and phone preview.
- [ ] Run all domain/browser tests, TypeScript and build; inspect responsive shots.
- [ ] Request one independent whole-change review, fix material findings with
  regressions, commit and update the reviewable branch/PR and local preview.
