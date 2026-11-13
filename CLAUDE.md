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
  the colophon says the drawings were made with an image model in Kelly's
  style. The homepage has no places band (Kelly, 2026-11-07: a whole section
  for the art wasted space); the drawings live on the poster and in the
  Heliopolis art library, linked from the projects list and the footer.
- Personality budget: the tab-title message, "Another place", the "Kelly"
  cursor tag on the poster, the little race at the foot of the homepage's
  Say hello band (Kelly's side-view car, red dinos and HelioFlux in place of
  the Red Bull marks, plus two rivals whose leaves are recolored coral and
  honey; all three are 480px WebPs derived from `race-car.webp`:
  `race-car-sm.webp`, `race-car-coral.webp`, `race-car-honey.webp`; kept
  small and low down so it never competes with the poster), the Alt+Shift+M
  reflex on the homepage, the
  "Clip it" demo on the Magpie page, the magpie 404, and the playground.
- Motion: the suns turn very slowly (the spin lives on the svg root), the
  cursor tag bobs, the three race cars sit on a starting grid, launch a
  beat after the Say hello band comes into view, then each laps again every
  few seconds while it is on screen (parked on the grid without JS or with
  reduced motion; images load lazily), the poster
  crossfades on click, the clip demo plays
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
  size, caption, alt).
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
- Site pages (index, magpie, playground, log, colophon, 404) use
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
- `index.html`, `magpie.html`, `playground.html`, `log.html`,
  `colophon.html`, `404.html`: the site
- `brain/`: the Magpie library (`gallery.html`, `library.js`), its design
  systems room (`systems.html`, `systems.js`, `systems-data.js`) and the
  sign-in page
- `style.css`, `script.js`: the site's styles and interactions
- `lab.css`, `lab.js`: the playground rooms' old lab styles and interactions
- `assets/art/`: the drawings (`travel/`, the Pretzel cities, three magpies),
  the favicon and the share card
- The six site pages share one header, footer and SVG sprite; keep them
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

## Design systems room
- The design desk retired on 2026-11-13 (Kelly: "Fold it into Magpie").
  Design links live in the Magpie library's sections; `/design.html`
  redirects to the room.
- `/brain/systems.html` is the design systems room: Kelly's own systems
  (kellylucas.dev, Heliopolis, Pretzel Protocol), their documents and
  drawings, the font audition room, and the three notebook pages. It is
  public, reached from the library's rail, and rendered by
  `brain/systems.js` from `brain/systems-data.js`, a hand-written data file
  (`systems`, `libraries`, `docs`; every entry has a `section` of lab,
  heliopolis or pretzel; files live under `/assets/design/<site>/`, always
  as absolute paths). Bands: sage (Heliopolis), honey (Pretzel), paper
  (notebook, this site). Art strips and notebook pages open in the picture
  viewer. Pages under `/brain/` only load pictures from this site, so a
  drawing kept elsewhere opens as its local copy.
- No HelioFlux work in the room or anywhere public (a test checks). The old
  HelioFlux pile is in `docs/design/helioflux-website/` and
  `docs/design/helioflux-pile.json`: in Git, off the website.
- `lib/desk-rules.json` and `lib/desk-sort.mjs` stay: Magpie's sections read
  them to tell a tool from a gallery from a site. `npm run test:design`
  covers the rules and the room. `sync:design` and `shots:design` are gone.

## Magpie library
- `/brain/gallery.html` is THE Magpie library (Kelly, 2026-11-08: one
  library, shaped like Raindrop.io). Kelly signs in at `/brain/login.html`;
  visitors can browse once she has opened it (see "Open to visitors"
  below). The page and `brain/library.js` own the look.
  Everything lives in private Blob storage: `magpie/library.json`
  (`{items, collections, ...}`), `magpie/notes/`, `magpie/thumbs/`, and a
  daily copy in `magpie/backups/`. `lib/magpie-store.mjs` is the only code
  that reads or writes it (ETag-checked, retried on a clash).
- A sidebar holds Unsorted (new clips land here), Everything, nested
  collections (rename, color, nest, delete inline; drag cards onto them)
  and Trash. Four starter collections were filed by rule on first load:
  HelioFlux, Design ideas, Read & watch, Weird & wonderful. Cards can be
  picked in bulk, filed, trashed, and edited in the side sheet (title, tags,
  note, collection), all with Undo.
- Open to visitors (Kelly, 2026-11-13: "i dont want it to have a
  password"). Reading can be open; adding, editing and deleting always need
  Kelly's sign-in (once per device, 180 days) or the feather's key.
  `lib/magpie-public.mjs` is the one place that decides what a visitor gets,
  and it leans private:
  - Nothing is public until Kelly presses "Open to visitors" in the rail
    (`lib.publicOn`); the card shows the plan first and opening has Undo.
    Never open or close the library from code: previews share the real one.
  - A clip shows only if its collection is on `lib.publicCollections` (the
    six sections other than HelioFlux by default; Kelly opens or keeps in
    any collection from its menu), it is not in Trash and not `private`.
    Unsorted is never shown. HelioFlux can never be opened.
  - Visitors get the card (title, address, picture, tags, Kelly's own note
    and a short description), never the saved copy of the page:
    `/api/magpie-note` stays hers. Other people's writing is linked, not
    republished.
  - Clips that look personal (signed-in apps, keys in the address, private
    tags, an email or phone number in her note, HelioFlux) are marked
    `private` with a reason when the library opens, when a clip is saved,
    and when one is moved or edited. "Only me" in the side sheet locks or
    releases one clip; a released clip is not marked again.
  - The page has two modes, set on `<html data-mode>`: `owner` (everything)
    and `visitor` (browse only; `.owner-only` is hidden until the page knows
    who is looking). `?view=visitor` shows Kelly the visitor's view.
    `tests/magpie-public.test.mjs` covers the rules.
- Sections (Kelly, 2026-11-09: "you pick the sections"): seven collections
  Magpie files into by itself, decided once in `lib/magpie-sections.mjs`
  (first match wins): HelioFlux, Code & skills (anything on GitHub or another
  code host), Science, Design tools, Inspo, Random fun, Read & watch. No
  honest guess means Unsorted. Sorting existing clips is always a button
  with Undo ("Sort into sections" / "File them"), never automatic: preview
  deploys share the real library. Once `sectionsOn` is set, every new clip
  (feather, Add box, Mac merge) files itself unless it names a collection;
  `collection: "unsorted"` waits on purpose. Kelly's own filing always wins:
  only new clips and Unsorted are ever touched. Tests:
  `tests/magpie-sections.test.mjs`.
- "Save from anywhere" (the rail button, or `?connect=1`) lists the three
  ways in. The feather (0.5.0, in `kip-workspace/magpie/extension`) leaves a
  note on this page (`data-magpie-feather` on `<html>`) and connects in one
  press: the page posts the key to it with `postMessage`, same origin only.
  The popup asks `POST /api/magpie-save { guess: true }` where a page would
  be filed and only asks a library whose `sectionsOn` is set, because an
  older library would save the question as a clip.
- Links from our chat: `brain/inbox.json` (`{batches:[{id, title, items:[{url,
  title, note, tags, type, read}]}]}`) is how Claude hands Kelly links it read
  in a chat session, since a cloud session cannot write to her library. The
  page shows a card ("N links from our chat"), adds only the ones the library
  lacks (trashed ones count as had) when she presses "Add them", and Undo
  sends them to Trash. Notes are in our own words: what it is, when to use it,
  and an honest label for anything not read (`read: false` saves a plain
  placeholder into Unsorted). The file is public like the page itself: never
  put anything private or HelioFlux in it. A batch with `from: "desk"` holds
  the old design desk's hand-picked links, with Kelly's own line as the note. Emptying `batches` after she has
  added them is fine but not required.
- Site icons: `/api/magpie-thumb?icon=<host>` fetches a site's icon once,
  keeps it in `magpie/icons/`, serves only sniffed PNG, JPEG, GIF, WebP or
  ICO (never SVG) and answers 204 when there is none. The page's security
  policy stays `img-src 'self'`; do not loosen it for favicons.
- Saving: `POST /api/magpie-save` (the feather, the "Add a link" box, and the
  phone bookmarklet `?add=URL`). Editing: `POST /api/magpie-update` (signed-in
  session only). The feather's key is derived from `MAGPIE_SESSION_SECRET`
  (no new env var), shown only to a signed-in session under "Connect the
  feather", and can save and read; never put it in code or chat.
- `npm run sync:magpie` (on the Mac) still uploads vault notes and previews,
  but MERGES the vault into `library.json` (`mergeVault`): Kelly's edits,
  collections and Trash win. The Mac pulls website clips back into the vault
  with `kip-workspace/tools/magpie/cloud_pull.py` every ten minutes.
  The old `build:magpie` step is retired: never copy the Mac's gallery in.
- Stay at 12 serverless functions or fewer (Hobby plan); there are 11.
- Test it without the password: `npm run preview:magpie` serves the site on
  http://127.0.0.1:4410 with the real handlers on a temp-folder library
  seeded from `tests/fixtures/desk-sample.json` (saves and edits work; the key
  is at `/api/magpie-preview-key`). Any password works except "wrong";
  `?empty=1` and `?fail=1` show the empty and broken states.
  `npm run test:magpie` covers the store and the key.

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
