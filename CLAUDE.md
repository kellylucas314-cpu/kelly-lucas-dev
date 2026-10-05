# CLAUDE.md, Kelly Lucas Personal Website

## Project
Personal website at kellylucas.dev: the home for Kelly's real projects, with
Magpie up front. Still a place to build web skills in public.
Hosted on Vercel, auto-deploys from main.

## Design Direction
"A poster of a place" (v1.0, 2026-10-05). The site is where Kelly's real
projects live, with Magpie up front. The structure and shape language come
from figma.com/slides (a calm frame, big regular-weight type, chunky flat
shapes, bands of color); the pictures are Kelly's travel drawings in her
Heliopolis style, never square UI mockups. It has eight colors: her six plus
honey and sage. It replaced the v0.5 to v0.9 "lab" (stacked slabs, stickers,
confetti), which now lives on only in the playground rooms. Product truth
lives in `PRODUCT.md`; the built visual system is recorded in `DESIGN.md`.

### Visual rules
- Eight colors. Paper `#f8f6f1` and navy `#1f355e` carry every word. Teal
  `#5a9e9a`, coral `#d6605b`, honey `#f0bf4c` and sage `#9fb78f` carry the
  shapes. Pale teal `#d4e7e5`, pale coral `#f6dcd8` and the honey and sage
  tints are the bands. Navy on coral or teal is only for large text (the
  pills); never body copy. No bright blue, no violet.
- A poster, not a hero. Every page opens with one of Kelly's drawings on a big
  round shape (the home poster: Torres del Paine on a honey sun, a few
  chunky shapes around it, an "Another place" button that cycles 13 places on click;
  Torres shows on every load). Drawings are never boxed in or cropped.
- Round, never square. Shapes are SVG symbols (sun, rays, cog, blob, bean,
  arch, circle, asterisk, plus, quatrefoil, squiggle) in the sprite at the top
  of every page, colored with `.c-*` classes. Buttons are pills (`.btn`). Bands
  (`.band`) end in waves or scallops (`.edge`, `.edge--scallop`). Screenshots
  show through a soft blob (`#blob-clip`). No shadows, no rectangles with
  corners.
- One typeface, Instrument Sans (variable, 400 to 700), at a regular weight
  and big where it matters: `.h1` 86px, `.h2` 52px, `.lede` 22px, body 16px.
  DM Mono only for dates, numbers and small labels. No eyebrows or kickers
  above headings; metadata goes after the title.
- Status is a round dot with its word: navy "In use", deep teal "Live",
  deep coral "Private".
- Copy is direct, warm, sentence case, curly apostrophes. Honest labels: the
  Magpie popup says it is redrawn in HTML, counts say when they were counted,
  the places band and the colophon say the drawings were made with an image
  model in Kelly's style.
- Personality budget: the tab-title message, "Another place", the "Kelly"
  cursor tag on the poster, the Alt+Shift+M reflex on the homepage, the
  "Clip it" demo on the Magpie page, the magpie 404, and the playground.
- Motion: the suns turn very slowly (the spin lives on the svg root), the
  cursor tag bobs, the poster crossfades on click, the clip demo plays
  once on the Magpie page. `prefers-reduced-motion` turns all of it off and
  nothing is hidden behind JS.

## Drawings
- Made in Kelly's Heliopolis style with an image model (gpt_image_2_5 on
  Higgsfield, the Heliopolis courtyard, plant-books and library images as
  style references), then recolored by meaning into the site's colors and
  snapped to the exact palette. Each WebP in `assets/art/` has a `.webp.json`
  sidecar with its prompt (kept off the deploy by `.vercelignore`).
- A new drawing: generate it in the Heliopolis three colors (navy, lime,
  cream) with no sun, then recolor it by meaning (water and leaves teal,
  stone and roofs coral, small accents only), snap it to the palette, trim it
  and save it as WebP with alpha. Show Kelly before it ships.
- A new place on the homepage: add it to `PLACES` in `script.js` (file,
  size, caption, alt) and, if it should appear in the scatter, to the places
  list in `index.html`.
- `magpie-drawer-sm.webp` is the 480px copy of the drawer magpie for the
  Magpie note, and the project screenshots in `assets/collection/` have
  320px `-sm.webp` copies for the phone thumbnails. They are derived files
  (Pillow, Lanczos, quality 82): regenerate one when its source changes.
  They need no prompt sidecar.

## Adding a project
1. Add an `<li>` to the projects list in `index.html` (copy a row): number,
   title, one-line "what", kind, status dot, `data-img` (a 1200x750 screenshot
   in `assets/collection/`, privacy-checked), `data-kind` and `data-status`
   for the preview. External links open in a new tab with a visually hidden
   "(opens in a new tab)".
2. Update "All ten projects" and "Ten things I've made" to the new count.
3. Add a line to the homepage log door and to `log.html`.

## Tech
- Static HTML/CSS/JS, no frameworks and no build step.
- Site pages (index, magpie, design, playground, log, colophon, 404) use
  `style.css` and `script.js`: vanilla JS and the Web Animations API, no
  GSAP. Every feature null-checks its targets; pages read fine without JS.
- Playground rooms (claude, pet, panel, noise, quantum, qrng, quotes) keep the
  old look on `lab.css` and `lab.js`, which still load GSAP 3.13.0 from
  jsdelivr (core, ScrollTrigger, Draggable; free plugins only).
- Use absolute paths (`/style.css`, `/magpie.html`) in site pages so
  `404.html` works at any URL.
- Mobile responsive from the start.

## Typography
- **Instrument Sans** (OFL, variable 400 to 700) for everything and
  **DM Mono** (OFL) for small labels, self-hosted as WOFF2 in `assets/fonts/`
  with their licenses next to them.
- `assets/fonts/` also holds Lato (Heliopolis's face), Heliora (the face of
  v0.5 to v0.9) and the other auditioned fonts used by the `all-fonts.html`
  audition room and the lab rooms.

## File Structure
Keep it clean. No backup files, no version-numbered copies.
- `index.html`, `magpie.html`, `design.html`, `playground.html`, `log.html`,
  `colophon.html`, `404.html`: the site
- `style.css`, `script.js`: the site's styles and interactions
- `lab.css`, `lab.js`: the playground rooms' old lab styles and interactions
- `assets/art/`: the drawings (`travel/`, the Pretzel cities, three magpies),
  the favicon and the share card
- The seven site pages share one header, footer and SVG sprite; keep them
  identical across pages when editing (a small generator outside the repo
  wrote them, but they are plain HTML and can be edited by hand)
- `assets/collection/`: project screenshots, the Magpie feather, clip and room
  thumbnails
- `PRODUCT.md` (product truth), `DESIGN.md` (the built visual system)
- Use Git for version control instead of backup files

## Proxied paths
- `/heliopolis/*` is not a folder in this repo. `vercel.json` rewrites it to the
  Heliopolis art library (`kellylucas314-cpu/heliopolis-art-library`, served by
  GitHub Pages). Edit the art there, not here.

## Design desk
- `design.html` (the design desk) is the public swipe file, in five piles: the HelioFlux
  website, Heliopolis, Pretzel Protocol, resources, examples (plus "the lab
  itself", shown as "This site", for this site's own rules). It renders
  `design-library.js`, a
  generated data file: `manual` entries are hand-written, `items` is rebuilt
  by `npm run sync:design` from the Magpie vault. `systems` (one design system
  per site, with palette and rules), `libraries` (Kelly's own art and font
  libraries) and `docs` (style PDFs, boards, image strips; files live under
  `assets/design/<pile>/`) are hand-written and pass through the sync
  untouched. Every entry carries a `section`. Each pile is a `.band` with
  its own `.wrap`, paper and tints alternating with wave edges, and the
  cards are flat fills with no borders, like the rest of the site.
- Where a clip lands is decided once, in `lib/desk-sort.mjs` from
  `lib/desk-rules.json`: Kelly's own sites go to their pile; sites tagged or
  described for a project go there; anything with a design signal is a
  resource (gallery, tool, repo, reading, video) or an example (a site); the
  rest stays in the vault. A `desk:<section>` tag on the clip wins and
  `desk:none` keeps it off. The sync copies the rules into the vault
  (`magpie/desk-rules.json`) so the Magpie server and the Chrome clipper
  (which shows the guess in its popup) sort the same way. Tests:
  `npm run test:design`. Video cards show takeaways from the clip's `## Notes`
  bullets, or an honest "notes pending" state until those exist.
- Pictures: a card shows its Magpie preview when the vault has one
  (`npm run sync:design -- --thumbs` copies them in). For cards without one,
  `npm run shots:design` shoots the page with a headless Chrome and saves
  `assets/design/thumbs/<card id>.jpg`; run `npm run sync:design` after.
  Videos use their YouTube frame. A card with no picture shows initials,
  which is the honest state.
- Cards are picture first, like a database's gallery view: the whole card
  is one link; a 16:10 tile, a kind pill in the site's tints (gallery pale
  teal, tool pale coral, reading honey tint, site outline, repo navy), the title, and the why
  clamped to two or three lines. Four across on desktop, two on a phone.
  Filter chips carry counts. No OPEN buttons on cards, no ruled cells.
  The resources shelf shows its newest 16 and folds the rest behind
  "Show all"; any filter or search shows every match.

## Skills in the lab
- `.claude/skills/` holds Claude Code skills from Jack Roberts' design loop, kept
  off the Vercel deploy. All of them need the open web or local tools, so run
  them from the Mac or from a session whose network allows the target hosts.
  - `design-loop`: interview, preflight, teardown, then a builder and three
    fresh-context critics until all three pass. Uses CLAUDE.md as the system doc.
  - `design-teardown`: measure two sites, diff nine dimensions, build an
    interactive spec. The first run lives in `docs/design/`.
  - `rtf`: YouTube URL to word-level transcript and graphic moments; needs
    yt-dlp and ffmpeg.
  - `site-blueprint`: scrape a niche's top homepages with Firecrawl and derive
    the section order.
  - `website-intelligence`: scrape a client site, score competitors, write the
    analysis, then build; Firecrawl with a WebFetch fallback.
  - `3d-animation-creator`: a short video becomes a scroll-scrubbed page;
    needs ffmpeg. Its default styling is not the lab's.

## Rules
1. No em dashes anywhere in copy.
2. Mobile-first: test at 390px width.
3. Keep CSS in `style.css`, not inline. (Per-item values such as `--c`,
   `--r`, `--s` and `--t` on a list item are data, not rules, and are fine.)
4. Commit working states to Git before making big changes.
5. When I say "push," push to main without asking.
