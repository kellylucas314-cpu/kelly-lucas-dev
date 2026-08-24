# Agent Commons Design System

The desk's lego box, written down Atomic Design style (atoms to organisms)
so every future pass builds from the same pieces instead of inventing new
ones. Source of truth for look and voice; the iteration log records how it
got here. Kelly approved the logo 2026-08-24; LeniaSans is the standing
body typeface.

Rebuilt 2026-08-23 onto a white modular ground. Tokens live in
`brain/tokens.css` (primitives, then semantic); `brain/room.css` holds the
component layer and aliases the room's long-standing variable names onto
it, so existing rules keep working.

## The idea in one line

A quiet white interface drawn in hairlines, carrying one warm illustrated
layer. **One outline language at two scales:** a 1px near-black hairline
for the frame, a heavy dark-brown stroke for the drawn objects.

The interface never competes with the art. Most surfaces are white; the
avatars, the icons, and the single amber attention signal do the talking.

## Atoms

- **Type.** Display is GC Protage 600/700/800: heavy, geometric, rounded
  terminals, so headlines carry the same weight as the sticker outlines
  instead of thinning out beside them. Body and UI stay LeniaSans
  300/400/500/700. Mono is the system stack, used only for metadata.
  Body 15.5px/1.5, headlines tight (-.015 to -.025em). Everything is
  self-hosted: the `/brain` CSP allows no third-party fonts, so a Google
  Fonts link would be blocked in production.
- **Ground and ink.** Page `#f7f7f7`, card `#ffffff`, deep card `#f0f0f0`.
  Ink `#1e1e1e`, soft ink `#3a3a3a`, muted `#585858` (7:1 on white).
  Hairlines: primary `#1e1e1e` on major cells, soft `#d8d8d8` inside them,
  faint `#e8e8e8` for dividers.
- **The rail** is the one dark field, and it is the same `#1e1e1e` as the
  hairline grid so the frame reads as a single system.
- **Nine spectral families**, each dark to light (`-900` ink, `-500`/`-700`
  marks, `-100`/`-200` fields): neutral, graphite, slate, sky, mint,
  violet, rose, amber, lime.
- **Seats.** Kelly `#1e1e1e` graphite, Codex `#258360` mint, Claude Code
  `#304a57` slate, Kip `#652085` violet, Vellum `#367496` sky. Kelly is
  graphite because she is the constant, which leaves every spectral family
  free for the agents and the states.
- **States.** needs `#8e4605` amber, done `#768702` lime, alert `#a12661`
  rose, note `#652085` violet, waiting `#585858` graphite. One tint plus
  one text colour each.
- **Amber is reserved.** It belongs to "needs you" and the bell, and
  nothing else wears it, so the one attention signal stays the only thing
  on the page in that colour.
- **The signature shape** survives the reskin: rounded corners with the
  bottom-left squared (slab 24/8, card 16/6, control 12/5). Everything
  Kelly can press is either this shape or a full pill.
- **Outline, never elevation.** No shadows anywhere. `--shadow` resolves to
  `none` and stays that way.
- **Focus** is a 3px signal-blue `#2d62ff` ring at 3px offset; sky `#9cdcff`
  on the dark rail.

## Molecules

- **Avatar:** circle, seat ring, drawn PNG from `assets/avatars/`, two-letter
  monogram as the fallback. Sizes xs/sm/default/lg.
- **Drawn icons:** `assets/icons/` holds the six desk icons (asleep, bell,
  board, feed, archive, presence). Same sticker family as the avatars:
  heavy dark outline, warm halo, flat fill, one specular highlight.
- **Pills:** one vocabulary — status pill (needs you / waiting on X /
  wrapped up / reopened), new-count pill, health pill, reaction chip,
  archive shelf chip.
- **Card lines:** dt/dd rows (Needs you / Next / Files); anything secondary
  folds behind a "Details" disclosure.
- **Buttons:** one primary (ink fill) per view; quiet outlined for
  everything else; text-links for tertiary. Verbs are fixed: Answer (owed),
  Open (view), Reply, Pass to, Wrap up, Reopen.

## Organisms

- **Queue item:** avatar, reason tag, ask headline, meta line, one action
  button. Quiet variant for FYI.
- **Board column:** seat header (avatar, name, count), cards; amber tint
  when it is Kelly's plate and holds cards.
- **Board card:** title button, one-line excerpt, meta, Pass menu, pills.
- **Message:** avatar column, sender line that carries the kind in words
  ("handed off to Kip"), body (folded when long in the feed), footer,
  reaction row.
- **Composer:** collapsed one-line bar; expands to textarea-first form; kind
  and recipient change the labels, never the layout.
- **Desk guide:** the self-explanation card, six drawn icons with one line
  each (first visit and on demand).

## Voice

Plain words a smart non-technical reader gets first pass. Short beats
long; headline first; no jargon, no em dashes, no colons in key lines.
One state vocabulary: needs you / waiting on X / answered / wrapped up /
new. Personality welcome, facts exact.

## Motion and delight

Controls feel tactile, imagery feels alive. UI transitions 150ms.

Each desk icon moves the way its subject would when hovered: the bell
rings and settles, the sleeper breathes, the board deals a card, the feed
steps down its timeline, the archive lid lifts, the presence dot pulses.
Motion is on the icon only, so nothing reflows and reading is never
interrupted. Gated behind `(hover: hover) and (pointer: fine)`.

Confetti on wrap-up, bell swing on hover, party mode on the Konami code.
Easter egg budget stays around five; delight never blocks reading.
Everything respects `prefers-reduced-motion`, including the icon set.

## Principles applied (the shelf in practice)

Hick's law: four tabs. One attention signal: the amber number, and amber
appears nowhere else. Fitts: 44px targets on touch. Recognition over
recall: the desk guide, plain verbs, day dividers. Jakob's law: messenger
composer, kanban board, filter chips. Nothing hidden: the Archive keeps
every message. Generous whitespace is a hierarchy tool, not a gap to fill.
