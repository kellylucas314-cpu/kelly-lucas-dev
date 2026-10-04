# AGENTS.md, Kelly Lucas Personal Website

## Project
Personal website at kellylucas.dev: the home for Kelly's real projects, with
Magpie up front. Still a place to build web skills in public.
Hosted on Vercel, auto-deploys from main.

## Design Direction
"The collection" (v1.0, 2026-10-04). The site is where Kelly's real projects
live, published like a museum's online collection: every project is an object
with a plate (a picture on a tinted backdrop), a tombstone label (title, year,
what it is, what it is made with, status) and an accession number
(`KL 2026.NN`). Magpie is plate 01 and leads the homepage. It replaced the v0.5
to v0.9 "lab" (stacked slabs, stickers, confetti), which now lives on only in
the playground rooms. Product truth lives in `PRODUCT.md`; the built visual
system is recorded in `DESIGN.md`.

### Visual rules
- Paper ground (`--paper: #f4f2ec`), deep ink green text and "case"
  (`--ink: #14201a`), footer in the case color.
- Kelly's tints are plate backdrops, not decoration: mint `#c9e6c9`, lilac
  `#e3e3ee`, sand `#ebe3cf`, sky `#d9eaf3`.
- The Magpie feather (rainbow plus warm half) is the only saturated color on a
  page. Links use `--link: #2456c9`; focus rings use Magpie blue `#3e7be8`.
- One typeface, Heliora. Hierarchy from size and weight only. No eyebrows or
  kickers above headings; metadata goes after the title.
- Status is Kelly's 9px square dot: blue "In use", green "Live", violet
  "Private".
- Rectilinear plates with a 6px radius, hairline rules (`--rule`), no heavy
  shadows. Pills for buttons and filters.
- Copy is direct, warm, sentence case. Honest labels: screenshots are real,
  the Magpie plate says it is redrawn in HTML, counts say when they were counted.
- Personality budget: the tab-title message, the "Clip it" demo in plate 01,
  the museum-label 404, and the playground. Keep it to a handful.
- Motion: one authored moment per page (the plate 01 clip), plus small hover
  transitions. Always respects `prefers-reduced-motion`, never hides content.

## Adding a project to the collection
1. Shoot a 1440x900 screenshot of it and save `assets/collection/<slug>.webp`
   at 1200x750 (ffmpeg works). Never show private data: check the shot for
   names, investor or family details before committing.
2. Add an `<li>` to the index in `index.html` (copy a row): number, title,
   one-line "what", kind, status, and the `data-*` fields the plate viewer
   reads (`data-what`, `data-medium`, `data-status`, `data-plate`, `data-tint`).
3. Update the filter counts and the "In the collection" fact, then add a line
   to "Recent acquisitions" and `log.html`.

## Tech
- Static HTML/CSS/JS, no frameworks and no build step.
- Collection pages (index, magpie, design, playground, log, colophon, 404)
  use `style.css` and `script.js`: vanilla JS and the Web Animations API, no
  GSAP. Every feature null-checks its targets; pages read fine without JS.
- Playground rooms (claude, pet, panel, noise, quantum, qrng, quotes) keep the
  old look on `lab.css` and `lab.js`, which still load GSAP 3.13.0 from
  jsdelivr (core, ScrollTrigger, Draggable; free plugins only).
- Use absolute paths (`/style.css`, `/magpie.html`) in collection pages so
  `404.html` works at any URL.
- Mobile responsive from the start.

## Typography
- **Heliora** for everything, self-hosted as WOFF2 (TTF fallback) in
  `assets/fonts/`, weights 300 to 700.
- `assets/fonts/` also holds the other auditioned fonts used by the
  `all-fonts.html` audition room and the lab rooms.

## File Structure
Keep it clean. No backup files, no version-numbered copies.
- `index.html`, `magpie.html`, `design.html`, `playground.html`, `log.html`,
  `colophon.html`, `404.html`: the collection
- `style.css`, `script.js`: the collection's styles and interactions
- `lab.css`, `lab.js`: the playground rooms' old lab styles and interactions
- `assets/collection/`: plates, the Magpie feather, clip and room thumbnails
- `PRODUCT.md` (product truth), `DESIGN.md` (the built visual system)
- Use Git for version control instead of backup files

## Proxied paths
- `/heliopolis/*` is not a folder in this repo. `vercel.json` rewrites it to the
  Heliopolis art library (`kellylucas314-cpu/heliopolis-art-library`, served by
  GitHub Pages). Edit the art there, not here.

## Design desk
- `design.html` (plate 02) is the public swipe file, in five piles: the HelioFlux
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
