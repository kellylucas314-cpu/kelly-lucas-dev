---
name: Kelly Lucas
description: Kelly's real projects, Magpie first, drawn in the Heliopolis style on warm paper.
colors:
  ink: "#1f355e"
  coral: "#d6605b"
  pale-coral: "#f6dcd8"
  teal: "#5a9e9a"
  pale-teal: "#d4e7e5"
  paper: "#f8f6f1"
  paper-2: "#f0ede5"
  paper-3: "#e6e2d8"
  card: "#fcfbf8"
  ink-2: "#3d5072"
  ink-3: "#56647f"
  rule: "rgba(31, 53, 94, 0.14)"
  rule-2: "rgba(31, 53, 94, 0.28)"
typography:
  display-hero:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(3rem, 6.4vw, 5.75rem)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.022em"
  display:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2.75rem, 5.6vw, 5rem)"
    fontWeight: 300
    lineHeight: 1.02
    letterSpacing: "-0.022em"
  headline:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2rem, 3.8vw, 3.25rem)"
    fontWeight: 300
    lineHeight: 1.06
    letterSpacing: "-0.018em"
  numeral:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "tnum, lnum"
  entry:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 400
    lineHeight: 1.3
  title:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  lede:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1.125rem, 1.45vw, 1.3125rem)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  link:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0"
  meta:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
  control:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.9063rem"
    fontWeight: 400
  small:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
  nav:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 500
    letterSpacing: "0.14em"
  label:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.13em"
  tag:
    fontFamily: "Lato, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  dot: "2px"
  control: "4px"
  picture: "6px"
  tag: "99px"
spacing:
  chip-gap: "6px"
  row-tight: "13px"
  row: "18px"
  grid-gap: "24px"
  gutter: "clamp(16px, 4vw, 48px)"
  chapter: "clamp(44px, 6vw, 80px)"
  section: "clamp(88px, 11vw, 156px)"
  footer: "clamp(100px, 12vw, 168px)"
  header: "76px"
  container: "1240px"
components:
  site-header:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "76px"
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.nav}"
    padding: "6px 0"
  text-arrow-link:
    textColor: "{colors.ink}"
    typography: "{typography.link}"
    padding: "0 0 4px"
  text-link:
    textColor: "{colors.ink}"
  status-dot-live:
    backgroundColor: "{colors.teal}"
    rounded: "{rounded.dot}"
    size: "9px"
  status-dot-in-use:
    backgroundColor: "{colors.coral}"
    rounded: "{rounded.dot}"
    size: "9px"
  status-dot-private:
    backgroundColor: "transparent"
    rounded: "{rounded.dot}"
    size: "9px"
  project-row:
    textColor: "{colors.ink}"
    typography: "{typography.entry}"
    padding: "21px 0 22px"
  room-tile:
    backgroundColor: "{colors.paper-2}"
    rounded: "{rounded.control}"
  scene-frame:
    backgroundColor: "{colors.pale-teal}"
    rounded: "{rounded.picture}"
  version-tag:
    backgroundColor: "{colors.pale-teal}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
    padding: "0 7px"
  version-tag-latest:
    backgroundColor: "{colors.pale-coral}"
    textColor: "{colors.ink}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "7px 14px"
    height: "36px"
  chip-hover:
    textColor: "{colors.ink}"
  chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  search-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.meta}"
    rounded: "{rounded.control}"
    height: "42px"
    padding: "0 14px 0 36px"
  desk-tile:
    backgroundColor: "{colors.paper-2}"
    rounded: "{rounded.picture}"
  kind-pill:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink-2}"
    typography: "{typography.tag}"
    rounded: "{rounded.tag}"
    padding: "1px 8px"
  kind-pill-gallery:
    backgroundColor: "{colors.pale-teal}"
    textColor: "{colors.ink}"
  kind-pill-tool:
    backgroundColor: "{colors.pale-coral}"
    textColor: "{colors.ink}"
  kind-pill-reading:
    backgroundColor: "{colors.paper-3}"
    textColor: "{colors.ink}"
  kind-pill-repo:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.meta}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  skip-link:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.meta}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
---

# Design System: Kelly Lucas

## Overview

**Creative North Star: "Drawn in the Heliopolis Style"**

The site is the home for Kelly's real projects, with Magpie up front, and it borrows the look of Heliopolis, the HelioFlux team space Kelly designed: warm paper, a fine navy pen, flat fills, one drawing per view and a lot of calm space around everything. Every page opens with a drawing that sits on the paper the way ink sits in a sketchbook: no frame, no tint behind it, never cropped. The type and the rules are drawn with the same pen as the pictures, so a 1px navy line under the header, a navy rule opening a section and the outline of a granite tower are one material.

Density is generous. Hierarchy comes from Lato Light at large sizes against Lato Regular for reading, from 1px navy rules and lighter hairlines, and from a 12-column grid with asymmetric splits that always leaves paper showing. Color is used by meaning: navy writes every word and draws every line; pale teal and pale coral fill; teal and coral are small marks (an underline, a dot, the current-page line). The drawings are the one place where all six colors meet at full strength, and they are where the page's color comes from.

Motion is one authored moment per page (the place crossfade on the homepage, the clip on the Magpie page) plus small hover nudges on one shared curve. All of it yields to `prefers-reduced-motion`, and every page reads complete without JavaScript. This system replaced the "collection" (Heliora, mint, lilac, sand and sky plates, accession numbers) and, before it, the v0.5 to v0.9 lab (slabs, stickers, confetti), which survives only in the playground rooms on `lab.css`. It equally rejects the stock SaaS page: pill call-to-action pairs, icon card grids, metric heroes.

**Key Characteristics:**
- Warm paper ground, navy for every word and every line; no dark sections, the footer stays on paper.
- Six colors used by meaning; the drawings carry all six, the interface carries mostly navy.
- One typeface, Lato, in four weights: Light display, Regular reading, Medium labels, Bold standalone links.
- One drawing per view, at its natural shape, never boxed, cropped or shadowed.
- Ruled lists (projects, does, journey, data, ledger, rooms) instead of cards.
- Flat: no drop shadows, no gradients, no pill buttons.

## Colors

Six colors on warm paper, used by meaning: navy writes, the pales fill, coral and teal mark.

### Primary
- **Pen Navy** (`ink`): every word, every structural line (the header's bottom rule, section and chapter rules, the line that opens a list, the strip), the 2px focus ring, the skip link, the toast, the pressed chip, the outline of the "Private" dot and the "Clip it" button inside the Magpie redraw. 11.2:1 on paper, and paper on navy is the same 11.2:1.

### Secondary
- **Coral** (`coral`): the warm mark. The underline of running-text links, the current-page line in the nav, the footer email's underline, the hover line on text-arrow links, project rows, rooms and the next-project bar, the "In use" dot, the text caret, and the outline on a freshly clipped card in the redraw. 3.4:1 on paper, so it is never text.
- **Pale Coral** (`pale-coral`): a fill. In drawings it is stone, rock, roofs and petals. In the interface: text selection, the newest version tag on the log, tag chips inside the redraw, and on the design desk the tool pill and the private and pending pills.

### Tertiary
- **Teal** (`teal`): the cool mark. In drawings it is water and leaves. In the interface: the "Live" dot, the desk's dot tags and the notebook's bullets. 2.9:1 on paper, so it is never text.
- **Pale Teal** (`pale-teal`): a fill. In drawings it is lakes, glacier and pale foliage. In the interface: the ground of the Magpie redraw (the only picture that sits on a tinted field, because it is a UI picture, not a drawing), version tags on the log, the redraw's "web page" badge, the desk search field's 3px focus halo, and the desk's gallery pill and tiles.

### Neutral
- **Warm Paper** (`paper`): the page, header and footer ground; text on navy; the windows inside the redraw.
- **Paper Two** (`paper-2`): quiet wells: room tiles, desk and document tiles while loading or without a picture, image wells in the redraw, inline `code`, the default kind pill, the scale demo.
- **Paper Three** (`paper-3`): the desk's "sand": the reading pill and sand tiles. Nothing outside the desk uses it.
- **Card** (`card`): the lightest surface: the desk search field, system cards, notebook pages, and fields inside the redraw.
- **Ink Two** (`ink-2`): secondary text: the place caption, row descriptions, chapter subheads, prose, ledger entries, desk chips at rest. 7.5:1 on paper, 6.2:1 on either pale.
- **Ink Three** (`ink-3`): tertiary text: labels, dates, row numbers, data-list terms, the footer line, captions under the redraw. 5.5:1 on paper and 4.6:1 on paper-3 and the pales; nothing darker than those may sit under it.
- **Hairline** (`rule`, navy at 14%): the design desk's quiet edges: section tops, system card, notebook and swatch borders, library row lines.
- **Strong Hairline** (`rule-2`, navy at 28%): every row separator in a ruled list, the line above the place caption, chip and field borders, the band's vertical divider, the scrollbar thumb.

Contrast at a glance: navy, ink-2 and ink-3 pass AA as body text on every ground in the system. Coral and teal fail as text on all of them. The two pales sit at 1.2:1 against paper, so a pale fill only reads when a navy pen line surrounds it, which is how the drawings use them.

### Design desk aliases
`design.js` and the older desk rules still read the collection's names. They are aliases, not colors, and each points at one of the six or a shade: `--mint` and `--sky` to pale teal, `--mint-2` and `--live` to teal, `--lilac` to pale coral, `--lilac-2` and `--magpie` to coral, `--sand` to paper-3, `--case` and `--link` to navy, `--case-2` to ink-2, `--private` to ink-3. The desk's tile rotation (mint, sand, lilac, sky) therefore shows pale teal twice. `--lilac-2`, `--case-2`, `--magpie` and `--private` are declared but read by no rule. New work uses the six names, never an alias.

### Named Rules
**The Navy Writes Rule.** Every word is navy, ink-2 or ink-3. Coral (3.4:1) and teal (2.9:1) never set text, on paper or on any fill; they appear only as lines, dots and outlines.

**The Pale Fill Rule.** Pale teal and pale coral fill drawings and a few small grounds (the redraw's field, version tags, kind pills, selection, the focus halo). They never fill a section band, a button or a card of text.

**The Six in Every Drawing Rule.** Every drawing uses all six colors, recolored by meaning: navy for the pen, teal and pale teal for water and leaves, coral and pale coral for stone, roofs and small accents, paper for the light. The interface stays quiet so the drawing can be the color on the page.

## Typography

**Display Font:** Lato (with -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif)
**Body Font:** Lato (same stack)
**Label/Mono Font:** Lato for labels. Inline `code` on the design desk uses the system monospace (ui-monospace, SF Mono, Menlo, Consolas) at 0.86em; it is the only text set outside Lato.

**Character:** Lato is Heliopolis's own face: warm, round-shouldered and calm. Light 300 at display size, tightly tracked, reads like a drawn title; Regular at 17px reads like a friendly letter. It is self-hosted as Latin-subset WOFF2 in four weights (300, 400, 500, 700) with `font-display: swap`; Light and Regular are preloaded. The subset keeps `tnum` and `lnum`, so dates, counts and step numbers line up.

### Hierarchy
- **Display hero** (300, clamp(3rem, 6.4vw, 5.75rem), line-height 1.0, -0.022em): "Hello, I'm Kelly." on the homepage only.
- **Display** (300, clamp(2.75rem, 5.6vw, 5rem), 1.02, -0.022em): the h1 of every other page, and the homepage's two big section names (Magpie, Projects).
- **Headline** (300, clamp(2rem, 3.8vw, 3.25rem), 1.06, -0.018em): chapter titles, the band's Playground and Log, "Say hello", the next-project title.
- **Light accents** (300, between 1.25rem and 2.375rem): the same light voice at middle sizes for the strip's big number (2.375rem, 2rem on phones), the "does" keys (clamp(1.375rem, 2vw, 1.6875rem)), the footer email (clamp(1.5rem, 2.5vw, 2.125rem)), the bulk quote line (clamp(1.5rem, 2.4vw, 2rem)) and data-list counts (1.25rem).
- **Entry** (400, 1.3125rem, 1.3): project row and playground room titles.
- **Title** (400, 1.25rem, 1.3, -0.005em): h3 steps inside chapters.
- **Lede** (400, clamp(1.125rem, 1.45vw, 1.3125rem), 1.55): the paragraph under a display title, in navy, max 31em (26em beside the Magpie drawing).
- **Body** (400, 1.0625rem, 1.6, word-spacing 0.04em): running text, about 40 to 44em wide in prose and the ledger. 1.03rem at phone width.
- **Text-arrow link** (700, 0.9375rem, 1.3): standalone links. The only bold in the system.
- **Meta** (400, 0.9375rem): the place caption, Magpie's status line, row status, data-list terms, ledger dates, the toast.
- **Control** (400, 0.9063rem): the desk's chips and pile links.
- **Small** (400, 0.875rem, 1.5): the footer line, log dates, the caption under the redraw.
- **Caption** (400, 0.8125rem): version tags, desk domains, the empty room tile.
- **Nav** (500, 0.78rem, 0.14em, uppercase): header links. 0.6875rem and 0.1em at phone width, 0.08em below 360px.
- **Label** (500, 0.75rem, 0.13em, uppercase, ink-3): column heads over the projects list, data terms in Magpie's meta row, project kinds.
- **Tag** (400, 0.75rem, 1.5): kind pills and private and pending pills on the desk.

### Named Rules
**The Light Title Rule.** Display and headline sizes are Lato Light 300 with negative tracking; a title is never bold. Weight 700 belongs to standalone text-arrow links and nothing else; 500 belongs to small uppercase labels, the nav, keycaps and the desk's card titles.

**The Label-After Rule.** Nothing sits above a heading: no eyebrow, kicker or category line. Metadata follows the title (Magpie's status line comes after "Magpie"). Uppercase tracked labels name columns and data fields; they never introduce a heading.

## Layout

A centered container (max 1240px) with a fluid side gutter, clamp(16px, 4vw, 48px), that resolves to 16px at 390px. Page heads and chapters sit on a 12-column grid with a 24px gap and leave a column of paper between their halves: page-head text in columns 1 to 6 and the drawing in 8 to 12 (at most 460px wide); chapter head in 1 to 4 and body in 6 to 12. The homepage hero splits 1fr to 1.28fr with the drawing on the right; the Magpie feature splits 1.15fr to 1fr with the drawing on the left, and the "does" list below repeats that split so its keys and values line up with the picture and text above.

Vertical rhythm is generous and stepped: hero padding clamp(32px, 5vw, 72px) above, chapters clamp(44px, 6vw, 80px) each way, major homepage sections clamp(88px, 11vw, 156px) apart, the footer clamp(100px, 12vw, 168px) below the last section. Inside lists the beat is about 18px per row (13px in the tighter data and log lists). The header is 76px tall (64px on phones), sits on paper and is not sticky; anchors leave 24px of scroll padding.

The projects list is a six-column grid: number (44px), title (up to 17rem), description, kind (6rem), status (9rem) and arrow (20px), with a 22px column gap.

Responsive behavior, verified at 390px:
- **1100px**: the desk grid goes from four across to three.
- **1080px**: the projects grid tightens to 36px, 13rem, 1fr, 5.5rem, 8rem and 18px with an 18px gap.
- **960px**: the notebook goes two across.
- **860px**: the phone layout. Every split becomes one column. The hero and every page head put the drawing first (page-head drawings at min(80%, 340px), left aligned); the Magpie drawing shrinks to min(78%, 360px); the footer puts its drawing after the text at min(64%, 260px). The nav shrinks and drops Log. Project rows restack as number, title and arrow on the first line with the description and the kind and status pair under the title; the column heads hide. The band's two halves stack, each opened by its own navy rule. The data, bench and ledger lists stack their label above the value.
- **760px**: the desk grid goes two across with 22px by 12px gaps.
- **640px**: library rows and the notebook go to one column.
- **560px of frame width** (a container query): the Magpie redraw becomes a tall stacked picture, 158cqw high, with the popup across the bottom at 74% width.
- **360px**: the nav gap drops to 12px and its tracking to 0.08em.

### Named Rules
**The Paper Around It Rule.** A drawing always has paper on every side. Frames keep its natural shape (`object-fit: contain` in a 3:2 box for the place, a max width for everything else), and a layout that would crop, box or butt a drawing against a rule is wrong.

**The Pen Line Rule.** A 1px navy rule opens every section, chapter, list and the footer; a Strong Hairline separates rows inside. Lines are the structure; background bands are not.

## Elevation & Depth

The system is flat, like the drawings. Nothing lifts: no drop shadows, no gradients, no glows, at rest or on hover. Depth is conveyed by the pen (navy rules over lighter hairlines) and by tone (paper, then paper-2 wells, then card for the few fields). `box-shadow` appears in exactly two places, and neither is elevation: the "Private" status dot draws its 1.25px navy outline as an inset stroke, and the desk search field shows a flat 3px pale-teal halo on focus. Inside the Magpie redraw the windows are paper with a 1px navy line, not floating panels.

### Named Rules
**The Flat Paper Rule.** If it would need a shadow to read as separate, give it a 1px navy line or paper around it instead.

## Shapes

Rectilinear with softened corners, in four steps. Picture grounds take 6px: the Magpie redraw's frame, desk tiles, document and video tiles, system cards and notebook pages. Things you press or type into take 4px: chips, pile links, the search field, keycaps, inline code, the toast, the skip link, room tiles and version tags. The status dot is a 9px square with 2px corners, Kelly's mark kept from the lab; focus rings round at 2px. Full rounding (99px) exists only on read-only tags on the design desk (kind, private, pending, document badges) and on the round video play mark.

Pictures keep fixed ratios: 3:2 for the place frame, 16:10 for the redraw, room tiles and desk tiles, 4:3 for documents, 16:9 for video. Drawings themselves are not shaped at all: they are trimmed WebP with alpha, so their silhouette is the drawing's own edge.

Icons are drawn with the pictures' pen: 12px line icons on a 12-unit grid (down, right, out, up, lock, cycle), 1.5 stroke, round caps and joins, `currentColor`, kept in one inline SVG sprite. The footer email and the next-project bar use the same arrow larger (16px and 18px) at a 1.3 stroke.

## Components

### Text-arrow links (the button of this system)
Underlined labels, never buttons.
- **Shape:** inline label in Bold 700 at 0.9375rem with a 1px navy underline 4px below and a 7px gap before a 12px drawn arrow. Groups (`.tlinks`) wrap with 14px by 30px gaps.
- **Hover / Focus:** the underline turns coral over 0.2s and the arrow nudges toward where it goes (down 2px, right 3px, out 2px up and right, up 2px) over 0.25s on the shared ease. Focus takes the global 2px navy ring at a 4px offset.
- **Direction is honest:** down arrows jump within the page, right arrows go to another page here, the out arrow leaves the site, a lock marks the private library.

### Running-text links
- **Style:** navy words with a 1px coral underline at a 0.24em offset, in ledes, prose and anywhere marked `.text-link`. Hover thickens the line to 2px over 0.15s.

### Navigation
- **Header:** "Kelly Lucas" at 1.375rem Regular on the left (1.125rem on phones), four uppercase links on the right: Magpie, Projects, Log, Playground. A 1px navy rule closes the header.
- **States:** links rest with a transparent 1px bottom line; hover draws it in navy, and the current page (`aria-current="page"`) keeps it in coral.
- **Phone:** the gap drops from clamp(18px, 2.6vw, 36px) to 15px, the type to 0.6875rem, and Log drops out of the header (the homepage band still links it).

### Status dots
- **Style:** a 9px square with 2px corners, an 8px gap, then the word, always both.
- **Variants:** coral "In use", teal "Live", navy outline "Private". On the desk, dot tags use the same mark at 8px in teal.

### Chips and fields (design desk)
- **Chips:** transparent ground, Strong Hairline border, ink-2 text, 4px corners, at least 36px tall. Hover turns border and text navy; pressed (`aria-pressed="true"` or `.is-active`) fills navy with paper text. A count follows the label. Known drift: the count is set at 60% opacity, which is 2.9:1 at rest; it should be ink-3, not faded ink-2. Pile links are the same chip without a pressed state.
- **Search field:** 42px tall, card ground, Strong Hairline border, 4px corners, a 16px magnifier in ink-3 inside the left edge. Focus turns the border navy and adds the flat 3px pale-teal halo; the caret is coral.

### The projects list (signature)
A ruled register, not a card grid.
- **Row:** number in Light ink-3, title in Entry, a one-line description in ink-2, kind as an uppercase label, the status dot and word, then a 12px arrow flush right. 21px above and 22px below, a Strong Hairline under each row, a navy rule over the column heads.
- **Hover:** the title takes a coral underline and the arrow nudges. External rows use the out arrow and carry a visually hidden "(opens in a new tab)".

### Magpie on the homepage
- **Feature:** a drawing of a magpie in flight on the left, "Magpie" in Display on the right with its status line after it, a lede, and one text-arrow link to the full page. A navy rule opens the section.
- **Does list:** five ruled rows, each a light key ("Clip", "Two nests at once") and its plain explanation, on the same split as the feature. Keycaps are 1px navy, 4px corners, Medium 0.75rem.
- **Strip:** one big Light numeral and the sentence that explains it, between two navy rules, with the date it was counted. Under it a three-column data row with uppercase labels (one column on phones).

### Page head
- **Style:** every page except home opens with Display, a lede and sometimes text-arrow links on the left, and one drawing on the right with paper around it. On phones the drawing comes first.

### Chapters and their lists
- **Chapter:** a navy rule, the headline and a one-line ink-2 subhead on the left (columns 1 to 4), the body on the right (6 to 12).
- **Journey:** numbered steps (01, 02, in Light ink-3 tabular figures) with a Title and ink-2 text, Strong Hairlines between; a plain variant drops the numbers.
- **Bench:** a 9rem Regular term beside its explanation, Strong Hairlines between.
- **Data list:** an 11rem ink-3 term beside its value; the counts variant sets values in Light 1.25rem, and the chapter subhead says when they were counted.
- **Ledger (log):** an 8.5rem date column, then the entry with a version tag in pale teal (the newest in pale coral), its headline in navy and the rest in ink-2.
- **Rooms (playground):** a screenshot tile (clamp(120px, 18vw, 200px) wide, 16:10, 4px corners, Strong Hairline border) beside the room's title and one line; an empty room shows a dashed tile and says so.

### Next project
- **Style:** a full-width bar closed by navy rules above and below: the next project's name in Headline, "Next project, 02" in ink-3 under it, an 18px arrow on the right. Hover underlines the name in coral and nudges the arrow 4px.

### Band and footer
- **Band:** the homepage's last section, two halves under one navy rule split by a Strong Hairline: Playground (one paragraph and a link next door) and Log (three dated lines and a link).
- **Footer:** on paper, opened by a navy rule. A drawing of a magpie on a stack of books on the left (at most 340px), "Say hello" in Headline, one line, and the email in Light at clamp(1.5rem, 2.5vw, 2.125rem) with a coral underline and a 16px arrow. Under a Strong Hairline: the copyright line and the footer links in Small ink-3, turning navy with a coral underline on hover.

### The place (signature)
The homepage hero's drawing changes every visit. The first visit shows Torres del Paine; each later visit moves one place along a list of 13 (nine travel drawings and four Pretzel Protocol cities, in `PLACES` in `script.js`), remembered in `localStorage` behind a try/catch. Under the drawing a Strong Hairline, then the place's name on the left and "Another place" on the right: a quiet underlined button (Strong Hairline underline turning coral) whose cycle icon turns 90 degrees on hover. The swap fades the drawing out over 180ms, then fades the next one in over 520ms on the shared ease while it rises 6px. The next drawing is warmed in idle time so the swap is instant. Without JavaScript the button stays hidden and Torres del Paine stays.

### The Magpie redraw (signature)
A working picture of Magpie's popup and gallery, built in HTML in this site's colors and sized in container units so it scales with its 16:10 pale-teal frame. Windows are paper with a 1px navy line and soft corners, cards are card-white with Strong Hairlines, tag chips are pale coral, the "Clip it" button is navy. The caption says it is redrawn. The page's one authored moment lives here: when 60% of the frame is in view, after 900ms, the popup clips a page. Its preview flies into the gallery's first slot in an 820ms arc, older cards slide over in 640ms, the new card gets a coral outline, and the button reads "Clipped" for 1.6s. Pressing "Clip it" repeats it and raises the toast. Under reduced motion nothing plays by itself and a press files the card without the flight.

### Toast
- **Style:** navy ground, paper text in Meta, 4px corners, 10px by 16px padding, centered 24px above the bottom edge, no shadow.
- **Motion:** fades in over 0.25s while rising 8px over 0.35s on the shared ease; hides after 2.8s.

### Drawings (signature)
Every drawing lives in `assets/art/` (travel places, the four Pretzel Protocol cities, three magpies), made in Kelly's Heliopolis style with an image model, recolored by meaning into the six colors, snapped pixel by pixel to the palette, trimmed and saved as WebP with alpha. Each one keeps a `.webp.json` provenance sidecar with its prompt beside it, kept off the deploy. On the page a drawing always has explicit width and height, alt text that describes it (or empty alt when it is decoration beside a heading that says the same), and paper around it. Pages use one at a time: the place or a page-head drawing at the top, the small magpie beside the projects head, the magpie on books in the footer.

## Do's and Don'ts

### Do:
- **Do** set every word in navy, ink-2 or ink-3, and use coral and teal only as marks: link underlines, status dots, the current-page nav line, hover lines, the caret.
- **Do** open every page with one drawing from `assets/art/`, at its natural shape, with paper on every side; one drawing per view.
- **Do** recolor every new drawing by meaning into all six colors, snap it to the palette, save it as WebP with alpha, and keep its `.webp.json` provenance sidecar beside it.
- **Do** set display and headline sizes in Lato Light 300 with negative tracking (-0.022em, -0.018em), reading text in Regular 400, uppercase tracked labels in Medium 500, and standalone links in Bold 700.
- **Do** make standalone links underlined labels with a 12px drawn arrow that nudges toward where it goes, and running-text links navy with a 1px coral underline that thickens to 2px on hover.
- **Do** show status as the 9px square dot plus its word: coral "In use", teal "Live", navy outline "Private".
- **Do** open every section and list with a 1px navy rule and separate rows with Strong Hairlines.
- **Do** keep things you press or type into at 4px corners and picture grounds at 6px.
- **Do** keep one authored moment per page on the shared ease `cubic-bezier(0.16, 1, 0.3, 1)`, and make every page complete without JavaScript and under `prefers-reduced-motion`.
- **Do** check every layout at 390px first, with the 16px gutter.

### Don't:
- **Don't** set text in coral (3.4:1) or teal (2.9:1), on paper or on any fill.
- **Don't** box, frame, crop, shadow or tint behind a drawing, and don't put two drawings in one view.
- **Don't** add drop shadows, gradients or glows anywhere.
- **Don't** make pill buttons or filled call-to-action buttons; full rounding belongs to read-only tags on the design desk.
- **Don't** put an eyebrow, kicker or label above a heading.
- **Don't** bold a display or headline, or add a second typeface.
- **Don't** fill a section band, a button or a card of text with pale teal or pale coral.
- **Don't** use the desk's alias names (`--mint`, `--lilac`, `--magpie` and the rest) in new work.
- **Don't** bring `lab.css` slabs, stickers, confetti or hard shadows onto a site page; that skin belongs to the playground rooms only.
- **Don't** use em dashes, in copy or in labels.
