# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Visitors who got Kelly's link**: people meeting Kelly through HelioFlux, fellow builders, friends and family. They want to know who she is and see what she has actually built, in under a minute.
- **Kelly herself**: the site is her home base. She uses it to reach her own tools (the private Magpie library, the design desk, the AI workspace field guide) and to put each new real project somewhere it can live.

## Product Purpose

kellylucas.dev is the shelf where Kelly's real projects live. It replaced a playful "lab" that read like a toy box. Success: a visitor leaves knowing Kelly builds useful software for how she works, with Magpie as the clearest proof, and Kelly can add the next project without redesigning anything.

## Positioning

Kelly builds personal tools she runs every day, then puts them on the shelf. The projects are working software with real use behind them (Magpie holds 279 clips from 258 sites as of 2026-08-19), not mockups or tutorials. By day she builds HelioFlux, biophotonic cancer detection.

## Operating Context

- Static HTML, CSS and vanilla JS on Vercel, auto-deploying from `main`. GSAP 3.13 from jsdelivr is the one allowed library. No build step.
- Magpie is Kelly's personal web clipper: a Chrome extension (feather button, tags, notes, a desk-pile guess), a bulk workbench (paste text or drop screenshots, local OCR, dedupe), a Python companion server, Markdown notes in an Obsidian vault plus `library.json`, a gallery, a galaxy star map, YouTube transcripts, open-access paper archiving, and automatic sorting into the five design desk piles. A hosted Magpie Collector handles phone and paste capture.
- The private library at `/brain/gallery.html` and `/api/magpie-*` are password-gated and must stay private.

## Capabilities and Constraints

- Magpie is for Kelly only. Nobody else can install or use it. Do not add "try it", "sign up" or waitlist actions.
- Existing toy pages (pet, pixel garden, panel, noise room, quantum wing, entropy tap, spark notes, font audition room) stay working but move off the homepage onto a Playground page.
- Real projects on hand: Magpie, the design desk, YouTube Transcript Generator, AI Workspace Field Guide, Agent Commons (private), Clue d'État trivia game, Boot Camp side-scroller, Heliopolis art library, Command Center.
- Never expose private Magpie contents: HelioFlux business documents, investor names, Kip-written notes, family names, local paths, server ports, the Collector database IDs.

## Brand Commitments

- Name: Kelly Lucas. Domain kellylucas.dev.
- Heliora is the house typeface, chosen after auditioning 97 fonts.
- The mint, cream and lilac tints and the deep ink green are Kelly's recognizable color family.
- Voice: direct, lowercase-leaning, sentence case, warm, a little funny. No em dashes anywhere in copy.
- Keep some personality (a couple of easter eggs and her voice). It must not look like a generic SaaS template.
- Magpie's mark is the rainbow-and-warm feather (`magpie/extension/icons/magpie-feather.svg` in kip-workspace), with accent blue `#3e7be8`.

## Evidence on Hand

- Magpie numbers from `kip-workspace/magpie/library.json`: 279 clips, 258 sites, 257 tags, 8 transcripts, 10 papers, 31 personal notes, clipped 2026-02-24 to 2026-08-19.
- Design desk: 128 cards, 54 fed by Magpie, 117 public thumbnails in `assets/design/thumbs/`.
- `assets/ai-workspace-field-guide.png`, the field guide map.
- There are no screenshots of the Magpie UI. Any depiction of it must be built from public desk thumbnails and labeled as an illustration.
- No testimonials, users, or metrics beyond the above. Do not invent any.

## Product Principles

1. Real over cute. Every item on the homepage is something that works and gets used.
2. Show the tool doing its job. Specifics beat adjectives.
3. Room to grow. Adding a project is adding a row, not a redesign.
4. Personal, not corporate. Kelly's voice and a few small surprises stay.
5. Private stays private.

## Accessibility & Inclusion

Mobile-first at 390px. Respect `prefers-reduced-motion`; content is visible without JS or the GSAP CDN. WCAG AA contrast for text.
