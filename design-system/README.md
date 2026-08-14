# Kelly's Lab design system

A sync-ready component library for [Claude Design](https://claude.ai/design), extracted from the live site (v0.9, the Protage restyle). Every card mirrors the real tokens in `style.css`; if the site changes, regenerate these previews to match.

## What's in here

- `components/*.html` - self-contained previews, one card each, tagged with `@dsCard` markers (group, name, subtitle)
- `fonts/` - the two families the previews embed: GC Protage (200/300/400/500) and Neutiva (400/500)

## How to sync it to Claude Design

From an interactive Claude Code session on this repo (your laptop, not a cloud session):

1. Run `/design-login` once if Claude says design access is missing.
2. Ask Claude: "Sync design-system/ to my Claude Design project" - it will list or create a design-system project, show you the plan, and upload these files after you approve.
3. Open [claude.ai/design](https://claude.ai/design), pick the project, and the cards appear in the Design System pane, grouped as Colors, Type, Surfaces, and Components.

Alternative: in Claude Design, use "Send to Claude Code Web" to seed a project into a cloud session, then ask Claude there to fill it from this directory.

## Token cheat sheet

| Token | Value |
|---|---|
| page bg | `#f4f2ec` |
| sky | `#e4f1fb` |
| mint | `#cfe9d3` |
| mint deep | `#a9d3b0` |
| cream | `#f6f3e8` |
| lilac (in progress) | `#e4e4f3` |
| blush | `#f8ece5` |
| ink | `#14201a` |
| hairline | `rgba(20, 32, 26, 0.14)` |
| grid rule | `rgba(20, 32, 26, 0.3)` |
| display | GC Protage 200 (hero) / 300 (titles, ledes) |
| body | Neutiva 400/500, 17px, 1.55 |
| labels | system mono, 11px, 0.12-0.14em tracking, uppercase |
| slab radius | 28px |
