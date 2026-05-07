# Handoff doc — Kelly Lucas project

Last updated: 2026-05-07

## Two projects in flight

| Project | Path | Status | Public? |
|---|---|---|---|
| **kellylucas.dev** (personal site) | `/home/kellybot/kelly-lucas-dev` | Active dev | Eventually deploys to Vercel |
| **HelioFlux** (investor site) | `/home/kellybot/.openclaw/workspace/helioflux-website` (separate codebase, runs at `localhost:8067`) | Already live, font-testing only | Already live |

Kelly is **only pushing to kellylucas.dev**. HelioFlux is a separate project tested in parallel.

---

## Where things live

```
kelly-lucas-dev/
├─ index.html                       # Live homepage (Iso-style stacked slabs)
├─ style.css                        # Main site styles
├─ script.js                        # Header scroll, reveal animations, footer year
├─ all-fonts.html                   # Single consolidated font page (47 specimens)
├─ fonts.css                        # Font playground styles
├─ assets/fonts/                    # All loaded woff2/ttf/otf files
├─ CLAUDE.md                        # Design rules + guardrails
├─ HANDOFF.md                       # This file
├─ Isomorphiclabsinspiration.png    # Design reference screenshot
└─ HTML isomorphic labs.md          # Full Iso HTML (reference only, pasted by Kelly)
```

---

## Design direction (kellylucas.dev)

Inspired by **isomorphiclabs.com**. Stacked rounded color slabs on a warm off-white page bg.

- Page bg: `#f4f2ec` (warm off-white)
- Mint slabs: now use Iso's actual gradient `linear-gradient(0deg, #e6f7ff, #e9ffe9)` (sky → mint, going up)
- Cream slabs: `#f6f3e8`
- Lilac slabs: `#e3e3ee`
- Deep ink footer: `#14201a`
- Slabs have hairline borders: `1px solid rgba(20, 32, 26, 0.10)`
- Tag chips use the dot-tag pattern, dot is a 9×9px rounded square (1.5px radius), per Iso
- Block radius: 28px (CLAUDE.md spec; Iso's actual is 20px — Kelly went bigger on purpose)
- See `CLAUDE.md` for full rules

### Iso CSS tokens pulled directly from their stylesheet (for reference)

```
.bg-amino-acid-ambience-100  linear-gradient(0deg, #e6f7ff, #e9ffe9)
border on cards/slabs        1px solid #d8d8d8
card radius                  20px
button radius                7px
type display-2               56px / line 61.6 / Soehne Extraleicht / -1.7px tracking
type tag-s                   12px / Sohne Mono / 1px tracking / uppercase
dot tag dot                  9px × 9px square, 1.5px radius (NOT a circle)
```

The full Iso HTML is in `HTML isomorphic labs.md` if more structural patterns are needed (asymmetric hero grid, news-card pattern, CTA pill+icon split, etc).

---

## Live state of kellylucas.dev

**Display font:** Surgena (set via `--font-display-active: "Surgena";` in style.css). Used by `.display`, `.quote blockquote`, `.footer-mail`.
**Body font:** Neutiva (set via `--font-active: "Neutiva";`). Used by everything else.
Inter Tight is loaded by index.html but only used by the font playground UI chrome.

**To swap either font:** edit one line in style.css:
```css
--font-active: "Neutiva";          /* body */
--font-display-active: "Surgena";  /* display */
```
Already loaded in style.css: `Neutiva`, `Solo Sans`, `After`, `Surgena` (full family). For others, copy the `@font-face` blocks from `fonts.css`.

**Sections currently on the page:**
1. Hero (mint slab) — "Learning to build the web."
2. About (cream split) — placeholder copy
3. Statement (mint slab) — "Build slowly. Ship anyway. Learn in public."
4. Work three-up cards:
   - Card 1: **YouTube Transcript Generator** (real, links to https://kelly-youtube-transcriber.vercel.app, opens new tab)
   - Card 2 + 3: still placeholders
5. Now (cream slab) — Currently building / reading / next up
6. Quote (mint slab) — placeholder thought
7. Footer (deep ink)

**Nav links:** Work, About, Now, Fonts (→ all-fonts.html), Contact.

---

## Font playground (kellylucas.dev)

**47 specimens total**, all in **`all-fonts.html`** (single page, big-bubble Boulan name chips, 5 categories):

- 🟢 Mint = Plus Jakarta lane (Heliora, Adriatic, Darky, Neutiva, Solo Sans)
- 🟡 Butter yellow = Other workhorses (Lenia × 2, Surgena × 2, Quano, Halfre)
- 🟣 Lilac = Different lane kept (Lupina, Stark, GC Protage, GC Quark)
- 🟠 Peach = Accent (After, CS Anatole Reverse, Qumelan Thin, Qalget × 2, Mazegin, Quanta, Quantie)
- ⚪ Warm gray = Cut from contention

The earlier split pages (`shortlist.html`, `newfonts.html`, `fonts.html`) were collapsed into this single page on 2026-05-07 and removed.

Test sentence in every specimen (pangram):
> Kelly is loving testing out fonts real quick just to check the vibez for my personal website and maybe HelioFlux later.

---

## HelioFlux — fonts SETTLED

After 3 batches of zips and 40+ specimens tested across `localhost:8067/index-{font}.html` test pages, **decision:** keep current **Plus Jakarta Sans (display) + DM Sans (body)**. None of the alternatives offered enough payoff to justify the swap. See memory `feedback_fonts_decided.md` for the full reasoning. **Don't reopen the font search unless Kelly explicitly asks.**

The 14 batch-3 test pages (altone, certia, company, just-sans, linear-grotesk, luxora-grotesk, neira, raela-pro, resonate, rosity, serotiva, standerd, stara, xenon-nue) are still in the helioflux-website folder for revisiting if needed.

**Remaining HelioFlux TODO** (from HANDOFF history, still valid): bump the **"No blood draw. No biopsy. No radiation."** subtitle — currently too whisper-quiet. Target ~18-22px, `letter-spacing: 0`, ~70% opacity.

---

## Recent moves (2026-05-07)

- Consolidated 3 font pages into `all-fonts.html`, removed the others.
- Added YouTube Transcript Generator as first project card (replaced placeholder).
- Pulled Iso's actual CSS tokens via WebFetch.
- Applied "Iso polish v1" to style.css: gradient mint slabs (sky → mint), hairline borders on every block, dot-tag dot converted from circle to 9px rounded square.
- HelioFlux fonts officially settled (Plus Jakarta Sans + DM Sans stays).
- /frontend-design skill was invoked — produced a list of next moves (display font swap, motion, "made in public" signature, accent color).
- **Split display font from body:** added Surgena `@font-face` blocks to style.css, introduced `--font-display-active` token. Display headlines (`.display`, `.quote blockquote`, `.footer-mail`) now use Surgena; body stays on Neutiva.
- **Added "made in public" signature** in the footer above `.footer-bottom`: pulsing dot + dot-separated status string (`v0.5 · last edited 2026-05-07 · 47 fonts tested · 1 tool shipped · made in public`). Bump these strings as the site evolves — the version number, last-edited date, and tally are the bits that should drift over time.

## ⚠️ Gotcha: not a git repo

Despite CLAUDE.md rule #4 ("Commit working states to Git before big changes"), `/home/kellybot/kelly-lucas-dev` is **not currently a git repo**. No `.git` folder. Means there's no version history and no way to revert. Two options:

1. **Run `git init`** in this folder and commit the current state as v0. Then rule #4 actually works.
2. **Ignore rule #4** and accept that big changes are one-way. (Risky, but matches reality.)

Worth raising with Kelly early in the next session if she's about to make any big change.

---

## Open decisions / next moves

1. ~~**Display font swap**~~ ✅ Done — Surgena is now the display face, Neutiva stays on body. Kelly may still want to A/B Heliora vs Surgena later.
2. **Page-load motion** — Iso uses GSAP-staggered reveals on each block. ~30 lines if added.
3. ~~**"Made in public" signature**~~ ✅ Done — pulsing dot + dot-separated status line in footer. Update the version/date/tally as things ship.
4. **One sharp accent color** — current palette is 3 soft tints, no hierarchy. Iso uses cyan; Kelly's site has no equivalent anchor color yet.
5. **Asymmetric hero** — Iso's hero is a 3-cell grid (big + small + paragraph). Currently kelly-lucas-dev hero is full-width. Worth experimenting.
6. **Real content** — Work cards 2 and 3 still placeholder. About copy generic.
7. **Vercel deploy** — kellylucas.dev not yet pushed. Domain TBD.

---

## Workflow notes

- **Live preview:** Live Server on `http://127.0.0.1:5500/` for kellylucas.dev. HelioFlux at `localhost:8067`.
- **Screenshot tool:** `chromium-browser --headless --disable-gpu --hide-scrollbars --window-size=1440,2400 --screenshot=$HOME/font-screenshots/foo.png "http://127.0.0.1:5500/index.html"` (snap chromium can't write to /tmp; use $HOME).
- **Fonts arrive in zips at:** `C:\Users\kellybot\Desktop\FONTS!!!!!!!!!!!!!!!!!\` (and `FONTS2`, `FONTS3` variants). WSL path: `/mnt/c/Users/kellybot/Desktop/...`
- **Adding new fonts:** extract zip → copy `.woff2` (or smallest format) into `assets/fonts/` → wire `@font-face` in `fonts.css` → add a specimen section to `all-fonts.html` under the right category.

---

## Memory store

Long-lived notes live in `/home/kellybot/.claude/projects/-home-kellybot-kelly-lucas-dev/memory/`. Current entries:
- `design_reference.md` — Isomorphic Labs as design north star
- `feedback_fonts_decided.md` — HelioFlux fonts settled, don't reopen

---

## Rules to remember (from CLAUDE.md)

1. No em dashes anywhere in copy.
2. Mobile-first: test at 390px width.
3. CSS lives in style.css, not inline.
4. Commit working states to Git before big changes.
5. When Kelly says "push," push to main without asking.
6. Match the Iso aesthetic: light, airy, slab-block, sans-serif only, generous whitespace.
