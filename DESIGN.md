---
name: Kelly Lucas, the collection
description: Kelly's real projects, published like a museum's online collection.
colors:
  ink: "#14201a"
  case: "#14201a"
  mint: "#c9e6c9"
  lilac: "#e3e3ee"
  sand: "#ebe3cf"
  sky: "#d9eaf3"
  magpie: "#3e7be8"
  live: "#2c7a52"
  private: "#6b5fa6"
  paper: "#f4f2ec"
  paper-2: "#ebe8df"
  card: "#fbfaf6"
  ink-2: "#435049"
  ink-3: "#5c665f"
  rule: "rgba(20, 32, 26, 0.13)"
  rule-2: "rgba(20, 32, 26, 0.26)"
  link-underline: "rgba(20, 32, 26, 0.38)"
  case-text: "#e9ece6"
  case-muted: "#97a39a"
typography:
  display:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2.5rem, 5.4vw, 4.75rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1.875rem, 3.4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  title-lg:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title-sm:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  lede:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1.125rem, 1.5vw, 1.3125rem)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  meta:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
  control:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.9063rem"
    fontWeight: 400
  label:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
  tag:
    fontFamily: "Heliora, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  dot: "2px"
  control: "4px"
  plate: "6px"
  tag: "99px"
spacing:
  chip-gap: "6px"
  caption: "12px"
  row: "18px"
  grid-gap: "24px"
  gutter: "clamp(16px, 3.6vw, 44px)"
  section: "clamp(56px, 8vw, 112px)"
  container: "1360px"
components:
  action:
    textColor: "{colors.ink}"
    typography: "{typography.title-sm}"
    padding: "12px 2px"
    height: "56px"
  action-hover:
    textColor: "{colors.ink}"
    padding: "12px 2px 12px 10px"
  filter-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
    height: "38px"
  filter-chip-hover:
    textColor: "{colors.ink}"
  filter-chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  text-link:
    textColor: "{colors.ink}"
  plate-field:
    backgroundColor: "{colors.sand}"
    rounded: "{rounded.plate}"
  plate-field-shot:
    backgroundColor: "{colors.sand}"
    rounded: "{rounded.plate}"
    padding: "5% 6%"
  plate-inset:
    rounded: "{rounded.control}"
  index-entry:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    padding: "18px 10px 18px 6px"
  status-dot:
    backgroundColor: "{colors.live}"
    rounded: "{rounded.dot}"
    size: "9px"
  status-dot-in-use:
    backgroundColor: "{colors.magpie}"
  status-dot-private:
    backgroundColor: "{colors.private}"
  step-marker:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    size: "28px"
  search-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.meta}"
    rounded: "{rounded.control}"
    height: "42px"
    padding: "0 14px 0 36px"
  kind-tag:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink-2}"
    typography: "{typography.tag}"
    rounded: "{rounded.tag}"
    padding: "1px 8px"
  kind-tag-gallery:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.ink}"
  kind-tag-tool:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.ink}"
  kind-tag-reading:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.ink}"
  kind-tag-repo:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.meta}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  site-footer:
    backgroundColor: "{colors.case}"
    textColor: "{colors.case-text}"
---

# Design System: Kelly Lucas, the collection

## Overview

**Creative North Star: "The Collection"**

The site is published like a museum's online collection. Every project is an object: a plate (a picture set on one of Kelly's tints), a tombstone label under it (title, year, what it is, what it is made with, status) and an accession number in the form `KL 2026.NN`. Pages behave like catalogue records: a scannable index of ruled rows, object records with a data list, a ledger of acquisitions, a colophon. The mood is a quiet reading room: warm paper, deep ink green type, four soft museum-board tints, and exactly one feather of saturated color.

Density is calm, not sparse. A 12-column grid, wide section breaks marked by a single hairline, and long ruled lists that read like a register. Hierarchy comes from scale and weight inside one face, Heliora, and from hairline rules; never from colored fills, badges, or lines stacked above a heading. Motion is one authored moment per page (on the homepage and the Magpie record, the Magpie popup clipping a page into its gallery) plus short hover transitions on the shared easing curve; all of it yields to `prefers-reduced-motion`, and every page reads complete without JavaScript.

This world replaced the v0.5 to v0.9 "lab" (stacked color slabs, stickers, confetti). That look survives only as the legacy skin of the playground rooms in `lab.css`; it is not part of this system and nothing on a collection page borrows from it. The system equally rejects the stock builder template: hero metric grids, icon card grids, pill call-to-action pairs.

**Key Characteristics:**
- Warm paper ground, deep ink green for type and for the case; four tints used only as backdrops and small kind tags.
- One face (Heliora), two weights (400 and 500), hierarchy by size alone.
- Every object shown as a plate with a caption line and a tombstone label under it.
- Lists set as ruled ledgers; primary actions set as ruled catalogue bars.
- Flat surfaces; the only shadow sits under a screenshot mounted on its tint.
- Saturated color comes only from Magpie: the feather, Magpie blue, and functional signals.

## Colors

A paper-and-ink palette with four pale museum-board tints and one feather of saturated color.

### Primary
- **Deep Ink Green** (`ink`): all primary text and headings; the rules that close a set (catalogue action bars, step rails, the next-object bar); the pressed filter chip; the toast. Never pure black.
- **Case Green** (`case`): the same ink green under the name of its role, the display case. It grounds the footer and the field behind the Magpie plate. Kept as its own token so the case can be tuned without touching type.

### Secondary
- **Museum Mint** (`mint`): plate backdrop for the design desk, Pretzel Protocol and the transcript tool; the gallery kind tag; text selection.
- **Archive Lilac** (`lilac`): plate backdrop for the field guide; the tool kind tag; the private and pending tag ground; the fallback behind playground room tiles.
- **Mount Sand** (`sand`): the default plate backdrop (any plate without an assigned tint), Clue d'État and Heliopolis; the reading kind tag.
- **Gallery Sky** (`sky`): plate backdrop for HelioFlux, Agent Commons and Boot Camp.

### Tertiary
- **Magpie Blue** (`magpie`): Magpie's own accent. It appears in the feather mark, in Magpie's UI drawn inside Plate 01, as the "In use" status dot, and as every focus signal (focus ring, text caret, form accent color, the search field's focus halo). At 3.6:1 on paper it is a signal color, never a text color.
- **Live Green** (`live`): the "Live" status dot and the design desk's dot tags. Nothing else.
- **Private Violet** (`private`): the "Private" status dot. Nothing else.

### Neutral
- **Warm Paper** (`paper`): page and header ground; text on ink.
- **Paper Shade** (`paper-2`): quiet fills: inline code, image loading grounds, version tags, default kind tags, empty-case hatching, the scale demo.
- **Card White** (`card`): the few flat white surfaces: design-system cards, notebook pages, the search field.
- **Ink Two** (`ink-2`): secondary text: ledes, one-line descriptions, nav and chips at rest (7.6:1 on paper).
- **Ink Three** (`ink-3`): tertiary text: captions, dates, entry numbers, data-list labels (5.3:1 on paper, 4.9:1 on paper-2; never on anything darker).
- **Hairline** (`rule`): row separators, section tops, the header rule once the page scrolls.
- **Strong Hairline** (`rule-2`): the line that opens a list, the divisions inside an action set, chip and field borders, dashed empty-case edges.
- **Underline Ink** (`link-underline`): the resting underline of every text link.
- **Case Text** (`case-text`) and **Case Muted** (`case-muted`): type on the case. Case Muted carries footer column heads and the colophon line.

### Named Rules
**The One Feather Rule.** Saturated color comes only from Magpie: the rainbow-and-warm feather, Magpie's own UI inside the Plate 01 drawing, and functional signals (status dots, focus). Everything else on a page is paper, ink and the four tints.

**The Backdrop Rule.** Mint, lilac, sand and sky sit behind pictures (plate fields, desk tiles, the index row wash) or mark a kind on a small tag. They never fill a section band, a button, a card of text or a heading.

**The Ink Link Rule.** Text links are ink with a 1px underline in Underline Ink, deepening to full ink on hover. Blue is never a link color.

## Typography

**Display Font:** Heliora (with -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif)
**Body Font:** Heliora (same stack)
**Label/Mono Font:** none. Labels are Heliora. Inline `code` on the design desk falls back to the system monospace and is the only text the site sets outside Heliora.

**Character:** A soft geometric sans with a slightly quirky, hand-tuned edge, chosen after auditioning 97 fonts. Tightly tracked at display size it reads like an exhibition title; at 17px it reads like a careful wall label.

### Hierarchy
- **Display** (400, clamp(2.5rem, 5.4vw, 4.75rem), line-height 1.0, -0.035em): the single h1 per page. On an object record the title alone steps up to clamp(3rem, 8vw, 6rem) at -0.04em; 6rem is the ceiling for any text.
- **Headline** (400, clamp(1.875rem, 3.4vw, 3rem), 1.04, -0.03em): section titles, "Say hi." in the footer, the next-object title. The footer email is set just under it, clamp(1.75rem, 3.6vw, 3rem).
- **Title large** (500, 1.375rem, 1.2): tombstone titles and step names. The year follows the title at 400 in Ink Two: "Magpie, 2026".
- **Title** (500, 1.25rem, 1.2): index entry names, design-system card names, notebook pages, holdings figures.
- **Title small** (500, 1.0625rem, 1.3): catalogue actions, document and video titles; desk card titles sit at 1.0313rem, clamped to two lines.
- **Lede** (400, clamp(1.125rem, 1.5vw, 1.3125rem), 1.5): the paragraph under a display title, in Ink Two, max 34em.
- **Body** (400, 1.0625rem, 1.55): running text, max 60 to 66ch.
- **Meta** (400, 0.9375rem): navigation, dates, data lists, one-line descriptions, facts.
- **Control** (400, 0.9063rem): filter chips, desk chips, pile links.
- **Label** (400, 0.875rem, 1.45): status words, crumbs, footer column heads; step numbers at 500.
- **Caption** (400, 0.8125rem): plate captions, the index column heads, domains under cards.
- **Tag** (400, 0.75rem, 1.5): kind tags, version tags, private and pending tags.

### Named Rules
**The One Face Rule.** Heliora sets every word the site speaks. Hierarchy comes from size and weight, never from a second family. (The Plate 01 drawing keeps Magpie's own faces because it depicts Magpie's UI; that is the drawing's content, not the site's voice.)

**The Two Weights Rule.** Only 400 and 500. Display and headlines are 400; names, titles and actions are 500. Headlines are never bold.

**The Label-After Rule.** Metadata follows the title, in tombstone order: title, year, what it is, what it is made with, status. Nothing is set above a heading: no eyebrow, kicker, category line or step number on top. All type is sentence case; site chrome never uses uppercase or tracked-out labels.

**The Proportional Figures Rule.** Heliora ships no tabular figures (no `tnum` feature), so the stylesheet's `tabular-nums` declarations do nothing. Numbers line up because they sit in fixed grid columns (the 3.25rem entry-number column, the 8.5rem ledger date column, the right-aligned holdings figure), never because of the font.

## Layout

A 12-column grid with a 24px gap inside a centered container (max 1360px) and a fluid side gutter that resolves to 16px at 390px. Compositions are asymmetric: text takes 5 to 7 columns, the plate or list takes the rest, and record pages leave one empty column between head and body (chapter head in columns 1 to 4, body in 6 to 12; page-head display in 1 to 7, lede in 8 to 12). Sections stack with generous vertical padding, each opened by a single hairline at its top rather than a background change.

The header is sticky, 68px tall, on paper, and gains a hairline only after the page has scrolled 8px. Anchor jumps leave 88px of scroll padding for it. The index sets its ruled rows in 7 columns with a sticky plate viewer in the remaining 5 (pinned 92px from the top), so the plate follows whichever row is hovered or focused.

Responsive behavior, mobile first and verified at 390px:
- At 980px and below the intro stacks, the index viewer hides and each index row carries its own plate thumbnail on the right (between 96px and 34% of the row), with number, title and meta stacked on the left.
- At 900px and below every two-sided split (page heads, chapters, path head, lower band, footer) collapses to one column; the four Magpie steps go two-up and lose their horizontal rail.
- At 620px and below the wordmark's subtitle and the Log and Contact links drop from the header.
- At 560px and below the steps become a vertical rail, ledger and bench rows stack their label above the text, and the Magpie plate switches to its tall phone drawing.
- The design desk grid runs four across, three at 1100px, two at 760px; footer link columns go two-up at 480px.

### Named Rules
**The Ledger Rule.** Lists are registers, not card stacks. A Strong Hairline opens the list, a Hairline closes every row, the label column sits on the left in Ink Three. The index, the acquisitions ledger, data lists, holdings, the workbench steps, libraries and the playground room links all follow it.

## Elevation & Depth

The system is flat. Depth comes from tonal layering (paper, then a tint, then the case) and from hairlines, not from lifted surfaces. Plates, rows, chips, cards and actions carry no shadow at rest or on hover. A shadow appears in exactly one situation: a screenshot inset on its tinted plate, like a print mounted on board. The toast, the only floating element, takes a soft drop to separate it from the page.

### Shadow Vocabulary
- **Mounted print** (`box-shadow: 0 1px 2px rgba(20, 32, 26, 0.10), 0 18px 40px -16px rgba(20, 32, 26, 0.35)`): a screenshot inset on a plate field.
- **Mounted print, large** (`box-shadow: 0 1px 2px rgba(20, 32, 26, 0.12), 0 22px 44px -20px rgba(20, 32, 26, 0.45)`): the bigger plate in the index viewer.
- **Thumbnail print** (`box-shadow: 0 8px 16px -10px rgba(20, 32, 26, 0.5)`): the small plate on a phone-width index row.
- **Toast** (`box-shadow: 0 12px 30px -12px rgba(20, 32, 26, 0.5)`): the confirmation toast.

### Named Rules
**The Mounted Print Rule.** A shadow means a picture mounted on its tint. If the element is not a screenshot sitting on a plate (or the toast), it is flat, and its edge is a hairline or nothing.

## Shapes

Rectilinear with softened corners. Plates and every picture tile (desk tiles, room tiles, document and video tiles) take 6px. Things you press or type into (filter and desk chips, pile links, the search field), screenshots inset on a plate, the numbered step markers and the toast take 4px. The status dot is a 9px square with 2px corners, Kelly's mark from the lab kept on purpose. Full rounding is reserved for small read-only tags.

Pictures hold fixed ratios: 16:10 for plates and tiles (screenshots shot at 1440x900, saved at 1200x750), 16:9 for video, 4:3 for documents, 4:5 for the 404's empty case on desktop. Rails are 1px ink lines threading numbered steps, horizontally across four stations on wide screens and vertically on phones. An empty slot is drawn as an "Empty case": a dashed Strong Hairline edge over fine 135° hatching on Paper Shade.

### Named Rules
**The Pressable Corner Rule.** Anything you can press or type into has 4px corners. Full rounding belongs only to read-only tags (kind, version, private, pending); a fully round button or chip is off-system.

## Components

### Buttons: catalogue actions
Ruled lines in a catalogue, not buttons.
- **Shape:** full-width bars, no fill, no radius; minimum 56px tall with the arrow flush right.
- **Primary:** an action set (`.actions`) is closed top and bottom by 1px ink rules, with Strong Hairline divisions between actions; label in Title small, ink.
- **Hover / Focus:** the label slides 8px right (left padding grows to 10px over 0.45s on the shared ease) and the arrow nudges 4px along its direction (down arrows move down). Focus takes the global Magpie-blue ring.
- **Lock variant:** staff-only actions lead with a 14px padlock glyph and say "(staff only)" in the label.
- **Next object:** the record page ends with a larger bar of the same kind: ink rules above and below, the next object's name in Headline, "Next in the index, plate 02" in Ink Three at the right, title sliding 8px on hover.

### Chips
- **Style:** transparent ground, Strong Hairline border, Ink Two text in Control size, 4px corners, 38px tall (36px on the desk); a count follows the label at 60% opacity.
- **State:** hover moves border and text to ink; pressed (`aria-pressed="true"`) fills ink with paper text. Pile links on the desk use the same chip without a pressed state.

### Cards / Containers: the plate and tombstone (signature)
- **Corner Style:** 6px plate field, 16:10, clipped.
- **Background:** one of the four tints (sand by default); the Magpie plate sits on the case.
- **Shadow Strategy:** none on the plate; the screenshot inside is inset with 5% by 6% padding (7% by 8% in the viewer), 4px corners and the Mounted print shadow.
- **Border:** none.
- **Caption and label:** directly under the field, a Caption line in Ink Three with "Plate NN." and a short honest description on the left and the accession number `KL 2026.NN` on the right. Then the tombstone: title in Title large with the year at 400, a one-line "what" in Ink Two, the medium in Meta and Ink Three, and a foot row with the status dot, a count in Label and an ink text link. Illustrations say so in the caption ("redrawn in HTML"); every plate raster ships with a `.json` provenance note beside it.

### Cards / Containers: desk cards and room tiles
- **Corner Style:** 6px picture tile at 16:10.
- **Background:** the picture, or a rotating tint (mint, sand, lilac, sky) behind initials when no picture exists, which is the honest state.
- **Shadow Strategy:** flat.
- **Body:** kind tag and domain on one line, title in Title small clamped to two lines, the "why" in Label size clamped to three. The whole card is one link; hover zooms the picture to 1.035 over 0.6s and underlines the title.
- **Flat white containers:** design-system cards and notebook pages use Card White, a Hairline border and 6px corners with 16px to 22px padding. They hold text and swatches, never a tint fill.

### Inputs / Fields
- **Style:** the desk search field: 42px tall, Card White ground, Strong Hairline border, 4px corners, a 16px magnifier in Ink Three inside the left edge, placeholder in Ink Three.
- **Focus:** the border turns ink and a 3px Magpie-blue halo at 22% opacity appears; the caret is Magpie blue.
- **Global focus:** every focusable element gets a 2px Magpie-blue outline, 3px offset, 3px corners.

### Navigation
- **Header:** wordmark "Kelly Lucas" in 500 with "the collection" in Ink Three at 400 beside it; links in Meta, Ink Two at rest. Hover turns the link ink and draws a 1px underline in from the left over 0.35s; the current page keeps it drawn. At phone width the subtitle, Log and Contact drop.
- **Crumbs:** "Collection / Index / Plate 01" in Label, Ink Two links, slashes in Strong Hairline, the current object in Ink Three.
- **Footer (the case):** case ground with Case Text. "Say hi." in Headline, then the email at near-headline size whose 1px underline draws across on hover. Three link columns with Case Muted heads; staff-only links carry a padlock. A bottom line, separated by a hairline of Case Text at 14%, carries the copyright and version.

### Status Dot
- **Style:** a 9px square with 2px corners and an 8px gap before a Label word in Ink Two.
- **Variants:** Magpie blue for "In use", Live Green for "Live", Private Violet for "Private". Always a dot plus a word, never color alone. The desk's dot tags use the same mark at 8px with Live Green.

### Index Entry and Plate Viewer (signature)
- **Row:** a five-column grid (number, object, kind, status, arrow) with an 18px vertical rhythm and a Hairline below each row. Number in Meta and Ink Three; title in Title; one-line "what" in Meta and Ink Two.
- **Hover / Focus:** a pale wash of the row's own tint fades in behind the row (0.25s), the arrow nudges 3px and turns ink, and the sticky viewer swaps to that object's plate: the image fades out, the new one arrives after 160ms and settles in from 0.985 scale while the tint changes underneath.
- **Filters:** chips with counts above the list; the live count line updates "N objects".
- **Phone:** the arrow and viewer go; each row carries its own 16:10 thumbnail plate with the Thumbnail print shadow.

### Step Rail
- **Style:** a 1px ink rail threading 28px square markers (4px corners, ink border, paper fill, step number in Label at 500). Step name in Title large, text in Ink Two at about 30ch (homepage) to 62ch (record).
- **Responsive:** four stations across a horizontal rail on desktop; two-up without the rail at tablet; a vertical rail on phones.

### Plate 01: the Magpie drawing (signature)
A working illustration of Magpie's real popup and gallery, built in HTML on the case field and sized in container units so it scales with its plate (a taller stacked drawing below 560px of plate width). It carries Magpie's own UI values: its serif wordmark, a system sans, Magpie-blue "Clip it" button, rounded chips and soft window shadows. Those belong to the drawing and never leave Plate 01. The one authored motion of the page lives here: when 60% of the plate is in view, after 900ms, the popup clips a page; the preview flies into the gallery's first slot (820ms), older clips slide over (640ms), the button reads "Clipped" and resets after 1.6s. Pressing "Clip it" repeats it and raises the toast. Under reduced motion nothing autoplays and a click files the card without the flight.

### Toast
- **Style:** ink ground, paper text in Meta, 4px corners, 12px by 18px padding, Toast shadow, centered 24px above the bottom edge.
- **Motion:** rises 16px into place over 0.5s on the shared ease and hides after 2.8s.

## Do's and Don'ts

### Do:
- **Do** give every object a 16:10 plate on a tint with 6px corners, a caption line ("Plate NN." left, `KL 2026.NN` right) and a tombstone under it.
- **Do** inset screenshots on their tint with 5% to 10% padding, 4px corners and the Mounted print shadow; label any drawing or illustration as one in its caption.
- **Do** set primary actions as ruled catalogue bars: 1px ink rules closing the set, Strong Hairline between actions, 56px minimum height, arrow flush right.
- **Do** set text links in ink with a 1px underline at 38% ink.
- **Do** show status as the 9px square dot plus a word: Magpie blue "In use", green "Live", violet "Private".
- **Do** put metadata after the title, in tombstone order, and keep every heading free of anything above it.
- **Do** set lists as ruled ledgers: Strong Hairline to open, Hairline under each row, label column in Ink Three.
- **Do** keep pressable controls at 4px corners and use full rounding only on read-only tags.
- **Do** use the shared ease `cubic-bezier(0.16, 1, 0.3, 1)` for movement, keep one authored moment per page, and make every page complete without JavaScript and under reduced motion.
- **Do** check every layout at 390px first, with the 16px gutter.

### Don't:
- **Don't** put an eyebrow, kicker, category line or number above a heading.
- **Don't** build hero metric grids of big numbers; counts go in a ruled holdings ledger with the date they were counted.
- **Don't** explain features with same-size icon or tint cards; grids are for real pictures (desk cards, playground rooms).
- **Don't** draw rails, rules or dividers with gradients; a rail is a 1px ink line.
- **Don't** make pill-shaped buttons or pair two pill calls to action.
- **Don't** set any text above 6rem.
- **Don't** use Magpie blue, or any blue, for text or links; it is 3.6:1 on paper.
- **Don't** add a second typeface, a bold headline, or uppercase tracked labels in site chrome.
- **Don't** fill section bands, buttons or text cards with a tint; tints sit behind pictures.
- **Don't** bring lab.css slabs, stickers, confetti or hard shadows onto a collection page; that skin belongs to the playground rooms only.
- **Don't** use em dashes, in copy or in labels.
