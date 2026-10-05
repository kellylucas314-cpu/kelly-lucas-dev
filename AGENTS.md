# AGENTS.md, Kelly Lucas Personal Website

## Project
Personal website at kellylucas.dev: the home for Kelly's real projects, with
Magpie up front. Still a place to build web skills in public.
Hosted on Vercel, auto-deploys from main.

## Design Direction
"Drawn in the Heliopolis style" (v1.0, 2026-10-05). The site is where Kelly's
real projects live, with Magpie up front. It borrows the look of Heliopolis
(the HelioFlux team space Kelly designed): warm paper, a fine navy pen, one
drawing per view, lots of calm space. It has its own six colors. It replaced
the v0.5 to v0.9 "lab" (stacked slabs, stickers, confetti), which now lives on
only in the playground rooms. Product truth lives in `PRODUCT.md`; the built
visual system is recorded in `DESIGN.md`.

### Visual rules
- Six colors. Paper `#f8f6f1` and navy `#1f355e` do the work. Pale teal
  `#d4e7e5` and pale coral `#f6dcd8` fill the drawings; teal `#5a9e9a` and
  coral `#d6605b` are small accents. Navy carries every word: coral and teal
  fail contrast as text, so they are only marks (link underlines, status
  dots, the active nav line). Focus rings are navy.
- Drawings lead. Every page opens with one drawing from `assets/art/`, never
  boxed in or cropped, with paper all around it. The homepage hero shows a
  different place each visit (Torres del Paine first) with a caption and an
  "Another place" button; the list lives in `script.js` (`PLACES`).
- One typeface, Lato (Heliopolis's face): Light 300 for display and section
  titles, Regular 400 for reading, Medium 500 for small tracked labels, Bold
  700 for standalone links. Hierarchy from size and weight. No eyebrows or
  kickers above headings; metadata goes after the title.
- A fine pen: 1px navy rules between sections, hairline `--rule-2` rows,
  flat fills, no shadows anywhere. Standalone links are underlined labels
  with a small drawn arrow (`.tlink`); running-text links are navy with a
  coral underline. No pill buttons.
- Status is Kelly's 9px square dot, always with its word: coral "In use",
  teal "Live", navy outline "Private".
- Copy is direct, warm, sentence case, curly apostrophes. Honest labels: the
  Magpie popup says it is redrawn in HTML, counts say when they were counted,
  the colophon says the drawings were made with an image model.
- Personality budget: the tab-title message, "Another place", the Alt+Shift+M
  reflex on the homepage, the "Clip it" demo on the Magpie page, the magpie
  404, and the playground. Keep it to a handful.
- Motion: one authored moment per page (the place crossfade at home, the clip
  on the Magpie page), plus small hover transitions. Always respects
  `prefers-reduced-motion`, never hides content.

## Drawings
- Made in Kelly's Heliopolis style with an image model (gpt_image_2_5 on
  Higgsfield, the Heliopolis courtyard, plant-books and library images as
  style references), then recolored into the six colors and snapped to the
  exact palette. Each WebP in `assets/art/` has a `.webp.json` sidecar with
  its prompt (kept off the deploy by `.vercelignore`).
- A new drawing: generate it in the Heliopolis three colors (navy, lime,
  cream) with no sun, then recolor it by meaning into the six colors (water
  and leaves teal, stone and roofs coral, small accents only), snap it to the
  palette, trim it and save it as WebP with alpha. Show Kelly before it ships.

## Adding a project
1. Add an `<li>` to the projects list in `index.html` (copy a row): number,
   title, one-line "what", kind, status dot. External links open in a new tab
   with a visually hidden "(opens in a new tab)".
2. Update "All ten projects" and "Ten things I've made" to the new count.
3. Add a line to the homepage log and to `log.html`.

## Tech
- Static HTML/CSS/JS, no frameworks and no build step.
- Site pages (index, magpie, design, playground, log, colophon, 404) use
  `style.css` and `script.js`: vanilla JS and the Web Animations API, no
  GSAP. Every feature null-checks its targets; pages read fine without JS.
  `localStorage` (the place rotation) is wrapped in try/catch.
- Playground rooms (claude, pet, panel, noise, quantum, qrng, quotes) keep the
  old look on `lab.css` and `lab.js`, which still load GSAP 3.13.0 from
  jsdelivr (core, ScrollTrigger, Draggable; free plugins only).
- Use absolute paths (`/style.css`, `/magpie.html`) in site pages so
  `404.html` works at any URL.
- Mobile responsive from the start.

## Typography
- **Lato** 2.0 (OFL) for everything, self-hosted as Latin-subset WOFF2 in
  `assets/fonts/` (`Lato-Light`, `-Regular`, `-Medium`, `-Bold`), cut from the
  Heliopolis art library's TTFs with `pyftsubset`.
- `assets/fonts/` also holds Heliora (the face of v0.5 to v0.9) and the other
  auditioned fonts used by the `all-fonts.html` audition room and the lab rooms.

## File Structure
Keep it clean. No backup files, no version-numbered copies.
- `index.html`, `magpie.html`, `design.html`, `playground.html`, `log.html`,
  `colophon.html`, `404.html`: the site
- `style.css`, `script.js`: the site's styles and interactions
- `lab.css`, `lab.js`: the playground rooms' old lab styles and interactions
- `assets/art/`: the drawings (`travel/`, the Pretzel cities, three magpies),
  the favicon and the share card
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
  untouched. Every entry carries a `section`.
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
3. Keep CSS in `style.css`, not inline.
4. Commit working states to Git before making big changes.
5. When I say "push," push to main without asking.
