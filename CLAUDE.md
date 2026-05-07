# CLAUDE.md — Kelly Lucas Personal Website

## Project
Personal website at kellylucas.dev. Practice project for building web dev skills.
Hosted on Vercel (deployment setup TBD).

## Design Direction
Inspired by https://www.isomorphiclabs.com/ (see `Isomorphiclabsinspiration.png`).

The look is a **stacked sequence of rounded color blocks** sitting on a neutral
page background. Each section is its own slab of color with a tag pill in the
corner and big confident sans-serif type. Editorial, calm, premium.

### Visual rules
- Page background is warm off-white (`--page-bg: #f4f2ec`).
- Section blocks alternate: **mint** (`#c9e6c9`), **cream** (`#f6f3e8`),
  **lilac** (`#e3e3ee`). Footer is **deep ink green** (`#14201a`).
- Each block is a generously padded rounded slab (`border-radius: 28px`).
- Every block has a **tag pill** in a top corner ("our research" style).
- Headlines are huge and tight (`letter-spacing: -0.04em`, line-height ~0.95).
- Sans-serif only — no italic serif treatment, no decorative fonts.
- Copy is direct, lowercase-leaning, sentence case.
- Whitespace is generous. Nothing cramped.
- Subtle motion only (fades, gentle hover shifts). No flashy animation.

## Tech
- Static HTML/CSS/JS (no frameworks).
- Single page to start, can add pages later.
- Mobile responsive from the start.

## Typography
- **Inter Tight** for everything (weights 400–600). Loaded from Google Fonts.

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
