# kellylucas.dev handoff (Nov 7, 2026)

Everything from the old "🦕 kellylucas.dev" Claude project, in one place on
GitHub. In a new project, point Claude at `handoff/HANDOFF.md` and it has the
whole picture.

## What you lose if you delete the old project

Once this folder is merged into main, almost nothing. Only these:

1. **Three branches that live only on your Mac**, in
   `~/Documents/New project/kelly-lucas-dev`:
   `codex/font-lab-recovered-20260818`, `codex/private-magpie-library`,
   `rescue/live-site-pre-sync-20260818`. To keep them, push each one to GitHub.
2. **The Magpie vault** (your clips, library.json, the generated
   gallery.html), on purpose: it's private and stays on your Mac in
   `~/Documents/GitHub/kip-workspace/magpie`. The restyle code itself is now
   saved (see "Magpie restyle" below).
3. **The Monday "Weekly site check" routine.** Routines don't move between
   projects. Recreate it in the new project from the text below.

Everything else (the handoff note, rules, memory, history file and
screenshots) is in this folder.

## What's in this folder

- `HANDOFF.md`: this file
- `kellylucas-dev-history.md`: the full history write-up from Oct 9
- `screenshots/`: homepage polish, logo options and race car screenshots

This folder is kept off the live website by `.vercelignore`.

---

## 1. What it is

Kelly's personal site: a colorful "poster" homepage plus a design desk,
Magpie (private clipping library) and side experiments.

## 2. Where it lives

- Repo: github.com/kellylucas314-cpu/kelly-lucas-dev
- Live: kellylucas.dev, /design.html (design desk), /heliopolis (art library,
  served from the heliopolis-art-library repo), agentcommons.kellylucas.dev
  (/brain/room.html, private, retired)
- Key files: design-library.js, lib/desk-rules.json (five piles),
  .claude/skills/ (rtf, design-teardown, site-blueprint, design-loop,
  3d-animation-creator, website-intelligence)
- Deploys: Vercel. Every PR gets a preview link. Merging to main goes live.

## 3. Done

- Poster redesign live (PR #13, #14)
- Homepage polish: shorter Magpie band, tighter Say hello, no pills (PR #15)
- Logo: coral flower kept, 24px (PR #17)
- Design desk, picture cards, five piles + Magpie auto-sort (PR #9 to #11)
- Old PR #7 closed
- Monday "Weekly site check" routine: last run Nov 2, nothing broken

## 4. Unfinished

- PR #16 race car (draft, checks pass): red dinos + "HelioFlux," 220px/160px.
  Waiting on "push live."
- Branch claude/design-library (55dfe8f): private /brain/design-library.html.
  Kelly chose "go live," the upload failed on a usage limit. 38+ commits
  behind main.
- Branch claude/lounge-turn-script (3463387): Agent Commons launcher. Only if
  it comes back.
- Magpie gallery shelves: waiting on Kelly's rule for which clip goes on which
  shelf (shelfFor() in build_gallery.py, kip-workspace branch
  claude/magpie-restyle-handoff)
- Bird where the bubbles were: yes or no?
- Impeccable skill: recommended skip
- 6 merged branches can be deleted
- Weekly routine lives in the old project. Recreate it in the new one.

## 5. At risk

- Screenshots + kellylucas-dev-history.md: now saved in this folder.
- Old Mac-only branches: codex/font-lab-recovered-20260818,
  codex/private-magpie-library, rescue/live-site-pre-sync-20260818. Save: push
  each to GitHub from ~/Documents/New project/kelly-lucas-dev.
- Magpie restyle: SAVED Nov 7, 2026. Repo kellylucas314-cpu/kip-workspace,
  branch `claude/magpie-restyle-handoff` (commit 93ab880): build_gallery.py
  (shelfFor() still unfinished), magpie-hero.svg, 14 shelf icons, Lato fonts +
  license. Not merged, no PR yet. The vault (clips, library.json,
  gallery.html) was left out on purpose and stays on the Mac. Local server is
  127.0.0.1:8765.
- SECURITY.md and SECURITY-ROTATION-CHECKLIST.md: Kelly meant to delete
  them. The deletion is committed on the same kip-workspace branch (e830afb);
  they leave master when that branch is merged.

## 6. Rules to keep (project instructions)

1. Plain-language replies, short, no jargon. Kelly has ADHD: lead with the
   answer and the single next step.
2. Go easy on usage: no long debugging loops, review agents, screenshot sweeps
   or background teams unless Kelly asks.
3. Build on a branch and open a draft PR. Only merge or "push live" when Kelly
   says so.
4. Style: Heliopolis is Kelly's default design base, but color and other
   elements should vary freely from project to project. kellylucas.dev keeps
   its current colorful "poster" style (Kelly: a cross between Figma Slides and
   Heliopolis, but colorful). Build on that look; don't pull it back toward
   plain Heliopolis. Keep decoration subtle (no floating bubbles).
5. For visual changes, show a desktop and a phone screenshot.
6. Jeopardy, Pretzel Protocol and Heliopolis are separate projects; keep them
   out of this one unless Kelly brings them in.

Also from the handoff note:

- Secrets: the Magpie password and private Vercel storage stay in Vercel
  settings, never in chat or code. HelioFlux design material stays behind the
  password (it's private business work).
- Link other creators' content, don't republish it.

## 7. Weekly site check routine (recreate this)

- Name: Weekly site check
- Schedule: Mondays at 15:45 UTC (cron `45 15 * * 1`)
- Description: Mondays, confirm kellylucas.dev matches main and list any PRs
  left open
- Prompt:

> For kellylucas314-cpu/kelly-lucas-dev: list open PRs and unmerged claude/*
> or codex/* branches, check that https://www.kellylucas.dev serves the latest
> main (homepage, /design.html, Magpie page load without errors), and post a
> short summary of anything stale or broken. Do not merge or push anything.

## 8. Context you can't see

- Claude Code sidebar group "🦕 kellylucas.dev (old)": search "Design
  library," "Agent Commons," "Magpie design"
- Mac: ~/Documents/New project/kelly-lucas-dev* worktrees;
  ~/Personal:Misc Tasks for Kelly/kelly-lucas-dashboard-mvp (Codex, Agent
  Commons)
- Vercel dashboard: project "kelly-lucas-dev-site," Environment Variables (for
  the secret names; values are never written down here)
- Never discussed in this project, so they must live in other chats or on the
  Mac: playground rooms, Boot Camp, font audition, weekend-app previews,
  Shared Desk. Search the Claude Code sidebar for those names.

## 9. Next step

Open PR #16's preview and say "push live" or "close it."

---

## Project memory (copied as it was on Nov 7, 2026)

**Light workflow (Kelly, 2026-10-05: "u have eaten my usage").** On
kellylucas.dev work, keep it light by default. No review agents, judge panels,
critic loops or screenshot sweeps unless she asks. Flow: she looks at the
Vercel branch preview, sends a list, Claude makes the edits in one pass and
pushes to a draft PR. "push" / "push live" means fast-forward main (CLAUDE.md
rule 5). Why: a long redesign session with multi-agent reviews burned a lot of
her usage. One pass of edits, quick local sanity checks only, then report. No
scheduled check-ins or background servers left running.

**Poster redesign.** The "poster of a place" redesign (v1.0) shipped to main on
2026-10-05 via PR #13 (338a599), then PR #14 (9c1d622): orbiting place bubbles
removed from the home poster; "Open my library" button (lock, private) added
first on the Magpie page and beside "Magpie's full story" on the homepage band.
The real library is /brain/gallery.html behind a password, so the nav "Magpie"
link stays on the explainer page on purpose. Kelly floated "maybe put a bird"
where the bubbles were; it was left empty, open if she wants one. Old PR #7
(Experiments tab, Aug 2026) was closed 2026-10-05 as superseded; its branch
still holds a vendored Impeccable design skill main lacks.

**Other memory notes:**

- Style direction (Kelly, 2026-10-05): Heliopolis is her default design base,
  but color and other elements should vary freely per project. kellylucas.dev
  keeps its current colorful poster style ("cross between Figma Slides and
  Heliopolis but colorful"); build on it, don't revert toward plain Heliopolis.
- Constant anchors across her projects (2026-10-05): navy ink for all text and
  line work with flat color fills; one clean sans (Instrument Sans) with small
  mono touches; soft blob/sun shapes and drawn places in her Heliopolis line
  style. Colors can change freely.
- 2026-10-07: "Homepage polish" pushed live (shorter Magpie band, tighter "Say
  hello", "Where to next" pills removed).
- Still open (2026-10-07): bird where the poster bubbles were (Kelly to say
  yes/no); Impeccable design skill from old PR #7 (recommended skip).
- Project setup (2026-10-05): project instructions saved, Monday "Weekly site
  check" routine on, old PRs closed out (#7 closed; #10, #11 merged Sept 25).
- Kelly's Mac has Remote Control folders but none for kelly-lucas-dev;
  "Personal:…for Kelly" is where Chrome work has happened before.
- Site history from earlier Claude Code sessions (gathered 2026-10-07):
  - /heliopolis brand library + "Art by subject" page live on kellylucas.dev
    (PR #8, ~Sept 21).
  - Design desk at kellylucas.dev/design.html: notebook pages, shelf of
    resource cards with images (46 tabs → 32 new cards), videos, design
    systems; five piles + Magpie auto-sort (PR #9, #10, #11, all live by
    Sept 25).
  - Mac work for the site has happened in ~/Documents/New
    project/kelly-lucas-dev* and ~/Personal:Misc Tasks for
    Kelly/kelly-lucas-dashboard-mvp.
  - Hero/wireframe/cell videos in ~/Desktop/WEBSITE RECENT are HelioFlux
    website work, not this site.
- Old-chats review (2026-10-09, full write-up in `kellylucas-dev-history.md`
  in this folder): five piles merged as PR #10 on Sept 25. Private
  /brain/design-library.html for the HelioFlux design library sits unmerged on
  branch claude/design-library (55dfe8f); Kelly had chosen "go live" before the
  upload failed on a usage limit. Also unmerged: claude/lounge-turn-script
  (Agent Commons). Magpie gallery shelves wait on Kelly's shelf rules.
- Agent Commons (Aug 2026): Kelly's multi-agent room at
  agentcommons.kellylucas.dev (/brain/room.html), merged via PR #12; listed on
  the homepage as private; retired for now.
- 2026-10-10: animated race car on homepage in draft PR #16 (Kelly's own
  side-view drawing, Red Bull marks replaced with red dinos + red "HelioFlux",
  shrunk to 220px desktop / 160px phone); waiting on her "push live".
- Logo decided 2026-10-10: keep the coral flower, shrunk to 24px, shipped live.
  Floated idea for later: a tiny one-line magpie mark.
- Claude Design (checked 2026-10-10): open in claude.ai via Output › Design in
  the message box; all plans; can link the kelly-lucas-dev repo and hand off to
  Claude Code. Claude Motion is Team/Enterprise only (MP4 export).
