---
name: design-teardown
description: Compare any two products or websites and turn the difference into a spec you can build. Measures both sites from live computed CSS, produces a token diff, an ordered fix list, an interactive dark HTML teardown, and optionally a matching Notion page. Trigger on "/design-teardown", "compare my site to X", "teardown X vs Y", "why does their site look better than mine", "design teardown of X", or any request to benchmark one product's design against another. NOT for building a new site from scratch (use a website builder skill) and NOT for a single site review with no reference to compare against.
---

# Design Teardown

Turn "their site feels more premium" into a list of values that can be changed this afternoon.

The method is comparative on purpose. Asking what is wrong with a design returns taste. Asking what is measurably different between two designs returns a spec, and a spec can be assigned, estimated and shipped.

## Inputs

Two URLs:

- **Reference** — the product whose design is admired
- **Subject** — the product being improved

If only one URL is given, ask for the second. This skill does not do single site reviews. Without a reference there is nothing to measure against and the output degrades into opinion.

## Step 1 — Check the pairing

Reject or flag a mismatched pairing before spending any time measuring. The reference must share the subject's medium, density and rough job. A dark developer tool teaches almost nothing about a printed menu.

If the pairing is weak, say so in one line, name the single property the user actually seems to want, and suggest a closer reference. Then continue if they confirm.

## Step 2 — Measure both sites

Read `references/measurement-protocol.md` before touching the browser. It covers the load timing trap that silently returns empty results.

For each site:

1. Open it in a browser tool.
2. Wait for layout to settle, then scroll the full page once and return to the top. Lazy loaded sections do not exist in the DOM until they have been near the viewport.
3. Run `scripts/measure.js` and keep the JSON.
4. Spot check three or four values by hand. If the probe says the canvas is `#0d0d0d`, confirm it.

Never report a value the probe did not return. If something could not be measured, say so. An invented number that reads plausibly is the main failure mode of this whole exercise, and it destroys trust in every other row of the table.

Read the **top** of each tally. The long tail is usually third party embeds and one off components. A site with fourteen distinct radii in the raw tally often has a real vocabulary of five, visible in the counts.

## Step 3 — Build the diff

One table. Three columns: token, subject value, reference value. Flag rows where the subject is measurably worse.

Cover these nine dimensions in this order:

| Dimension | What to pull |
| --- | --- |
| Surfaces | Canvas, then every distinct card or panel background. How many elevation levels exist? |
| Hairlines | Every border colour and width |
| Text roles | Heading, secondary, body, muted, as four separate values |
| Letter spacing | Tracking in em at display size and at body size |
| Accent | The hue, plus how many times it appears in one viewport |
| Type scale | Every distinct rendered size and weight |
| Radii | Every distinct radius in the DOM, not the ones in the token file |
| Elevation | Shadow layers and spread, versus inset hairlines |
| Rhythm | Container width, section padding, divider usage |

In practice the first four account for most of the perceived difference. Say so.

## Step 4 — Order the fixes

Rank by visible effect per hour of work, with a time estimate on each. Tracking and text colour touch every screen and take an hour. A hero redesign touches one screen and takes a day.

Split the list in two and label which is which:

- **Mechanical** — a find and replace. Anyone can do it today.
- **Needs a decision** — someone has to choose what the thing should be.

## Step 5 — Build the outputs

**Always:** the interactive HTML teardown. Copy `assets/teardown-template.html` and fill it in. Read `references/style-lock.md` first. The style is fixed and is not a per project decision.

The template ships with live controls, and each one must be wired to the real measured values for this pairing:

- A master before and after toggle, bound to the `B` key, that flips every demo at once
- A letter spacing slider running between the two measured values
- A surface elevation stepper
- A shadow treatment toggle
- An accent frequency counter
- A radius collapse toggle

**If a Notion MCP is connected:** also write the Notion page. Read `references/notion-structure.md` for the exact block vocabulary. Generate a cover image if an image tool is available, otherwise omit the cover rather than shipping a stock one.

**Verify before delivering.** Open the built HTML in a browser, click every control, and confirm the values change. Check the console for errors. A teardown about design discipline that ships with a broken toggle is self defeating.

## Hard rules

1. **Measure, never recall.** Every number comes off the live DOM or is marked unknown.
2. **Take the discipline, not the identity.** Never recommend copying the reference's copy, marks, imagery or brand colour. Where the subject's own colour is already strong, say so and keep it.
3. **No hyphens or dashes in prose.** No em dashes, no en dashes, no hyphenated compounds in body copy. CSS property names and negative values inside code blocks are exempt because they are syntax.
4. **Credit the reference as a standard, not a source.** Include a line stating that nothing reproduces their copy or product imagery.
5. **Real logos only.** Pull both brands' actual SVG marks from their sites. Never draw an approximation.

## Files

| Path | Purpose |
| --- | --- |
| `scripts/measure.js` | The measurement probe. Paste into a browser or agent JS tool. |
| `references/measurement-protocol.md` | How to run the probe without getting empty or wrong results |
| `references/style-lock.md` | The fixed visual system for every teardown this skill produces |
| `references/notion-structure.md` | Notion block vocabulary for the companion page |
| `assets/teardown-template.html` | The interactive HTML template |
| `examples/glaido-vs-linear.html` | A complete worked example, built from real measurements |
