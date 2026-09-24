# Measurement protocol

The probe is only as good as the state of the page when you run it. Three traps account for almost every bad teardown.

## Trap 1: running before layout settles

The most common failure. Run the probe immediately after navigation and every element still has a zero height bounding box, so the visibility filter drops all of them. You get a result object with the right shape, a correct canvas colour, and empty arrays everywhere else. It looks like the site simply has no borders or type, which is obviously false but reads as plausible in a table.

Wait for the page to finish, then verify before measuring:

```js
document.querySelectorAll("body *").length
```

Then confirm a healthy count survives the filter:

```js
Array.from(document.querySelectorAll("body *")).filter(el => {
  const r = el.getBoundingClientRect();
  return r.width >= 1 && r.height >= 1;
}).length
```

On a normal marketing site expect hundreds to low thousands. If it returns zero or single digits, the page is not ready. Wait and try again.

## Trap 2: lazy loaded sections

Anything below the fold on a modern marketing site may not be in the DOM yet, and content behind `content-visibility` has no computed layout until it approaches the viewport. Measuring at scroll position zero gives you the hero and nothing else.

Scroll the whole page once, then return to the top:

```js
window.scrollTo(0, document.body.scrollHeight);
```

Wait a couple of seconds, then:

```js
window.scrollTo(0, 0);
```

Now run the probe.

## Trap 3: reading the long tail as if it were the system

The probe returns every distinct value it finds, sorted by how often it occurs. Third party embeds, cookie banners, chat widgets and social buttons all contribute values that are not part of the site's design system.

Read the top of each tally. If four radii account for a hundred elements and eight more account for one element each, the vocabulary is four. Report the real vocabulary and mention the tail separately if it matters.

## Reading the output

| Field | What it tells you |
| --- | --- |
| `surfaces.canvas` | The page background. The baseline for everything else. |
| `surfaces.top` | Distinct panel backgrounds. If this is empty or all one value, there is no elevation ladder. |
| `borders.top` | Watch for white at low opacity. It reads as a drawn rule rather than an edge. |
| `text.top` | Should show three or four distinct roles. A single pure white value means the hierarchy is doing no work. |
| `tracking.display` | Tracking on headings, in em. Compare directly between the two sites. |
| `tracking.body` | Positive values here are almost always a mistake on screen. |
| `accent.usesInFirstViewport` | Above two, the accent has stopped functioning as an accent. |
| `type.distinctSizes` | Above roughly ten, the scale has sprawled. |
| `radii.distinct` | Compare the real vocabulary, not the raw count. |
| `elevation.insetOnly` | High means the site grounds elements with hairlines. Low with big shadows means things hover. |
| `rhythm.containers` | The measured max width of the main content column. |

## Sanity checking

Before writing anything up, pick three values at random and confirm them by hand in dev tools. If any one of them is wrong, throw out the run and start again rather than patching the table. A teardown is worth having only because every number in it is real.

## Known limitations

- Colours are reported as computed values, so a token name is never recovered. Map them back to token names by hand.
- Fonts behind a paywall or a custom loader may report a fallback family if the webfont has not loaded. Check `document.fonts.status` is `"loaded"`.
- Sites that theme by system preference will measure differently depending on the browser's colour scheme. Set it explicitly and note which one you measured.
- Canvas and WebGL sections are invisible to the probe. Note them as unmeasured rather than absent.
