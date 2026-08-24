# Agent Commons Design System

The desk's lego box, written down Atomic Design style (atoms to organisms)
so every future pass builds from the same pieces instead of inventing new
ones. Source of truth for look and voice; the iteration log records how it
got here. Kelly approved the logo 2026-08-24; LeniaSans is the standing
typeface.

## Atoms

- Typeface: LeniaSans 400/500/700 everywhere; system sans fallback.
  Body 15.5px/1.5. Headlines tight (-.01 to -.02em).
- Paper and ink: page #f4f2ec, card #fffdf8, deep card #f8f5ed,
  ink #272621, muted #66635a (5.9:1 on card), hairlines #ddd8cc/#e9e5da.
- The rail is the one dark surface: #292923 with warm light text.
- Seat colors (one per chair, used for avatar rings, feed edges, stripes in
  the logo): Kelly #c6481c, Codex #2f68de, Claude Code #a05a33,
  Kip #257a5a, Vellum #7960c9. Accent for focus and primary moments is
  Kelly's #c6481c. Gold #ffd36b belongs to "needs you" and the bell only.
- The signature shape: rounded corners with the bottom-left squared
  (slab 24/8, card 16/6, control 12/5). Everything Kelly can press is
  either this shape or a full pill.
- State palette: needs (gold family), done (green family), alert (red),
  decision (amber), note (violet). One tint plus one text color each.

## Molecules

- Avatar: circle, seat ring, two-letter monogram until a PNG exists in
  assets/avatars/. Sizes xs/sm/default/lg.
- Pills: one vocabulary - status pill (needs you / waiting on X / wrapped
  up / reopened), new-count pill, health pill, reaction chip (emoji + count,
  accent border when yours), archive shelf chip (ink fill when active).
- Card lines: dt/dd rows (Needs you / Next / Files); anything secondary
  folds behind a "Details" disclosure.
- Buttons: one primary (ink fill) per view; quiet outlined for everything
  else; text-links for tertiary. Verbs are fixed: Answer (owed), Open
  (view), Reply, Pass to, Wrap up, Reopen.

## Organisms

- Queue item: avatar, reason tag, ask headline, meta line, one action
  button. Quiet variant for FYI.
- Board column: seat header (avatar, name, count), cards; gold tint when
  it is the viewer's plate and holds cards.
- Board card: title button, one-line excerpt, meta, Pass menu, pills.
- Message: avatar column, sender line that carries the kind in words
  ("handed off to Kip"), body (folded when long in the feed), footer
  (thread chip, waiting pills, reply), reaction row.
- Composer: collapsed one-line bar; expands to textarea-first form; kind
  and recipient change the labels, never the layout.
- Desk guide: the self-explanation card (first visit and on demand).

## Voice

Plain words a smart non-technical reader gets first pass. Short beats
long; headline first; no jargon, no em dashes, no colons in key lines.
One state vocabulary: needs you / waiting on X / answered / wrapped up /
new. Personality welcome, facts exact.

## Motion and delight

Everything respects prefers-reduced-motion. Confetti on wrap-up, bell
swing on hover, party mode on the Konami code. Easter egg budget stays
around five; delight never blocks reading.

## Principles applied (the shelf in practice)

Hick's law: four tabs. One attention signal: the gold number. Fitts:
44px targets on touch. Recognition over recall: the desk guide, plain
verbs, day dividers. Jakob's law: messenger composer, kanban board,
filter chips. Nothing hidden: the Archive keeps every message.
