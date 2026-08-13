# CLAUDE.md, Kelly Lucas Personal Website

## Project
Personal website at kellylucas.dev. Practice project for building web dev skills.
Hosted on Vercel, auto-deploys from main.

## Design Direction
"Kelly's lab": a playful interactive workbench for learning in public.
Structurally it keeps the Isomorphic Labs DNA (stacked rounded color slabs,
dot tags, huge sans headlines; see `Isomorphiclabsinspiration.png`), but the
vibe is charming and personal over slick and corporate: draggable stickers,
scribble margin notes, visible version numbers, honest unfinished states,
small easter eggs.

### Visual rules
- Page background is warm off-white (`--page-bg: #f4f2ec`).
- Section blocks alternate soft pastels: **mint** (sky-to-mint gradient,
  `--sky #e4f1fb` to `#eaf6ec`), **cream** (`#f6f3e8`), **lilac** (`#e4e4f3`),
  **blush** (`#f8ece5`, quote block). Footer is **deep ink green** (`#14201a`).
- Lines are thin: hairline borders (`--line`), light grid rules (`--rule`),
  graph-paper texture on the hero and footer. No heavy shadows.
- **Lilac means "experiment in progress / unfinished"** (e.g. the experiment 03 card).
- Each block is a generously padded rounded slab (`border-radius: 28px`).
- Every block has a **dot tag** in a top corner.
- Headlines are huge and tight (`letter-spacing: -0.04em`, line-height ~0.95).
- Sans-serif only. No italic serif treatment, no decorative fonts.
- Copy is direct, lowercase-leaning, sentence case.
- Whitespace is generous. Nothing cramped.
- Playful motion is welcome (confetti, drag physics, split-text reveals) but
  must respect `prefers-reduced-motion` and never block reading.
- Easter egg budget: keep it to a handful per page so charming never tips
  into noisy. Current eggs: logo mark 5-click confetti, "97 fonts auditioned"
  font roulette, konami code, footer changelog popover, experiment 03 status
  cycler, tab-title message.

## Tech
- Static HTML/CSS/JS, no frameworks and no build step.
- One exception: **GSAP via jsdelivr CDN** (pinned 3.13.0; core, ScrollTrigger,
  Draggable; free plugins only, no Club plugins).
- Animations must degrade gracefully: initial hidden/offset states are set in
  JS (`gsap.from`), never in CSS, so content stays visible if the CDN fails.
- `script.js` is shared by index.html and quotes.html; every feature must
  null-check its DOM targets.
- Mobile responsive from the start.

## Typography
- **GC Protage** for display type (headlines, ledes, card titles; ExtraLight
  200 at hero sizes, Light 300 below that). Local files, weights 100 to 800.
- **Neutiva** for body copy (400/500).
- **System mono stack** (`--font-mono`) for the little instrument labels:
  dot tags, nav-adjacent pills, CTA labels, list labels, footer signature.
- `assets/fonts/` also holds the other auditioned fonts used by the
  `all-fonts.html` testing rig and the font roulette easter egg.

## File Structure
Keep it clean. No backup files, no version-numbered copies.
- `index.html`
- `style.css` (all styles, not inline)
- `script.js` (interactions/animations if needed)
- `assets/` (images, fonts)
- Use Git for version control instead of backup files

## Rules
1. No em dashes anywhere in copy.
2. Mobile-first: test at 390px width.
3. Keep CSS in `style.css`, not inline.
4. Commit working states to Git before making big changes.
5. When I say "push," push to main without asking.
