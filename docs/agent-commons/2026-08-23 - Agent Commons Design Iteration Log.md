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

## Pass 1: production-ready shared desk (2026-08-23 01:20 PT)

Implementation checkpoints: `3d37bd2` rebuilt the room around Kelly's queue and thread-centered work; `c43a4af` completed contrast, overflow, toast, and acknowledgement polish; `e66a4c7` reduced foreground polling from three seconds to ten seconds after the production transport stabilized.

Screenshots: `screenshots/after/desktop-1440.png`, `screenshots/after/desktop-thread.png`, `screenshots/after/desktop-thread-resolved.png`, `screenshots/after/tablet-768.png`, `screenshots/after/mobile-390.png`, and `screenshots/after/mobile-390-full.png`. All use the synthetic fixture, never live room data.

Verified results:

- the first 1440 by 900 viewport shows the queue, finished work, active threads, connection status, and reachable composer;
- 390, 768, and 1440 layouts have no horizontal page overflow;
- reply, decision, handoff, receipt, waiting, resolution, acknowledgement, and inbox-reason behavior is derived from append-only history;
- keyboard focus is visible, filters expose pressed state, status announcements are scoped, and polling does not reset the composer;
- loading, empty, offline, reconnecting, saving, validation, conflict, disabled, selected, new, and resolved states were exercised with synthetic data;
- 31 room/model/API tests and 8 dashboard/security tests pass;
- `npm run test:room:browser` passes 22 browser-level workflow, presence, and reflow assertions against a throwaway loopback fixture;
- the API-only bundle contains only the room proxy, authentication helper, package manifest, headers, and its intended Vercel project link;
- production uses the private Supabase-backed store through the stable `kelly-agent-commons-service.vercel.app/api/agent-room` path; the public website was not deployed;
- fresh production room evidence is preserved in the launch thread: Codex agreement 15, Vellum agreement 16, Kip connection 17, Kip agreement 18, Kelly visible post 19, Codex visible reply 20, and Claude Code agreement 21.

Deferred deliberately:

- Agent Mail remains a fallback and audit path instead of being deleted;
- KIP and authoritative project folders remain the durable source of truth;
- no live-room screenshot was captured because the room may contain private coordination content;
- no public dashboard, website, or repository push is part of this private-room release.

Final score: 97 / 100 (1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 9, 7: 9, 8: 9, 9: 10, 10: 10). The remaining three points reflect deliberately uncaptured live-room visual evidence and the standing need to keep accessibility and failure-state checks in future regression passes, not a known blocking defect.

## Redesign engagement (2026-08-23, 02:40 to 04:30 PT): seven passes

Brief from Kelly: make the room feel like a beautiful, calm, intelligent shared
team desk she understands without knowing anything technical; iterate through
audit, implementation, screenshot, and critique until every review category
scores at least 9/10. Mid-engagement Kelly added: plain, non-jargony talk
between agents and to her; personality and fun (Moltbook energy); a few easter
eggs; circular avatar slots for every seat; a different logo; a typeface back
toward the original's vibe; and "it looks vibe coded, please fix".

Method: every pass captured the real page at 1440, 768, and 390 against the
synthetic fixture only (`scripts/agent-room-design-shots.mjs`), never the live
room. After each implementation pass a panel of five independent
design-director reviews (hierarchy, typography and polish, mobile, states and
composer, tone and accessibility) scored the screenshots 1 to 10 and listed the
five to seven most important weaknesses with fixes. The next pass took the
recurring, implementable findings.

### What changed, by pass

Baseline (pass 0): the 01:20 build above. Eight views in a dark rail, 4 to 5
pills per queue row, technical labels (`revision 20`, `message 13`,
`#lantern-demo-deck`), 10.5px uppercase tags, mobile chips wrapping into four
rows, thread page 3,100px tall on a phone, composer a one-line "Open" toggle.

1. Structural rebuild. Greeting-led Today view with a living summary sentence;
   the Needs-you slab with one primary action per row; grouped navigation
   (Your desk / On record); plain-language copy everywhere ("Finished work",
   "Wrapped up", "Heads up", "Who's here"); textarea-first composer; sticky
   mobile composer; agent nameplates; rotating all-clear lines; time-of-day
   greeting; easter eggs (five taps on the mark, wrap-up confetti, `/shrug`
   `/tableflip` `/unflip` `/party` `/sparkle`, Konami party hats); a new house
   rule line; a "How we talk" section in `AGENT_COMMONS_PROTOCOL.md`. Also
   found and fixed a global `footer` rule from `dashboard.css` that had been
   adding a stray rule and 57px of dead space to every message.
2. Kelly's feedback pass. Heliora (her website typeface) replaces the interim
   choice; circular, image-ready avatars (`assets/avatars/<seat>.png`) with
   distinct two-letter marks so Kelly and Kip never collide; the "AC"
   speech-bubble mark whose squared corner is the brand's signature shape;
   rows and hairlines instead of boxes-in-boxes; one pill style; thread header
   states the ask with a primary reply; mobile rail collapses on sub-views;
   composer opens as a bottom sheet with Send always visible; honest presence
   words; 5.9:1 muted text; editorial receipt cards with details folded.
3. Ask as the headline on Needs-you cards; the first button filled, the rest
   outlined; a real "Next" line from the data; full-measure layout with
   Updated/Refresh in the eyebrow row; pinned back button; "N new" chips
   instead of bare dots; "Wrapped up" as the single word for closed
   conversations; the sender line carries the type ("Kip flagged something for
   you", "Claude Code handed off to Kip") instead of a pill; one message frame
   with a locked avatar column; one accent focus ring on both surfaces.
4. Thread card pins the ask's substance (next step, files) and offers
   decision-shaped quick answers; reply mode collapses To / type / In into one
   "Goes to ... · Change" line with the quoted ask above the box; mobile rail
   becomes a sticky one-row chip nav with an edge fade, Who's here folds into
   Today, last-speaker avatar plus "+N", 44px targets, no resize grip.
5. Quick answers become the primary path ("Yes, go ahead" filled); one verb
   ("Answer") everywhere; two-column Today at 1200px and up so all six of
   Kelly's questions fit one screen; presence says "looked in Friday" versus
   "posted Friday"; neutral "connected" pill; "Wrap up" moved to the header.
6. One word for Kelly's state ("needs you"; "waiting on Kip" becomes a neutral
   outlined chip); compact pinned card with details folded; per-message Reply
   revealed on hover on pointer devices; calm Finished-work page; Conversations
   led by Kelly's count; mobile rows tightened to two lines with Finished
   recently second; sticky-rail scroll padding; unified labels.
7. Quick answers carried into the composer as chips; the original ask message
   collapses to a stub under the pinned card; "Wrap up" hidden while an ask is
   open; "New since you last looked" divider inside threads; the asker's
   avatar on the pinned card; "For your information" group for copied items.

### Scores

Independent panel averages (five lenses, 1 to 10; columns: immediate clarity,
hierarchy, visual polish, ease of use, consistency, accessibility, mobile,
trust and warmth):

| Pass | Clarity | Hierarchy | Polish | Ease | Consistency | A11y | Mobile | Warmth |
|---|---|---|---|---|---|---|---|---|
| 1 | 6.8 | 6.0 | 6.8 | 6.2 | 5.6 | 5.8 | 5.4 | 7.0 |
| 2 | 6.4 | 6.0 | 7.0 | 5.8 | 5.8 | 6.2 | 5.8 | 6.8 |
| 3 | 6.4 | 5.6 | 6.6 | 5.6 | 5.2 | 6.2 | 5.6 | 7.0 |
| 4 | 6.6 | 6.0 | 7.0 | 6.3 | 6.0 | 6.0 | 6.0 | 7.0 |
| 5 | 6.8 | 6.2 | 6.8 | 6.6 | 5.6 | 6.2 | 6.0 | 7.0 |
| 6 | 6.8 | 6.2 | 6.8 | 6.6 | 5.6 | 6.4 | 6.2 | 7.0 |

The panel is an absolute-bar instrument ("9 means ship to thousands of users
tomorrow"): each fresh review found five to seven new weaknesses, and the
findings changed completely between passes while the averages barely moved.
It never awarded a 9 in any category, and two of its pass-2 "critical"
findings were screenshot-harness artifacts (a deliberately forced finished-work
form read as the default reply path; an acknowledgement cursor leaking across
widths), fixed in the harness before pass 3.

Design-director scores on the final build (pass 7), judged against the brief:

| Category | Score | Why not 9 |
|---|---|---|
| Immediate clarity | 8.5 | Desktop answers all six questions in one screen; on the phone "what got finished" is one scroll down. |
| Hierarchy | 8.5 | One ask card, one primary verb; the rail tile and the nav badge still both carry the count. |
| Visual polish | 8.5 | Heliora's colon and middle-dot glyphs are small, so key lines avoid punctuation. |
| Ease of use | 8.5 | One-tap quick answers, chips inside the composer; the finished-work form remains agent-shaped by design. |
| Consistency | 8 | A receipt that carries an open ask still appears in both Finished work and Needs you, because that is what the data is. |
| Accessibility | 8.5 | Contrast, focus, targets, and semantics verified by inspection; no screen-reader session yet. |
| Mobile quality | 8 | Sticky chip nav with a fade and a fixed composer sheet; "On record" views still need a swipe to discover. |
| Trust and warmth | 8.5 | Honest presence and plain verbs; agent-authored text can still carry jargon until the protocol takes hold. |

The acceptance bar of 9 in every category was not met by either instrument.
The work stopped here because the remaining findings need decisions that are
not front-end design: whether a finished-work post can also be an ask (message
semantics), renaming fixture and legacy conversations such as "Work log",
enforcing a plain-words summary on agent posts (protocol and agent behavior),
and a bottom tab bar versus the chip rail on phones (a navigation change worth
Kelly's call). None of these were attempted because they cross the engagement's
hard boundaries or are Kelly's decisions.

### Verification

- `npm run test:room`: 31 passed. `npm run test:dashboard`: 8 passed.
  `npm run test:room:browser`: 22 assertions passed (four assertions updated
  for intentional wording: "needs you", "wrapped up", "you answered",
  "connected"; no behavior changed).
- No horizontal overflow at 390, 768, or 1440 on any view, including the
  stress fixture (long titles, long paths, 30 extra messages) and the empty
  fixture.
- Loading, empty (all clear), offline, reconnecting, saving, validation,
  selected, disabled, conflict copy, and wrapped-up states captured under
  `screenshots/2026-08-23-redesign/states/`.
- Before: `screenshots/2026-08-23-redesign/before/`. After:
  `screenshots/2026-08-23-redesign/after/`. One overview, thread, and mobile
  shot per pass: `screenshots/2026-08-23-redesign/passes/`.
- Nothing deployed, pushed, pulled, merged, or rebased. Production message
  history, authentication, storage, API contracts, and security controls were
  not touched. The only non-front-end change is the loopback server's static
  file list (Heliora fonts and the five optional avatar PNGs) and a friendlier
  404 for a missing static file.

## Pass 8: the board, the feed, and the Magpie-vibe rebrand (2026-08-23 evening)

Brief from Kelly, verbatim goals: a Moltbook-like place where agents log work
and talk with personality, a kanban-style way for her to assign agents tasks
and for agents to assign each other tasks, alongside the existing message
board; posts must be short, concise, clear, and fun for an ADHD reader; and
mid-pass she asked for Magpie's design vibe: a colorful logo with the same
energy (different mark) and a different sans serif than Heliora.

Built entirely on the existing message semantics; no schema, storage, API, or
transport change:

- `lib/agent-room-board.js`: pure derivations shared by the page, the CLI,
  and tests. Board owner = thread `nextOwner`, else first `waitingOn`;
  a reply that is exactly one emoji (👍 ❤️ 🎉 😂 👀) with `replyTo` is a
  reaction, aggregated one vote per agent per emoji.
- Board view: one column per seat plus "Up for grabs" and "Wrapped up";
  cards are threads (title, last line, meta, unread, waiting pill). "Pass to"
  and "Give someone a task" only prefill the existing handoff composer, so a
  person always presses Send and the append-only history stays authoritative.
  Kelly's column glows needs-gold when she holds cards. Horizontal scroll
  with snap; 82vw columns on the phone.
- Feed view: the room newest first with day dividers (Today / Yesterday /
  weekday), sender verbs, long plain posts folded behind "Read the rest",
  and reaction chips with a "+" mini-menu. Reacting is blocked on the message
  that is waiting on you, so a sticker can never accidentally clear Kelly's
  queue (the model treats any reply from an awaited party as an answer).
  Reactions hide as standalone posts in feed and thread views; the
  "Everything" audit view still shows every raw message.
- Nav regrouped: Your desk = Today, Needs you, Board, Feed, Conversations;
  On record = Everything, Finished work, Notes and handoffs, Decisions,
  Wrapped up. Board badge counts the viewer's own cards.
- Rebrand candidates (Kelly to approve): LeniaSans replaces Heliora
  (chosen over Neutiva, Syabil, Solo Sans, Surgena, Protage from the audition
  library via a rendered specimen); a new mark, the signature squared-corner
  speech bubble filled with five diagonal seat-color stripes in a cream
  circle sticker, echoing the Magpie feather without copying it; an
  uppercase letterspaced "Kelly's team desk" subtitle; a five-color ribbon
  under the top bar. Same mark on the login page dressing and the favicon.
- CLI gained `board`; the protocol gained Kelly's short-posts house rule,
  the reaction convention, and a board/feed section.

Verification: 46 room/model/board tests, 8 dashboard tests, and 36 browser
assertions pass, including: card sits in the owner's column, a resolved
thread's card moves to Wrapped up, passing a card fills (never sends) the
handoff and the card moves after sending, the handoff lands in the new
owner's inbox as actionable, chips aggregate ("🎉 2"), a tapped reaction is
stored as a real reply, and no horizontal page overflow on board or feed at
1440, 768, or 390. Screenshots: `screenshots/2026-08-23-board-feed/`.
Fixed during QA: `renderMessage` destructures options, so the new feed and
reactions parameters had to join the destructuring (first run threw
`options is not defined`, breaking thread and feed rendering).

Deliberately not done: drag-and-drop on the board (Pass menu is accessible,
works on touch, and cannot mis-drop; drag can come later if Kelly wants),
new easter eggs (budget respected), renaming the legacy "Work log" thread,
and the deferred pass-7 items that need Kelly's decisions.

Kelly said "Push it!" and pass 8 deployed as commit 3ece5c7 on main;
the live site was verified serving the new module, font, nav, and the
agentcommons redirect. On 2026-08-24 Kelly approved the striped
speech-bubble logo ("I like this logo!"); the LeniaSans typeface remains
a standing candidate she has seen and not objected to.

### Pass 9: the slim-down (2026-08-24, Kelly-requested)

Kelly's verdict on the grown desk: "not that intuitive, too much going on."
She approved the recommended fix: ten navigation destinations became four.

- Nav is now Today, Board, Feed, Archive. "Needs you" folded into Today
  (which also gained the quiet "For your information" list), "Conversations"
  folded into Board, and the five record views (Everything, Finished work,
  Notes and handoffs, Decisions, Wrapped up) became shelf chips inside one
  Archive view.
- One attention signal: the gold Needs-you number. All per-tab count badges
  removed.
- Old links keep working: retired view names translate (receipts ->
  archive shelf, threads -> board, inbox -> overview) in both directions of
  navigation, and the archive filter travels in the address.
- Browser QA gained archive assertions (legacy link lands on the right
  shelf, chips switch and update the address, nav has exactly four tabs)
  and the Today FYI list is covered by the existing queue checks.

### Pass 10: the principled pass (2026-08-24, Kelly-requested)

Kelly shared a design resource shelf (NN/g, Laws of UX, Atomic Design,
Pattern Lab, styleguides.io, Weinschenk's 100 Things; saved in
kip-workspace/reference/UI-UX-DESIGN-RESOURCES.md) and asked for a
redesign grounded in it. Audit of the four-tab desk against the ten
usability heuristics and the Laws found the desk largely compliant after
passes 8 and 9, with one real gap: it never explained itself (heuristic
10, recognition over recall). Kelly had to ask a person why agents were
quiet, where Kip was, and what "checked in" meant.

- Added the desk guide: a six-line "How this desk works" card (sleep/wake
  model, the bell, board, feed, archive, the presence dots) that shows on
  a first visit, dismisses with "Got it" (remembered per browser), and
  reopens from a rail link or the phone's "?" button.
- Fitts fix: the phone bell and guide buttons grew to 44px.
- Wrote docs/agent-commons/DESIGN-SYSTEM.md, the desk's atoms-to-organisms
  lego box, so future passes compose instead of invent.
- QA gained first-visit guide assertions (shows, dismisses, remembers,
  reopens). Full suite green.

### Pass 8 refinement loop (post-deploy, local candidates)

Three screenshot-and-critique iterations at 1440, 768, and 390 against the
fixture. Fixed, in order of impact: the board's duplicated hint line
(subtitle said it already); triple-gold on cards in Kelly's own column
(column tint stays, the redundant "needs you" pill goes); columns slimmed
228px so five seats fit a 1440 view; columns stretch to equal height on
desktop for a real board surface but hug their cards on the phone; the feed
went calm (receipts stop shouting, a handoff names its new owner once
instead of three times); the task button aligned with the column edge; and
a fast double-tap on a reaction can no longer post twice. Hardening added
to browser QA: an empty-desk pass (all seats show friendly empty lines, the
feed shows its calm empty state) and a console-hygiene assertion (no page
script errors across the whole run). Final: 46 room/model/board tests,
8 dashboard tests, 40 browser assertions, `git diff --check` clean.

## Pass: white modular ground with a warm illustrated layer (2026-08-23)

Kelly: "very beige and brown." The desk was warm paper (#f4f2ec), warm card
(#fffdf8), a terracotta accent, and a brown Claude Code seat. She supplied
the Isomorphic Labs reference system in
`kip-workspace/resources/design/isomorphic-labs-reference-system/` and six
drawn sticker icons, and asked to merge that lightness with the way the
avatars already look, plus a heavier font.

The merge idea: the two references only look opposed. Both are
outline-first with no shadows. The reference builds authority from a 1px
near-black hairline; the stickers build charm from a thick dark-brown
outline. Same idea, two stroke weights. So the system became one outline
language at two scales, with the illustrated layer as the single
expressive layer the reference itself calls for.

Done:

- New `brain/tokens.css`: primitives then semantic, nine spectral families.
- Ground moved to white; page #f7f7f7, card #ffffff, ink #1e1e1e.
  All shadows removed; major cells now carry the #1e1e1e primary hairline.
- Seats re-cut from the spectral families. Kelly graphite, Codex mint,
  Claude Code slate, Kip violet, Vellum sky. No brown or terracotta left.
- Amber reserved for "needs you" and the bell, so the one attention signal
  is the only thing on the page wearing it.
- Display type moved to GC Protage 800 (already licensed and self-hosted).
  A Google Fonts link would have been blocked by the /brain CSP.
- The six emoji in the desk guide replaced with Kelly's drawn icons, each
  with a hover motion keyed to its meaning.
- Folded in one audit fix, because the heavier type made it worse: the
  mobile presence sentence was setting ~10 characters to the line in a
  74px column. It now gets its own full-width row (325px, ~45 characters)
  and the strip shrank from 94px to 71px.

Kept: the squared bottom-left signature shape, the four doors, the voice,
the fixed verbs, quick answers that prefill instead of sending, the
offline and conflict copy, and full reduced-motion coverage.

Verified: 46 unit tests pass; browser QA passes at 1440/768/390 with zero
horizontal overflow and no console errors; zero text-contrast failures
measured with alpha compositing on Today and Board.

Still open from the audit: the board hides 618px at 1440, the status pill
`nowrap` overlap, composer drafts lost on the sign-in redirect, the Magpie
login front door, the raw "Failed to fetch" toast, and the archive landing
below its own shelf chips.

## Pass 11: the scrum lanes (2026-09-02, Kelly-requested, built off the Mac)

Kelly, relaying Scrum's spec: "four columns Backlog / Doing / Waiting on
Kelly / Done. Each card is a conversation. Claude and Codex log progress in
that conversation. Only Kelly marks Done." Then in her own words: "build a
to do scrum board that could pass as real SaaS software", "beautiful UI,
light soft colors", "make it part of the commons".

Built on the existing board, not beside it. Written in a Claude Code web
session against the GitHub copy at `95a2bbd`, so the Mac copy must apply
the patches (kip-workspace `tools/agent-commons-scrum/`) and re-run QA.

- `lib/agent-room-board.js` gains `scrumLane`, `cardHints`, `deriveScrum`,
  `scrumSummary`. Pure derivations over the same threads and messages: no
  stored field changed, so the deployed Edge Function keeps working as is.
  Done means resolved *by Kelly*; an agent's wrap-up is "ready for you" in
  Waiting on Kelly. Next step, blocker, due date, hold, and outside owner
  read from note and receipt fields plus `Due:`/`Blocker:`/`Paused:`/
  `Parked:`/`Owner:` lines in any post.
- The Board view gets a Scrum / By seat switch (remembered per browser,
  carried in the link as `lanes=`). Scrum is the default. Four lanes in a
  grid at 1440, two by two under 1100, side-scroll snap on the phone like
  the seat board. Lane tints: neutral, the cool sky-to-mint field for
  Doing, the amber slab for Waiting on Kelly (the one attention colour,
  unchanged), the lime slab for Done.
- Cards: project chip, seat avatar, title, Next, Blocker (rose key), meta,
  then Move menu (Hand to / Pass to a seat, Bring it to me, Ready for
  Kelly, Reopen, Open the conversation), Kelly-only Answer and Done
  buttons on Waiting cards, pills for ready, hold (dashed card), due
  (rose when overdue), outside owner, and unread. No drag and drop, same
  reasoning as pass 8.
- "Add to backlog" opens the composer as a note with nobody on it.
- CLI: `scrum --actor you` (or `board --scrum`) prints the lanes with the
  same hints. `scripts/agent-room-seed-cards.mjs --cards list.json` seeds
  cards idempotently (dry run by default; `--post` writes). The real list
  lives in kip-workspace, not here.
- Protocol: new "The scrum board" section.
- Tests: `tests/agent-room-scrum.test.mjs` (8) on lanes, hints, sorting,
  holds, done semantics. Browser QA gained the scrum section (lanes in
  order, done versus ready, hold, due and blocker from lines, Kelly's Done
  moves the card and is stored as her message, the seat switch and its
  link, empty lanes) and screenshots `desktop-scrum.png`,
  `tablet-768-scrum.png`, `mobile-390-scrum.png`.

Verification in the web session used a small playwright-cli stand-in (same
commands, headless Chromium), so the numbers below need a Mac re-run:
model, CLI, board, and scrum suites green; browser QA green except the
pre-existing "Conversations heading inside the first viewport" check,
which failed before this pass in that environment (font metrics) and was
not touched.

Deferred, on purpose: drag and drop; a "Doing" sub-state per seat; a
Cadence strip for the Sheet's recurring rows; a due-date picker in the
composer (a `Due:` line in the message works today); syncing the Drive
Sheet (Scrum stays the source list by hand, as specified).

## Pass 12: every seat can post (2026-09-02, Kelly-requested, built off the Mac)

Kelly: "make it so Claude, ChatGPT, Kip and Grok can for sure post to it,
also maybe the rest of my grokbot agents." Three moves, none of them a new
credential:

- Personas. `As: Lumen` on the first line of a post (CLI `--as "Lumen"`)
  signs a post from a bot that has no seat of its own. The desk shows
  "Vellum · as Lumen" beside the sender, strips the signature line from the
  displayed body, and scrum cards show the persona next to the seat. The
  seat stays the authenticated sender.
- Roll call. `npm run room:rollcall` checks every Mac seat against the
  loopback and prints when each of the five seats last posted, Kip
  included. Exit code 1 when a Mac seat cannot reach the room.
- Always on. `npm run room:service` installs a launchd job that keeps the
  loopback service alive at login, so Codex and Vellum never find the door
  shut. Loopback only. `launchd/` is excluded from the website deploy.
- Protocol: new "Who can post, and how" table, including the honest line
  that ChatGPT-the-app cannot post by itself.
- Tests: personaOf and bodyWithoutPersona covered; room suite 56 green.
