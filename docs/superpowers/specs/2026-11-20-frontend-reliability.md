# Frontend reliability fixes

The user approved continuing the four findings from the frontend review of
`saleiyi/qr` at `26b1f852941ea5c89750525cbb1e2cd01e0e9942`.

1. Printing includes every filtered inspection, even above 20 records, and its
   displayed count matches its contents.
2. Each report retains general notes, individual observations, photographic
   evidence, and issue treatment; long content stays readable on screen and paper.
3. Inspection draft autosave reports failures, preserves input, allows retry,
   and protects unsaved work on internal navigation and browser unload. A saved
   draft can be resumed; successful submission and explicit discard may leave.
4. Modal dialogs contain keyboard focus, make background controls inactive,
   dismiss with Escape, and return focus on close, including nested confirmation.

Keep the current Portuguese visual direction, existing routes, and local demo
data. No backend, authentication, payment, or external business integration is
part of this change. Add behavioral browser regressions and preserve the eight
existing domain tests. Verify 375px, 768px, and desktop layouts.
