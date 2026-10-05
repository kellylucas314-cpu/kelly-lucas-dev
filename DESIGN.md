---
name: Kelly Lucas
description: A poster of a place on a big sun, Kelly’s drawings on round shapes, and bands of color with wavy edges, in her six colors plus honey and sage.
colors:
  paper: "#f8f6f1"
  navy: "#1f355e"
  teal: "#5a9e9a"
  coral: "#d6605b"
  pale-teal: "#d4e7e5"
  pale-coral: "#f6dcd8"
  honey: "#f0bf4c"
  sage: "#9fb78f"
  deep-coral: "#b5443f"
  deep-teal: "#3b7672"
  honey-tint: "#fbf0cf"
  sage-tint: "#e6ecdf"
  navy-hover: "#35496e"
  navy-soft: "#556583"
  line: "#d7d9db"
  paper-2: "#efece4"
  card: "#fcfbf8"
  rule: "rgba(31, 53, 94, 0.14)"
  rule-2: "rgba(31, 53, 94, 0.28)"
typography:
  display:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "86px"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "52px"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  lede:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.42
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  big-number:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "120px"
    fontWeight: 400
    lineHeight: 0.85
    letterSpacing: "-0.04em"
  pill:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.025em"
  entry:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  subhead:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  button:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.25
  link:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
  nav:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
  caption:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    letterSpacing: "-0.005em"
  small:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  meta:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  mono:
    fontFamily: "DM Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  pill: "999px"
  tile: "50%"
  frame: "28px"
  door: "32px"
  desk: "20px"
  code: "6px"
  focus: "6px"
  kbd: "5px"
spacing:
  gutter: "60px"
  wrap: "1320px"
  header: "78px"
  band: "120px"
  edge: "28px"
  hero-bottom: "88px"
  chapter: "96px"
  grid-gap: "48px"
  row: "16px"
  btn-gap: "12px"
  pill-gap: "22px 34px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "12px 26px"
  button-primary-hover:
    backgroundColor: "{colors.navy-hover}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.navy}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "12px 26px"
  button-line-hover:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
  button-small:
    padding: "10px 20px"
    typography: "{typography.body}"
  nav-link:
    textColor: "{colors.navy}"
    typography: "{typography.nav}"
  skip-link:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  status-dot-use:
    backgroundColor: "{colors.navy}"
    rounded: "{rounded.tile}"
    size: "10px"
  status-dot-live:
    backgroundColor: "{colors.deep-teal}"
    rounded: "{rounded.tile}"
    size: "10px"
  status-dot-private:
    backgroundColor: "{colors.deep-coral}"
    rounded: "{rounded.tile}"
    size: "10px"
  band-pale-teal:
    backgroundColor: "{colors.pale-teal}"
    textColor: "{colors.navy}"
    padding: "120px 0"
  band-pale-coral:
    backgroundColor: "{colors.pale-coral}"
    textColor: "{colors.navy}"
    padding: "120px 0"
  band-honey-tint:
    backgroundColor: "{colors.honey-tint}"
    textColor: "{colors.navy}"
    padding: "120px 0"
  band-sage-tint:
    backgroundColor: "{colors.sage-tint}"
    textColor: "{colors.navy}"
    padding: "120px 0"
  band-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    padding: "120px 0"
  door-deep-coral:
    backgroundColor: "{colors.deep-coral}"
    textColor: "{colors.paper}"
    rounded: "{rounded.door}"
    padding: "6px 48px 48px"
  door-sage:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.navy}"
    rounded: "{rounded.door}"
    padding: "6px 48px 48px"
  pill-nav-navy:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    typography: "{typography.pill}"
    rounded: "{rounded.pill}"
    padding: "10px 34px 14px 12px"
  pill-nav-sage:
    backgroundColor: "{colors.sage-tint}"
    textColor: "{colors.navy}"
    typography: "{typography.pill}"
    rounded: "{rounded.pill}"
    padding: "10px 34px 14px 12px"
  pill-nav-coral:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.navy}"
    typography: "{typography.pill}"
    rounded: "{rounded.pill}"
    padding: "10px 34px 14px 12px"
  pill-nav-honey:
    backgroundColor: "{colors.honey}"
    textColor: "{colors.navy}"
    typography: "{typography.pill}"
    rounded: "{rounded.pill}"
    padding: "10px 34px 14px 12px"
  pill-nav-deep-coral:
    backgroundColor: "{colors.deep-coral}"
    textColor: "{colors.paper}"
    typography: "{typography.pill}"
    rounded: "{rounded.pill}"
    padding: "10px 34px 14px 12px"
  pill-tile:
    rounded: "{rounded.tile}"
    size: "64px"
  shape-tile:
    rounded: "{rounded.tile}"
    size: "44px"
  step-tile:
    backgroundColor: "{colors.honey}"
    textColor: "{colors.navy}"
    typography: "{typography.mono}"
    rounded: "{rounded.tile}"
    size: "44px"
  chip:
    backgroundColor: "rgba(248, 246, 241, 0.5)"
    textColor: "{colors.navy}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "4px 13px"
  version-tag:
    backgroundColor: "{colors.honey}"
    textColor: "{colors.navy}"
    typography: "{typography.mono}"
    rounded: "{rounded.pill}"
    padding: "1px 10px"
  cursor-tag:
    backgroundColor: "{colors.deep-coral}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  toast:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  scene-frame:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.frame}"
  clip-button:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  desk-chip:
    backgroundColor: "transparent"
    textColor: "{colors.navy-hover}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
    height: "36px"
  desk-chip-active:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
  desk-search:
    backgroundColor: "{colors.card}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    height: "42px"
    padding: "0 14px 0 36px"
  desk-tile:
    backgroundColor: "{colors.paper-2}"
    rounded: "{rounded.desk}"
  kind-pill:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.navy-hover}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
  kind-pill-gallery:
    backgroundColor: "{colors.pale-teal}"
    textColor: "{colors.navy}"
  kind-pill-tool:
    backgroundColor: "{colors.pale-coral}"
    textColor: "{colors.navy}"
  kind-pill-reading:
    backgroundColor: "{colors.honey-tint}"
    textColor: "{colors.navy}"
  kind-pill-repo:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
---

# Design System: Kelly Lucas

## Overview

**Creative North Star: "A Poster of a Place"**

The site is where Kelly’s real projects live, with Magpie up front, and it opens like a poster: one of her travel drawings sitting on a big honey sun, two smaller places orbiting it on round plates, a few chunky shapes scattered around, and a pill button that swaps the place. The frame comes from Figma Slides: a calm paper page, big regular-weight type, flat chunky shapes and bands of pastel color stacked down the page with wavy or scalloped tops. The pictures are not that reference’s square product mockups; they are Kelly’s drawings in her Heliopolis style (fine navy pen, flat color), recolored into this site’s palette and always shown whole, on a shape, never in a box.

Kelly asked for color and a bit of chaos: shapes and stuff. The system gives that a budget rather than a free hand. Every page follows the same spine (header, poster, bands, pills, footer), every band is one tint, and the chaos lives in the decoration: suns that turn once every three minutes, orbs that bob, a scatter of places at nine different sizes and tilts, a "Kelly" cursor tag winking from the corner of the poster. The palette is her six colors (paper, navy, teal, coral and their pales) plus two friends she chose, honey and sage, after rejecting bright blue and violet. Navy still carries every word; the other colors carry the shapes and the bands.

Hierarchy comes from size, not weight: one typeface, Instrument Sans, at a regular 400 for an 86px display and a 16px body, with 500 as the loudest weight anywhere, and DM Mono for dates, numbers and small labels. Nothing lifts: no shadows, no gradients. Depth is overlap, a drawing in front of a sun, a sun in front of a band. Everything is round: pills, circles, blobs, arches, scalloped edges. Motion is slow and few: the spin, the bob, the poster crossfade on click, the clip demo on the Magpie page, and all of it switches off under `prefers-reduced-motion`. The v0.5 to v0.9 lab look (slabs, stickers, confetti) survives only inside the playground rooms on `lab.css`.

**Key Characteristics:**
- A poster, not a hero: every page opens with one drawing on a big round shape, with paper around it.
- Eight colors: paper and navy carry every word; teal, coral, honey and sage carry the shapes; the pales and tints are the bands.
- One typeface at a regular weight, big where it matters (86 / 52 / 26 / 22 / 16, numbers at 120, pills at 64); DM Mono for numbers.
- Round, never square: pill buttons, circle tiles, blob-clipped screenshots, arched doors, wave and scallop band edges.
- Flat: no shadows, no gradients, no borders heavier than 1px or 1.5px navy.
- Slow motion in the decoration, one authored moment per page, all gone under reduced motion.

## Colors

Eight colors on warm paper: navy writes, four strong colors shape, four tints band, and two deeps step in where paper must be the text.

### Primary
- **Navy** (`navy`): every word on every ground, the 1px rules under list rows, the 1.5px button border, the 3px focus ring, the filled button, the "In use" dot, the Magpie pill, the clip button, the toast and the skip link. 11.2:1 on paper; paper on navy is the same 11.2:1. Also 10.7:1 on honey tint, 10.1:1 on sage tint, 9.5:1 on pale teal, 9.3:1 on pale coral, so navy text reads on every band without adjustment.
- **Navy Hover** (`navy-hover`): the filled button on hover, and the design desk’s secondary text under its old name `--ink-2`. 8.4:1 on paper.
- **Navy Soft** (`navy-soft`): the quiet text: the reflex line, the scene caption, data-list terms, the tally note, the footer’s base line, the redraw’s counts and domains, and the desk’s tertiary text under its old name `--ink-3`. 5.4:1 on paper, 5.7:1 on card, 5.2:1 on honey tint, 5.0:1 on teal tint, 4.9:1 on sage tint, 4.6:1 on pale teal and 4.5:1 on pale coral: it passes AA as body text on every ground in the system, with pale coral at the edge.

### Secondary
The four colors that carry the shapes. Each is a `.c-*` class for an SVG shape and a `.bg-*` class for a round tile.
- **Honey** (`honey`): the sun on the home poster, on the Magpie and playground posters and behind the clip demo; the step tiles in a journey (first and every odd step), the newest version tag on the log, the sun that replaces a project’s number when its row is active, the outline around a freshly clipped card, text selection, and the Log pill. Navy on honey is 7.1:1, so honey can sit under text, and does on the pills.
- **Sage** (`sage`): the Log door, the suns on the design desk and log posters, orbs and tiles. Navy on sage is 5.6:1, so the Log door’s navy text passes; its tint carries the Design desk pill.
- **Coral** (`coral`): the sun mark in the wordmark, the cog behind the flying magpie, the Playground pill, the 2px underline under the current nav link, orbs, the Clip tile and the 404 sun. Navy on coral is 3.3:1 and coral on paper is 3.4:1, so coral sits under text only at pill size (38px and up) and never writes a word.
- **Teal** (`teal`): plates in the places scatter, the blob behind Log in the Log door, the quotes room shape, the desk notebook’s bullets under its old name `--mint-2`. Navy on teal is 3.9:1 and teal on paper 2.9:1, so teal never writes a word and the build never puts text on it.
- **Deep Coral** (`deep-coral`): coral darkened until paper can read on it, 5.0:1. The Playground door, the Say hello pill, the "Private" dot, the cursor tag and its arrow. Not a text color on paper in the build.
- **Deep Teal** (`deep-teal`): teal darkened until paper can read on it, 4.8:1. The "Live" dot, one plate in the scatter, and the desk’s dot tags under its old name `--live`.

### Tertiary
The band tints. A band is one of these from edge to edge, with a wave or scallop at its top.
- **Pale Teal** (`pale-teal`): the Magpie band at home and the demo band on the Magpie page; the badge in the redraw; the second step tile in a journey; the noise room plate; the desk’s gallery pill and its "mint" tiles.
- **Pale Coral** (`pale-coral`): the projects band and the Say hello band at home, the rooms band, the "what it clips" band on the Magpie page; tag chips in the redraw; the third step tile; the Playground pill’s tile; the desk’s tool pill, private and pending pills and "lilac" tiles.
- **Honey Tint** (`honey-tint`): the places band at home, the counts band on the Magpie page and the resources pile on the desk; the orbit plate on the left of the poster; the desk’s reading pill, its "sand" tiles and the system cards on its paper piles.
- **Sage Tint** (`sage-tint`): the "Built for one" band on the Magpie page, the whole log, the Heliopolis pile and the closing chapter on the desk, the Design desk pill, the desk’s "sky" tiles and the notebook pages on a paper pile.

### Neutral
- **Paper** (`paper`): the page, the header and footer, the hero and page-hero grounds, the paper band, the scene frame, text on navy and on the deeps, the inside of every redraw window, orbit plates in the places scatter, the "nothing here" room plate.
- **Paper Two** (`paper-2`): inline `code`, the redraw’s image wells, and the desk’s tiles without a picture, scale demo and default kind pill.
- **Card** (`card`): the lightest surface: the redraw’s gallery and popup windows, the desk search field, system cards and notebook pages.
- **Line** (`line`): a cool 1px gray for the quietest edges: the footer’s base rule, the nav’s rule when it wraps onto its own line on a phone, and every window, card, field and chip edge inside the Magpie redraw. 1.3:1 on paper, so it is a hairline, never a border that has to carry meaning.
- **Rule** and **Strong Rule** (`rule`, `rule-2`, navy at 14% and 28%): the design desk’s section tops, card borders, chip and search borders and library row lines. The site proper draws its rules in full navy (list rows) or `line`; the doors draw theirs in navy at 35% or paper at 70%.

### Aliases the design desk still reads
`design.js` and the desk rules were written against the earlier palette and read it by name. These are aliases, not colors: `--ink` is navy, `--ink-2` is navy hover, `--ink-3` is navy soft, `--mint` is pale teal, `--mint-2` is teal, `--lilac` is pale coral, `--sand` is honey tint, `--sky` is sage tint, `--case` and `--link` are navy, `--live` is deep teal, `--radius` is 20px, `--ease` is the shared curve and `--font` is the sans stack. New work uses the eight names and the shades; the aliases exist so the desk keeps rendering.

### Named Rules
**The Navy Carries Rule.** Every word is navy, navy hover or navy soft, or paper on navy and the two deeps. Teal, coral, honey and sage write nothing; they fill shapes, bands, tiles and dots.

**The Large Only Rule.** Navy on coral (3.3:1) and navy on teal (3.9:1) appear only under text at pill size, 38px and up. Navy on honey (7.1:1) and navy on sage (5.6:1) pass at any size, so honey and sage can carry a tile, a tag or a door of text.

**The Strong Sun Rule.** The big shape behind a drawing is a strong color, never a tint: honey first, then coral, then teal as the home poster cycles (`SUNS` in `script.js`); honey, sage, coral or pale teal on the inner posters. The tints are for bands and small plates.

**The Two Friends Rule.** Honey and sage are the only colors outside Kelly’s six. No bright blue, no violet, no third friend.

**The Deep for Paper Rule.** When paper must be the text, the ground is navy, deep coral (5.0:1) or deep teal (4.8:1), never coral or teal.

## Typography

**Display Font:** Instrument Sans (with Helvetica Neue, Arial, system-ui, sans-serif)
**Body Font:** Instrument Sans (same stack)
**Label/Mono Font:** DM Mono (with ui-monospace, SFMono-Regular, Menlo, monospace)

**Character:** Instrument Sans is a friendly, slightly rounded grotesk, self-hosted as one variable WOFF2 (weights 400 to 700, `font-display: swap`, preloaded on every page) with its OFL beside it. The build uses only 400 and 500: titles are regular weight at large sizes with tight tracking, so a heading reads like a poster line, not a shout. DM Mono (400, self-hosted) sets every `time`, the `.mono` class, step numbers, version tags, project numbers, keycaps and the redraw’s field labels, with tabular numerals so dates and counts line up.

### Hierarchy
- **Display** (400, 86px, 0.95, -0.02em): the h1 of every page. 68px at 1180 and below, 52px at 760 and below. "Say hello" at the foot of the homepage uses the same style at 96px (60px on a phone).
- **Headline** (400, 52px, 1.06, -0.02em): every section and chapter title. 36px on a phone.
- **Title** (400, 26px, 1.2, -0.01em): the door titles, "Made with" and "Private" in the Magpie stats. 22px on a phone. The same voice at nearby sizes: the Magpie note title (26px), room titles (24px) and project row titles (22px, 19px on a phone).
- **Lede** (400, 22px, 1.42, -0.005em): the paragraph under a display title, max 600px wide; also "Where to next" above the pills. 20px in the hero at 1299 and below, 19px on a phone. Section intros under a headline are 20px (18px on a phone).
- **Body** (400, 16px, 1.5): running text, the does list, the stats, door copy (17px), ledger entries (18px), prose max 40em.
- **Big number** (400, 120px, 0.85, -0.04em): the clip count on the homepage (96px on a phone); the counts list on the Magpie page uses it at 72px (56px on a phone).
- **Pill** (400, 64px, 1, -0.025em): the Where to next pills at home; 40px in the small set on inner pages; 52px at 1180 and below; 38px on a phone for both.
- **Subhead** (500, 20px, 1.3, -0.01em): the does list keys; journey step titles at 22px, bench terms and the preview’s "what" at 18px, footer column heads at 16px, ledger lead-ins and the desk’s card titles. 500 is the loudest weight in the system.
- **Button** (400, 18px, 1.25): pills; 16px in the small and phone sizes.
- **Link** (400, 18px, underline 1px at a 4px offset): standalone text links (`.tlink`), thickening to 2px on hover.
- **Nav** (400, 17px): header links; 16px on a phone. The wordmark is 20px (18px on a phone).
- **Caption** (400, 17px, -0.005em): captions under the places; 22px under the first, 20px under the poster. 15px and 19px on a phone.
- **Small** (400, 15px, 1.4): row descriptions, chips, the toast, the reflex, data-list terms, the scene caption, footer links.
- **Meta** (400, 14px): row kinds and statuses (13px on a phone), ledger dates, the footer base line.
- **Mono** (DM Mono 400, 13px, tabular): project numbers, version tags, keycaps and dates in the doors; step numbers at 15px (13px on a phone).

### Named Rules
**The Regular Weight Rule.** Display, headline and title are 400 with negative tracking (-0.02em at display and headline size). 500 marks a subhead, a term or a lead-in; 600 and 700 are loaded but unused. Nothing is bold.

**The Big Where It Matters Rule.** Hierarchy is size: 86 over 52 over 26 over 22 over 16, numbers at 120, pills at 64. A new level gets a new size, not a new weight or a new color.

**The Mono for Numbers Rule.** Dates, counts, version tags, step numbers and keycaps are DM Mono with tabular figures. Words stay in Instrument Sans.

**The Label-After Rule.** Nothing sits above a heading: no eyebrow, kicker or category line. Status and metadata follow the title (the dot row under "Magpie").

## Layout

A centered column 1320px wide plus a 60px gutter each side (1440px in all), the gutter dropping to 40px at 1180 and 20px at 760. The header is a 78px flex row: wordmark, nav, and a small pill pushed to the right; on a phone it wraps, with the nav on its own line under a 1px `line` rule.

The page is a stack of full-width bands, each padded 120px above and below (84px on a phone), each a single tint, each opening with a 28px wave or scallop that inherits the band’s color and overlaps the band above by 27px (20px tall on a phone). The hero and page-hero sit on paper with 26px above and 88px below (64px on a phone) so the first band’s edge cuts into the paper under the poster.

Grids, all `display: grid`:
- **Hero**: text 1fr beside a 640px poster, 40px gap, centered; the text column is at most 640px. The poster column narrows to 560px at 1299 and 48% at 1180, then stacks under the text at 960 (poster at most 600px, centered).
- **Page hero**: text 1fr beside a 520px poster, 48px gap; 44% at 1180; stacked at 960 with the poster first and at most 480px. `.page-hero--plain` is one column.
- **Magpie at home**: a 560px head and does column beside the art (areas "head art" / "does art"), 72px column gap; halves with a 48px gap at 1180; stacked head, art, does at 960.
- **Projects**: the list 1fr beside a 440px sticky preview, 80px gap; one column with the preview hidden at 1180. A row is 40px / 1fr / 84px / 128px with a 16px gap and 16px of padding; on a phone it is 76px / 1fr with a 68px round thumbnail in the first column.
- **Places scatter**: 12 columns, 28px by 40px gaps, nine places placed by hand (the first spans six columns, the rest three or four, with offsets from -20px to 70px); six columns at 1180 (the first full width with 12% side padding, the rest in alternating halves with a 56px stagger); 14px by 30px gaps on a phone.
- **Doors**: two columns, 48px gap, aligned to the bottom; one column at most 620px wide at 960.
- **Chapters**: 5fr / 7fr with 48px by 72px gaps and 96px between chapters; one column with 24px gaps and 72px between at 1180. The body is at most 660px (40em when it is prose); the head’s line at most 26em.
- **Rooms**: three columns, 48px by 32px gaps; two at 1180; one on a phone.
- **Counts**: three columns, 32px by 40px gaps; two at 960 and on a phone.
- **Footer**: 1.3fr / 1fr / 1fr / 1fr with 40px gaps; two columns on a phone with the brand spanning both.
- **Design desk**: four cards across, 26px by 18px gaps; three at 1100; two at 760. Notebook three, two at 960, one at 640. Library rows one column at 640.

Breakpoints, in the order they fire: 1299 (hero column), 1180 (tablet), 960 (stack), 760 (phone). The Magpie redraw answers a container query instead, at 560px of frame width. Everything is checked at 390px with the 20px gutter.

Vertical rhythm inside lists: does rows 20px, journey 22px, bench 16px, data list 14px, ledger 22px, log lines in a door 11px, each closed by a 1px navy rule (or navy at 35% and paper at 70% inside the doors). Sections step down with 64px (grids under a section head), 88px (the stats under the Magpie grid), and 52px (the does under its head).

### Named Rules
**The Band Spine Rule.** A page is header, poster, bands, pills, footer. Each band is one tint and opens with a wave or scallop; two paper sections never touch without an edge between them.

**The Paper Around It Rule.** A drawing keeps its own silhouette (trimmed WebP with alpha) and sits on a shape with room on every side. A layout that crops a drawing, boxes it, or butts it against an edge is wrong; the home poster gives the drawing 76% of the stage height and `object-fit: contain`.

## Elevation & Depth

Flat. There are no drop shadows, glows or gradients anywhere in `style.css`; there is no `box-shadow` at all; the round project thumbnail on a phone wears a 1px navy-at-18% outline, a stroke, not a lift. Depth is overlap and stacking order: on a poster the sun sits at the back (z 0), the orbs in front of it (1), the drawing in front of those (2), the two orbiting places in front of the drawing (3) and the cursor tag on top (4). A band’s wave is the band’s own color drawn over the band above, so each tint reads as a sheet laid on the last. Inside the Magpie redraw, windows are card-white with a 1px `line` edge on paper, never floating panels.

### Named Rules
**The Flat Paper Rule.** If something needs to read as separate, give it a round tint behind it, a 1px line, or put it in front of a shape. Never a shadow.

## Shapes

Round, never square. The whole shape vocabulary is one inline SVG sprite at the top of every page, every symbol on a 200-unit box centered at the origin (`viewBox="-100 -100 200 200"`) and filled with `currentColor`, so a shape is placed with `<use>` and colored with a `.c-*` class or a per-instance `--c`:

- **s-sun**: a 16-point star with rounded joins (the wordmark, with a navy circle at its center; the 404 sun; the quantum room; the Say hello pill’s tile; a decoration in the hello band).
- **s-rays**: a disc with twelve short rays (the home poster’s sun; the playground poster; the Playground door; the marker that replaces an active project’s number; the panel room; the Rome plate).
- **s-cog**: a disc ringed with eleven bumps (the Magpie and colophon posters; the cog behind the flying magpie, turning the other way; behind the Magpie note; the preview’s splat; the pixel garden and audition rooms; plates in the scatter).
- **s-blob**: a nine-armed splat (the orb on the poster’s left; the Log door; the noise room; the Log pill on the playground).
- **s-bean**: a soft kidney (the design desk poster; the pet and quotes rooms; the Santorini and Athens plates).
- **s-arch**: a round-topped arch (the log poster; the Florence and Copenhagen plates).
- **s-circle**: a plain disc (the two orbiting places; the entropy tap room; the Torres and Istanbul plates; the empty room).
- **s-ast**: a three-stroke asterisk (an orb on every poster; the Clip tile; the Magpie pill’s tile; the preview’s corner; decorations).
- **s-plus**: a thick plus (the Log pill’s tile; the plus beside the flying magpie; door and hello decorations).
- **s-quat**: four overlapping discs, a quatrefoil (an orb on most posters; the Design desk pill’s tile; the Log door).
- **s-squig**: a stroked wave (the navy orb on every poster; the Playground pill’s tile; the Transcripts tile; decorations).
- **s-arrow**: the cursor arrow, 20 units, filled deep coral with a 1.4 paper stroke.
- **blob-clip**: a `clipPath` in object-bounding-box units that gives every screenshot a soft, slightly lumpy edge: the project preview card and the room pictures (16:10, cropped to the top). Phone row thumbnails are plain circles instead.

Two utility families color them: `.c-paper`, `.c-navy`, `.c-teal`, `.c-coral`, `.c-pale-teal`, `.c-pale-coral`, `.c-honey`, `.c-sage` set `color` for a shape; the matching `.bg-*` set `background` for a round tile. One class per color and no more: shades and tints are never a shape’s color. Where a shape needs its own tilt and size, the host carries custom properties: a place in the scatter (`.pl`) reads `--c` (plate color, default paper), `--r` (rotate, default 0deg), `--s` (plate width, default 78%) and `--t` (plate center from the top, default 46%); a room picture (`.room`) reads `--c` (default pale teal) and `--r`.

Corners: pill buttons, chips, tags, the toast, the skip link, the cursor tag, the redraw’s search, badges, chips and button (999px); tiles, dots, step counters, thumbnails and the video play mark (50%); the scene frame (28px, 20px on a phone); a door, a full semicircle on top (9999px) and 32px at the bottom (26px on a phone); the desk’s tiles (`--radius`, 20px), its system cards (28px) and notebook pages (24px); inline code and the focus ring (6px); keycaps (5px). Band edges are masks, not borders: the wave tiles at 160 by 28px and the scallop at 56 by 28px (114 by 20 and 40 by 20 on a phone). Lines are 1px navy under list rows, 1.5px navy around a button, 1px `line` in the redraw and at the foot; keycaps alone have a 2px bottom edge.

### Named Rules
**The Round Never Square Rule.** No rectangle with sharp corners on a site page: a button is a pill, a tile is a circle, a frame is 28px, a screenshot is clipped to a blob or a circle, a band ends in a wave or a scallop.

**The One Sprite Rule.** New shapes go in the sprite, centered on a 200-unit box, filled with `currentColor`, and are placed with `<use>`. No inline paths, no icon fonts, no raster shapes.

## Components

### Header and navigation
- **Style:** a 78px paper row: the wordmark (a coral `s-sun` with a navy center at 30px, "Kelly Lucas" at 20px) on the left, four nav links (Magpie, Projects, Log, Playground) at 17px with 30px gaps, and a small "Say hello" pill pushed to the right. Not sticky; `z-index: 5` over the first band’s edge.
- **States:** links underline on hover at a 5px offset; the current page (`aria-current="page"`) keeps a 2px coral underline. Focus is the global ring (3px navy, 3px offset, 6px radius).
- **Phone:** the row wraps; wordmark at 18px, the pill stays on the first line, and the nav drops to a full-width line of its own (16px, 22px gaps) under a 1px `line` rule.

### Buttons
Pills, never rectangles, and never a text-arrow link.
- **Shape:** 999px radius, 1.5px navy border, 12px by 26px padding, 18px type, 10px gap before a 16px line icon (1.6 stroke, round caps); 14px for the lock.
- **Primary (`.btn`):** navy fill, paper text. Hover goes navy hover and lifts 1px (background and color over 0.15s, transform over 0.2s).
- **Line (`.btn--line`):** transparent with navy text; hover fills navy with paper text.
- **Small (`.btn--sm`):** 16px type, 10px by 20px padding; the header’s "Say hello" and "Another place". On a phone every button is 16px with 11px by 20px padding.
- **Rows (`.btn-row`, `.hero__acts`):** wrap with 12px gaps; `.btn-row--after` adds 28px above.

### Standalone text links
- **Style (`.tlink`):** 18px, underlined 1px at a 4px offset, thickening to 2px on hover. Used under a section head ("The whole art library") and in the doors ("Go play", "The full log"). Running-text links inherit navy and use a 3px underline offset.

### Status dots
- **Style:** a 10px circle, an 8px gap, then the word, always both (`.status`, `.mp-meta span`, `.row__s`).
- **Variants:** navy "In use", deep teal "Live", deep coral "Private". The Magpie page’s status row sits after the title.

### Bands
- **Style (`.band`):** full width, 120px padding each way (84px on a phone), one tint: `.band--pteal`, `.band--pcoral`, `.band--tint` (honey), `.band--sage`, `.band--paper`. `.band--cont` drops the top padding when a band continues the one above it in the same color (the desk’s video shelf under its resources).
- **Edges (`.edge`, `.edge--scallop`):** a `::before` 28px tall, 27px above the band, `background: inherit`, masked by the wave or the scallop. The footer takes the scallop too.

### The poster (signature)
The homepage hero’s right half, `.poster[data-place]`.
- **Stage:** `aspect-ratio: 1 / 0.92`. The sun (`s-rays`, 84% wide, from 8% in) turns once every 180s on the SVG root (`.spin`) and takes its color from `--poster-c`, honey by default, transitioning over 0.5s. Four orbs: a sage asterisk at the top left (13%), a honey quatrefoil at the top right (11%), a coral splat at the left (12%, 57% down), a navy squiggle at the right (13%, 40% down). The drawing fills the bottom 76% of the stage, `object-fit: contain`, bottom-anchored, in front of the orbs.
- **Satellites (`.sat`):** two small places on `s-circle` plates, the image at 82% of the plate: Santorini on honey tint at the left (22% wide, 15% down) bobbing over 9s, Kirkjufell on pale coral at the right (20%, 1% down) bobbing over 11s in reverse. 24% and 22% on a phone, flush to the edges. They load the 480px `-sm.webp` copy of each drawing, never the full file; the big drawing always does.
- **Cursor (`.cur`):** a deep coral `s-arrow` (20px) with a "Kelly" tag (deep coral pill, paper text, 13px at weight 500, 3px by 10px padding), at the bottom right of the poster, bobbing over 7s. The one cursor on the site.
- **Caption (`.poster__cap`):** centered, 20px (18px on a phone), 12px gap: the place name, then the 200px-wide "Another place" line pill with a cycle icon, hidden until `script.js` reveals it.
- **Behavior:** Torres del Paine on every load (no per-visit rotation, no storage). A click moves one step through 13 places (nine travel drawings and four Pretzel Protocol cities, `PLACES` in `script.js`, with width, height, caption and alt), the sun cycles honey, coral, teal, and if the big drawing is one of the two satellites that satellite shows Torres instead. The next drawing is warmed on hover or focus. The swap fades the drawing out over 160ms (ease-out), swaps, then fades in over 460ms on the shared curve while rising from 8px; the fade-in waits for load or error so the sun is never empty. Under reduced motion the swap is instant.

### Page hero (inner pages)
- **Style:** the same poster, smaller: 520px column, stage `1 / 0.9`, the sun at 88% wide from 6% in, the drawing at 78%. Each page picks its sun and drawing: Magpie, a honey cog behind the magpie at the drawer; design desk, a sage bean behind Athens; playground, a honey rays behind Santorini; log, a sage arch behind Copenhagen (the arch does not spin: the spin never goes on a shape with a base); colophon, a teal cog behind Florence; 404, a coral sun behind the flying magpie. Three orbs each, recolored per page. The 404 wraps it in `.lost` (20px below, nothing above, so the page ends close to its footer). On a phone the poster comes first at most 480px wide.
- **Text:** display title, then the status row (16px, 8px by 22px gaps, 18px above) if there is one, then the lede (26px above, max 600px), then buttons (34px above).

### The Magpie note
- **Style (`.note`):** under the hero buttons, 58px down (36px on a phone), max 580px: a 118px art well (92px on a phone) with a pale teal cog behind the drawer magpie, then a 26px title (22px on a phone) with a transparent 1.5px underline and a 17px line under it. Hover and focus draw the underline, turn the cog honey and 14 degrees, and lift the drawing 3px (0.2s and 0.3s).

### Magpie at home
- **Head (`.sec-head`):** headline, a 20px intro 22px below, then the status row (`.mp-meta`, 16px, 22px above). Section heads are at most 760px wide.
- **Does (`.does`):** five rows, 44px round tile / text, 16px gap, 20px of padding, a 1px navy rule under each. Tiles are `.bg-coral`, `.bg-honey`, `.bg-pale-coral`, `.bg-navy`, `.bg-sage` with a 24px navy (or paper) shape inside. Keys at 20px weight 500, lines at 16px.
- **Art (`.mp-art`):** at most 680px: a coral cog behind the flying magpie turning in reverse over 240s (`.spin--rev`), the drawing at 86%, a sage plus at the top right (13%) and a navy asterisk at the bottom left (15%). 480px at 960, 340px on a phone.
- **Reflex (`.reflex`):** a 15px navy soft line, 14px below the grid, that answers Alt+Shift+M for 4.2s.
- **Stats (`.mp-stats`):** 1.15fr / 1fr / 1fr with 48px gaps, 88px below, a 1px navy rule above with 28px of padding: the big number and its sentence; "Made with" and chips; "Private" and a pill button. One column on a phone with 36px gaps.
- **Chips (`.chips li`):** 15px, 4px by 13px padding, 1px navy border, 999px radius, paper at 50%.

### Projects (signature)
- **List (`.pj-list`):** opened and closed by 1px navy rules, one per row. A row is a grid link: a 13px mono number, the title at 22px with its 15px "what" under it, the kind at 14px, the status at 14px with its dot. Hover and focus underline the title (1px, 4px offset).
- **Active row (`.is-on`):** the number fades out (0.15s) and a honey `s-rays` (22px) takes its place; the preview follows the row on hover or focus.
- **Preview (`.pv`):** sticky at 40px, in a 440px column: a honey cog (46%) at the top right and a navy asterisk (16%) at the bottom left behind a 16:10 screenshot clipped by `blob-clip`; under it the number and title beside kind and status (15px), the "what" at 18px, and an "Open" pill. Hidden at 1180 and below.
- **Phone:** the number hides, a 68px circular thumbnail with a 1px navy-at-18% ring spans the first column, and kind and status move to a 13px line under the title.

### Places scatter (signature)
- **Style (`.scatter`, `.pl`):** nine drawings on round plates in the 12-column grid above, each with a 17px caption (22px under the first) centered 14px below. Each `.pl` sets its plate by inline custom properties: Torres on a teal circle at 80%; Kirkjufell on a honey cog turned -8 degrees; Santorini on a coral bean at 14 degrees and 84%; Florence on a deep teal arch at 70%; Rome on sage rays at 10 degrees and 84%; Athens on a teal bean at -20 degrees and 76%; Istanbul on a honey tint circle at 74%; Edinburgh on a coral cog at 6 degrees and 76%; Copenhagen on a sage arch at 60%, centered 40% down. Two decorations (a 64px sage asterisk at the center top, an 84px navy squiggle at the top right) hide at 1180.

### Doors
- **Style (`.door`):** an arched card: a 2:1 top with a full semicircle (9999px top corners) and a body with 32px bottom corners, both in `--door`. Three shapes sit in the top: `.s1` at 34% wide from 33% in and 26% down, `.s2` at 16%, `.s3` at 11% (slightly smaller and lower on the sage door). The body pads 6px by 48px by 48px (4px, 24px, 32px on a phone with 26px corners): title at 26px, a 17px line (max 520px), then a `.tlink` 20px below.
- **Variants:** `.door--dcoral` is deep coral with paper text (focus rings go paper); `.door--sage` is sage with navy text.
- **Log list (`.loglist`):** 120px date / line rows at 17px with 11px padding, rules in navy at 35% (paper at 70% on a dark door); dates in mono at 13px. One column on a phone.

### Pills (the "Where to next" nav)
- **Style (`.pill`):** a 64px word in a 999px pill, padded 10px / 34px / 14px / 12px, with a 64px round tile (`.ptile`) holding a 38px shape at the left and an 18px gap. Hover lifts 3px and tilts -1 degree over 0.2s. The small set (`.pills--sm`, on inner pages) is 40px with a 48px tile and 28px shape; 52px at 1180; 38px with a 42px tile on a phone for both.
- **Variants:** `.pill--navy` (paper text, coral tile), `.pill--sage` (sage tint, paper tile), `.pill--coral` (coral, pale coral tile, navy text: large only), `.pill--honey` (honey, navy tile), `.pill--dcoral` (deep coral, paper text, paper tile).
- **Section (`.pills-sec`, `.next-sec`):** "Where to next" as a 22px lede, pills 30px below with 22px by 34px gaps (14px on a phone), 120px below the section. `.next-sec` is itself a paper band with a wave on top, so the colored band above it never ends in a straight cut. Under 360px the big pills drop to 30px and the small set to 26px so "All ten projects" stays on one line.

### Say hello
- **Style (`.hello`):** a pale coral band, centered, 140px padding (96px above, 230px below on a phone): "Say hello" at 96px, a 22px line at most 640px wide, a navy pill 36px below. A coral sun (200px) at the top right, a navy asterisk (110px) at the bottom right, a sage plus (90px) at the top left, and the magpie on books (240px) at the bottom left; at 1180 and below the books move to the bottom center and the band pads 300px below.

### Footer
- **Style (`.foot`):** paper with a scallop top, 90px above and 40px below: the wordmark at 40px, three 16px weight-500 column heads with 15px links (a 12px lock before the private library), then a 1px `line` rule and a 14px navy soft base line 70px below. Two columns on a phone.

### Chapters (Magpie page and colophon)
- **Chapter:** headline and an 18px line on the left, the body on the right (see Layout).
- **Journey (`.journey`):** numbered steps with 44px round counters in DM Mono at 15px (honey, then pale teal for even steps, pale coral for every third), a 22px weight-500 title and body text, 22px of padding and a 1px navy rule under each. `.journey--plain` drops the counters (the colophon’s house style). 36px counters at 13px on a phone.
- **Bench (`.bench`):** a 9rem term at 18px weight 500 beside its line, 16px of padding, navy rules; stacked on a phone.
- **Data list (`.datalist`):** an 11rem navy soft term at 15px beside its value, 14px of padding, navy rules; stacked on a phone.
- **Counts (`.counts`):** three columns, value over label (`column-reverse`), the number at 72px, the label at 16px, with a 15px navy soft tally note 28px below.
- **Quote line (`.quote-line`):** 32px, 1.15, -0.015em, 22px below (26px on a phone).

### The Magpie redraw (signature)
A working picture of Magpie’s gallery and popup, redrawn in HTML in this site’s colors and sized in container query units so it scales with its frame.
- **Frame (`.scene__frame`):** paper, 28px corners (20px on a phone), `container-type: inline-size`, 64px under the section head (44px on a phone); a 15px navy soft caption 14px below says it is redrawn.
- **Scene (`.mp-scene`):** 16:10. The gallery (`.mp-gallery`) is a card window 64% wide from 4% in, 1px `line` edge, 1.6cqw corners, with a bar (feather, "Magpie" at 2.2cqw, a count in navy soft), a pill search field, a row of pill tags (the active one navy with paper text), and a three-across wall of cards (paper, 1px line, 1.2cqw corners, 16:10 image over a 500-weight title and a navy soft domain). The popup (`.mp-pop`) is a card window 34% wide at the right, 1.8cqw corners, 1.22cqw type: a head with a pale teal "web page" badge, a preview card on paper, DM Mono uppercase labels at 0.95cqw with 0.06em tracking, pill fields on paper holding pale coral chips, and a full-width navy pill button, "Clip it", at least 13px.
- **Phone (container at most 560px):** the scene becomes 158cqw tall, the gallery spans the top and the popup sits across the bottom at 74% width; every cqw value roughly doubles.
- **Behavior:** the page’s one authored moment. When 60% of the scene is in view, after 900ms, the popup clips its preview: a copy flies into the wall’s first slot in an 820ms arc (rising 30px at the midpoint) on the shared curve while the older cards slide over in 640ms (FLIP), the new card takes a 0.3cqw honey outline, and the button reads "Clipped" with a check for 1.6s. The card that falls off the wall rejoins the queue. Pressing "Clip it" repeats it and raises the toast; a press during the pause moves straight on. Under reduced motion nothing plays by itself and a press files the card without the flight.

### Rooms (playground)
- **Style (`.room`):** three across: a `1 / 0.9` stage holding a shape at 88% (tilted by `--r`, colored by `--c`, default pale teal) behind a 16:10 screenshot at 74% clipped by `blob-clip` (82% on a phone); the title at 24px 18px below, the line at 16px. Hover turns the shape 8 degrees (0.3s) and underlines the title. The empty room is a paper circle at 62% with "nothing here" in mono at 14px.

### Ledger (log)
- **Style (`.ledger`):** at most 860px, 1px navy rules, 150px date / entry rows with 8px by 32px gaps and 22px of padding; the date in mono at 14px, the entry at 18px with a 500-weight lead-in. Version tags (`.ledger__v`) are mono 13px pills, 1px by 10px padding, honey, then pale teal for even rows and pale coral for every third. Stacked at 17px on a phone.

### Toast
- **Style:** navy, paper text at 15px, 999px radius, 10px by 18px padding, centered 24px above the bottom, no shadow. Fades in over 0.25s while rising 8px over 0.35s on the shared curve, and hides after 2.8s.

### Keycaps and code
- **kbd:** DM Mono 13px, 1px navy border with a 2px bottom, 5px corners, paper at 55%. **code:** DM Mono at 0.88em on paper two, 1px by 6px padding, 6px corners.

### Design desk (rendered by `design.js`)
The desk kept its own component set, repainted in the site’s tokens through the aliases above. Chips (`.chip`, `.pile-nav a`): 0.9063rem, 7px by 14px padding, at least 36px tall, a `rule-2` border, navy hover text, 999px radius; hover turns border and text navy; pressed fills navy with paper text and shows the count in paper at 80%. Search (`.desk-search`): 42px tall, card, `rule-2` border, 999px radius, a 16px magnifier in navy soft; focus turns the border navy with the global 3px navy outline. Cards: a 16:10 tile at 20px corners (paper two, or mint, sand, lilac, sky through the aliases) with a 0.6s zoom to 1.035 on hover, a kind pill (paper two; gallery pale teal, tool pale coral, reading honey tint, site outlined, repo and video navy), a 1.0313rem weight-500 title clamped to two lines and a 0.875rem why clamped to three. System cards (28px corners) and notebook pages (24px) are flat fills with no border: paper on a tinted pile, honey tint or sage tint on a paper pile. Palette swatches and the metadata dot are round. Each pile is a `.band` with its own `.wrap`, paper and tints alternating down the page (sage for Heliopolis, honey for resources, pale coral for examples, sage for the closing chapter), each with a wave or scallop on top; the video shelf continues the resources band without an edge. Every link that opens a new tab says so, whether written in the page or built by `design.js`; a `noscript` line under the pile nav says what the page is without it.

### Drawings (signature)
Every drawing lives in `assets/art/` (nine travel places in `travel/`, the four Pretzel Protocol cities, three magpies: at the drawer, in flight, on books), made in Kelly’s Heliopolis style with an image model, recolored by meaning into this site’s colors (water and leaves teal, stone and roofs coral, small accents only), snapped to the palette, trimmed and saved as WebP with alpha. Next to each travel drawing, Pretzel city and the drawer magpie sits a `-sm.webp`, its 480px copy for the orbiting places and the Magpie note; the ten project screenshots have 320px `-sm.webp` copies for the phone thumbnails. Those are derived files (Pillow, Lanczos, quality 82), regenerated when the source changes, and carry no prompt sidecar. Each file keeps a `.webp.json` provenance sidecar with its prompt, kept off the deploy. On the page a drawing always has explicit width and height, descriptive alt text (or empty alt when the caption or title says the same), and sits on a round shape with room on every side: the poster, the satellites, the scatter plates, the note, the hello band’s books.

### Motion
One shared curve, `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease` in CSS, `EASE` in `script.js`). Ambient: `spin` (360 degrees over 180s, linear, on the poster sun’s SVG root so it turns on its own center; 240s reversed on the home Magpie cog) and `bob` (6px right and 5px up and back over 7s, 9s or 11s). Hover: 0.15s to 0.3s on color, underline, transform and rotate. Authored: the poster crossfade (160ms out, 460ms in with an 8px rise), the clip (900ms delay, 820ms flight, 640ms slide, 1.6s reset), the toast (0.25s and 0.35s, 2.8s dwell). `prefers-reduced-motion: reduce` sets `animation: none` and `transition: none` on everything, turns off smooth scrolling, and `script.js` skips every animated path; nothing is hidden behind JavaScript, and the "Another place" button is the only control JavaScript reveals.

## Do's and Don'ts

### Do:
- **Do** open every page with one drawing on a big round shape (`.poster` or `.page-hero__art`), with paper around it and the shape in a strong color: honey, coral, teal, sage or pale teal.
- **Do** set every word in navy, navy hover or navy soft, or in paper on navy, deep coral or deep teal, and let teal, coral, honey and sage carry shapes, bands, tiles and dots.
- **Do** keep navy on coral and navy on teal for pill-size text only (38px and up), and check any new navy-on-color pair against 4.5:1 for body text.
- **Do** stack the page as bands of one tint each (`.band--pteal`, `.band--pcoral`, `.band--tint`, `.band--sage`, `.band--paper`), every band opening with `.edge` or `.edge--scallop`.
- **Do** make every button a pill (`.btn`, `.btn--line`, `.btn--sm`), every tile a circle, every screenshot a blob (`clip-path: url(#blob-clip)`) or a circle, and every frame at least 14px round.
- **Do** set titles in Instrument Sans at 400 with -0.02em tracking (86 / 52 / 26), reading text at 16px, subheads at 500, and dates, counts, versions and keycaps in DM Mono with tabular figures.
- **Do** draw new shapes into the sprite on the 200-unit centered box with `currentColor`, place them with `<use>`, color them with `.c-*` or a per-instance `--c`, and tilt or size them with `--r`, `--s` and `--t`.
- **Do** show status as a 10px round dot with its word: navy "In use", deep teal "Live", deep coral "Private".
- **Do** keep the shared curve `cubic-bezier(0.16, 1, 0.3, 1)` for every authored movement, keep ambient motion slow (180s spins, 7s to 11s bobs), and make every page complete without JavaScript and under `prefers-reduced-motion`.
- **Do** check every layout at 390px first, with the 20px gutter and the wrapped header.
- **Do** recolor every new drawing by meaning into this site’s colors, snap it to the palette, save it as WebP with alpha, keep its `.webp.json` sidecar beside it, and add a new place to `PLACES` in `script.js`.

### Don't:
- **Don't** set text in teal (2.9:1 on paper), coral (3.4:1), honey or sage; they are shape and band colors.
- **Don't** put navy body text on coral (3.3:1) or teal (3.9:1); only a pill may.
- **Don't** add a ninth color: no bright blue, no violet, no third friend beside honey and sage.
- **Don't** add drop shadows, gradients, glows or blurs anywhere; depth is overlap and a round tint behind a thing.
- **Don't** draw a rectangle with sharp corners, a square tile, a square screenshot or a straight-cut band on a site page.
- **Don't** box, frame, crop or shrink a drawing into a card; it sits on a shape with room around it, at its own silhouette.
- **Don't** bold a heading, use weight 600 or 700, or set a title in a second typeface; hierarchy is size.
- **Don't** put an eyebrow, kicker or label above a heading; status and metadata follow the title.
- **Don't** reach for the desk’s alias names (`--ink`, `--mint`, `--lilac`, `--sand`, `--sky`, `--case`, `--link`, `--live`) in new work; use the eight colors and their shades.
- **Don't** add a second cursor tag, a second autoplaying moment on a page, or motion that runs under reduced motion.
- **Don't** bring `lab.css` slabs, stickers, confetti or hard shadows onto a site page; that skin belongs to the playground rooms only.
- **Don't** use em dashes, in copy or in labels.
