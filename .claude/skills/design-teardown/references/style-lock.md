# Style lock

Every teardown this skill produces looks the same. The format is the point. Do not restyle it to match whichever site is being reviewed, and do not treat the palette below as a starting suggestion.

The document argues for restraint in dark interface design, so it is built to that standard. A teardown about elevation ladders that ships with one flat surface has already lost the argument.

## Palette

```css
--void:     #08090a;  /* page canvas            */
--carbon:   #0f1011;  /* card surface           */
--obsidian: #161718;  /* elevated surface, hover */
--graphite: #23252a;  /* hairline, default      */
--smoke:    #383b3f;  /* hairline, section      */
--ash:      #62666d;  /* muted text, captions   */
--fog:      #8a8f98;  /* body text              */
--mist:     #d0d6e0;  /* secondary text         */
--paper:    #ffffff;  /* headings only          */
```

Three surfaces, two hairline weights, four text roles. Nothing else.

Pure white is for headings. Body copy never uses it.

## Accent

One accent, and it belongs to the **subject** of the teardown, not to this template. Pull the subject's real brand colour from the measurement run and use it for:

- The scroll progress bar
- The eyebrow dot
- The active state on the section rail
- The slider thumb
- Positive verdict text

Nothing else. If the accent appears more than about six times in the whole document, cut it back. The document should practise what section four preaches.

Semantic colours are separate from the accent and do not count against it:

```css
--red:   #eb5757;  /* the current, worse value */
--green: #27a644;  /* the target value         */
--amber: #f5b23e;  /* in between               */
```

## Type

System stack. No webfont, so nothing can silently fall back mid recording.

```css
font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
```

Mono for eyebrows, readouts, hex values and code:

```css
font-family: ui-monospace, "SF Mono", Menlo, monospace;
```

Eight steps, negative tracking throughout:

| Role | Size | Line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| h1 | 54px | 1.04 | 600 | -0.022em |
| h2 | 30px | 1.12 | 600 | -0.022em |
| h3 | 17px | 1.3 | 600 | -0.016em |
| lede | 19px | 1.5 | 400 | -0.014em |
| body | 15px | 1.6 | 400 | -0.011em |
| dim | 14px | 1.6 | 400 | -0.011em |
| mono readout | 12.5px | 1.4 | 400 | -0.013em |
| eyebrow | 10.5px | 1.4 | 400 | +0.14em, uppercase |

The eyebrow is the single place positive tracking is correct, because it is uppercase at a small size.

## Structure

- Radii: `2px`, `4px`, `6px`, `12px`, `9999px`. Five values. Cards are always 12.
- Elevation: `inset 0 0 0 1px var(--graphite)`. No drop shadows anywhere except inside a demo that is specifically illustrating drop shadows.
- Container: `1220px` shell, `190px` sticky rail, `56px` gap.
- Sections: `76px` vertical padding, one hairline between.

## Required components

Every teardown ships with all of these. They are what makes the document worth opening twice.

| Component | Behaviour |
| --- | --- |
| Sticky top bar | Both real brand logos, scroll progress bar, master toggle |
| Master toggle | Flips every demo between measured and adjusted at once. Bound to `B`. |
| Section rail | Sticky, with scroll spy, accent on the active item |
| Letter spacing slider | Runs between the two measured values. Arrow keys work. Live verdict text. |
| Surface stepper | Three stages from flat to lifted to cooled hairline |
| Shadow toggle | The measured shadow against an inset hairline with a gradient floor |
| Accent counter | Live count of accent uses, with the real value for each state |
| Radius collapse | Every measured radius, fading to the surviving vocabulary |
| Swatches | Click to copy hex |
| Token patch | Copy button, ready to paste |
| Checklist | Tickable, with a running count |

## Motion

Transitions are `.2s` to `.45s` on `cubic-bezier(.22,.61,.36,1)`. Reveal on scroll is a 14px rise with a fade.

Wrap everything in a reduced motion guard:

```css
@media (prefers-reduced-motion: reduce) {
  *, *:before, *:after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
  .rv { opacity: 1; transform: none; }
}
```

## Accessibility floor

- Visible focus ring on every control: `outline: 2px solid <accent>; outline-offset: 2px`
- Real `<button>` elements for anything clickable, never a styled div
- `aria-label` on the slider and on icon only controls
- Tables inside `overflow-x: auto` so the page body never scrolls sideways
