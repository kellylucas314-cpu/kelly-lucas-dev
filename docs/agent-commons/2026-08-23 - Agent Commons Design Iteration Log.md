# Agent Commons Design Iteration Log

Date started: 2026-08-23
Owner: Claude Code
Rule: every pass records what was checked, what was found by severity, what was fixed, and what was deliberately deferred. Screenshots use synthetic fixture data only; the live room is never captured.

## Scoring rubric (Kelly asked for a score out of 100 and a stop condition of 95)

Ten dimensions, ten points each, scored against the acceptance criteria in the research document:

1. First viewport answers the five questions at 1440 without scrolling.
2. Needs Kelly queue is correct, linked to threads, and clears when handled.
3. Threads: titles, reply in thread, derived state, resolve and reopen, no stale waiting.
4. Inbox: actionable first, reason on every item, acknowledged versus resolved kept distinct.
5. Structured notes, handoffs, and receipts are scannable, complete, and linked to project and thread.
6. Visual system: hierarchy, density, type floor, agent identity, distinct kinds without noise, brand preserved.
7. States: loading, empty, offline, reconnecting, saving, error, conflict, disabled, hover, focus, selected, new, resolved, reduced motion.
8. Accessibility: semantics, contrast, focus, keyboard, status regions, targets, reflow.
9. Responsive and stress: 390, 768, 1280, 1440, 200 percent zoom, long content, many threads, legacy data, offline.
10. Proof: model, CLI, and browser-level tests for the full human-agent scenario; all suites green; `git diff --check` clean.

Score is recorded at the end of each pass. The build is not complete below 95.

## Pass 0: baseline (2026-08-23 00:28 PT)

Environment: isolated loopback server on port 4711, fixture file in the session scratchpad, upstream config pointed at a non-existent path so nothing reached the live room. Tests before any change: room 16/16, dashboard 8/8, Magpie 3/3.

Screenshots: `screenshots/before/desktop-1440.png`, `screenshots/before/tablet-768.png`, `screenshots/before/mobile-390.png`, `screenshots/before/mobile-390-full.png`.

Findings (full list with identifiers in the research document, section 5):

| Severity | Id | Finding |
|---|---|---|
| Critical | C1 | First viewport does not show what needs Kelly; composer below the fold at 1440 by 900 |
| Critical | C2 | Tablet and mobile stack the whole rail first; no message visible in the first viewport |
| Critical | C3 | Waiting badges never clear after the awaited party replies |
| Major | M1 | No reply action, no thread view, `replyTo` never shown |
| Major | M2 | Thread ids shown as raw slugs |
| Major | M3 | No resolve or reopen; "Waiting on someone" is historical, not current |
| Major | M4 | Inbox does not explain why an item is there or separate actionable from read |
| Major | M5 | Kelly's unread is always 0 because the page acknowledges before rendering |
| Major | M6 | No structured note or handoff |
| Major | M7 | Receipts default to a shared `work-log` thread, detached from the project |
| Moderate | D1 | Stale rail copy after the HTTPS cutover |
| Moderate | D2 | 8 to 10 px meta text; `.agent-seen` about 3.2:1 on the dark rail |
| Moderate | D3 | `aria-live` on the whole feed re-announces on every poll |
| Moderate | D4 | No `aria-pressed` on filters; weak or missing focus styles |
| Moderate | D5 | Agent names truncate at 390 |
| Moderate | D6 | Slogan heading spends the rail's best space |
| Moderate | D7 | Output paths are not visually distinct from prose |
| Moderate | D8 | Sticky rail taller than a 900 px viewport hides its lower sections |
| Minor | N1 to N3 | Disabled nav tooltip only; duplicate connection disclosure; fixed toast duration |

Baseline score: 31 / 100 (1: 2, 2: 3, 3: 2, 4: 3, 5: 5, 6: 6, 7: 3, 8: 3, 9: 3, 10: 1).
