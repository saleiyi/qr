# Frontend Reliability Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan
> task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct report completeness, protect inspection drafts, and make modal
keyboard interactions reliable without adding a backend.

**Architecture:** Preserve the existing local state adapter. Extract printable
inspection content, track draft persistence outcomes, and use a shared native
dialog shell for modal focus and background isolation. Keep the current routes;
use the React Router data router to support blocking unsaved navigation.

**Tech Stack:** React 19, TypeScript, React Router 7, Vite, Tailwind, node:test,
Playwright; dependencies installed from bun.lock.

**Spec:** ../specs/2026-11-20-frontend-reliability.md

## Global Constraints

- Frontend only; use the existing local storage and mock data.
- Portuguese UI and existing routes remain intact.
- All filtered report records and their evidence are printable.
- Failed draft saves never discard input or claim success.
- Keep the eight existing domain tests passing.

## Review Focus

- Reports above 20 records and lengthy evidence span printed pages without loss.
- A storage quota failure leaves the user's notes and photos recoverable.
- Successfully saved drafts leave without unnecessary confirmation.
- A nested confirmation captures focus without closing its parent dialog.
- Canceling navigation preserves form input; submission and discard are not blocked.

## Task 1: Complete printable reports

**Files:** Create `src/components/InspectionReport.tsx`; modify
`src/pages/RecordsPage.tsx`, `src/index.css`; add browser regressions in
`tests/frontend-reliability.spec.ts` and their Playwright configuration.

**Interfaces:** `InspectionReport` consumes `records: InspectionRecord[]`,
`company: CompanyProfile`, `sites: Site[]`, `issues: Issue[]`, `dateFrom: string`,
and `dateTo: string`. It renders all records, snapshots, notes, and photos.

- [ ] Add browser tests asserting the 25th filtered record and both general and
  per-item notes and image evidence appear in the print preview.
- [ ] Run `npm run test:e2e -- --grep report`; expect those assertions to fail.
- [ ] Extract the printable content without the 20-record cap; add readable
  evidence sections and print wrapping/pagination styles.
- [ ] Rerun the report regressions, `npm test`, and `npm run lint`; expect pass.
- [ ] Commit the report implementation and regression setup.

## Task 2: Protect unsaved inspection drafts

**Files:** Modify `src/pages/InspectionFormPage.tsx` and `src/App.tsx`; extend
`tests/frontend-reliability.spec.ts`.

**Interfaces:** Continue consuming `saveInspectionDraft(draft, simulateError)`
and its `StorageResult`; distinguish the current form fingerprint from the last
successfully persisted fingerprint. Router blocking applies only to unsaved input.

- [ ] Add tests for quota failure visibility, retry, canceled navigation, saved
  draft restoration, and browser unload protection.
- [ ] Run `npm run test:e2e -- --grep draft`; expect missing failure/protection
  behavior to fail before changing the implementation.
- [ ] Add brief debounced autosave, inline saving/saved/error feedback, explicit
  retry, and unload/navigation guards; allow intentional discard/submission.
- [ ] Rerun the draft tests, `npm test`, and `npm run lint`; expect pass.
- [ ] Commit the draft implementation and tests.

## Task 3: Contain modal interactions and verify the frontend

**Files:** Create `src/components/Modal.tsx`; adopt it in `ConfirmDialog`, form,
CSV and QR dialogs, record/report dialogs, template/issue dialogs, and mobile
navigation as applicable. Extend `tests/frontend-reliability.spec.ts`.

**Interfaces:** `Modal` consumes `open`, `onClose`, accessible labeling,
`className`, children, and optional initial focus. The native dialog owns focus
containment and background isolation; close callbacks stay in each caller.

- [ ] Add keyboard tests for Tab/Shift+Tab containment, Escape, focus restoration,
  and nested confirmation; run `npm run test:e2e -- --grep modal` and observe fail.
- [ ] Introduce the shared dialog and prevent Escape from dismissing a parent.
- [ ] Run all browser tests, all domain tests, TypeScript and production build.
- [ ] Inspect desktop, tablet, and phone screenshots and a printed PDF; preserve
  unrelated behavior and fix any regressions introduced by these changes.
- [ ] Request one fresh whole-branch review and resolve material findings.
- [ ] Commit the final change and prepare a reviewable branch/PR.
