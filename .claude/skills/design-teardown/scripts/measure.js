/*
 * measure.js — design teardown measurement probe
 *
 * Paste this whole file into a browser console on the page you are measuring,
 * or run it through an agent browser tool (javascript_tool, evaluate, etc).
 * It returns a JSON string covering all nine teardown dimensions, read from
 * computed CSS on the live DOM.
 *
 * It reports what actually shipped. Token files and design files routinely
 * disagree with the rendered page, and the rendered page is what people see.
 */
(() => {
  /* Only elements that are actually painted. Hidden nodes and zero size
     wrappers otherwise flood every tally with values nobody ever sees. */
  const visible = Array.prototype.slice
    .call(document.querySelectorAll("body *"))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
    });

  const cs = (el) => getComputedStyle(el);

  /* Count occurrences and return most common first, so the tallies read as
     "what this site mostly does" rather than an unordered set. */
  /* Array.from, not Array.prototype.slice.call. A Map iterator has no length
     property, so slice would silently return an empty array and every tally
     below would come back clean and wrong. */
  const tally = (values) => {
    const m = new Map();
    values.filter(Boolean).forEach((v) => m.set(v, (m.get(v) || 0) + 1));
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  };

  const toHex = (rgb) => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgb || "");
    if (!m) return rgb;
    const a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (a === 0) return "transparent";
    const hex =
      "#" +
      [m[1], m[2], m[3]]
        .map((n) => parseInt(n, 10).toString(16).padStart(2, "0"))
        .join("");
    return a < 1 ? `${hex} @ ${a}` : hex;
  };

  /* Saturation is how we find the accent. Brand accents are the most
     chromatic thing on an otherwise neutral page. */
  const saturation = (rgb) => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgb || "");
    if (!m) return 0;
    if (m[4] !== undefined && parseFloat(m[4]) < 0.5) return 0;
    const [r, g, b] = [+m[1], +m[2], +m[3]];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === 0) return 0;
    return (max - min) / max;
  };

  const px = (v) => parseFloat(v) || 0;

  /* ---- 1. surfaces -------------------------------------------------- */
  const canvas = toHex(cs(document.body).backgroundColor);
  const surfaces = tally(
    visible
      .map((el) => cs(el).backgroundColor)
      .filter((c) => c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent")
      .map(toHex)
  );

  /* ---- 2. borders and hairlines ------------------------------------- */
  const borders = tally(
    visible
      .map((el) => {
        const c = cs(el);
        const w = px(c.borderTopWidth) || px(c.borderBottomWidth) ||
                  px(c.borderLeftWidth) || px(c.borderRightWidth);
        if (!w) return null;
        const col = c.borderTopColor !== "rgba(0, 0, 0, 0)" ? c.borderTopColor : c.borderBottomColor;
        return `${w}px ${col}`;
      })
      .filter(Boolean)
  );

  /* ---- 3. text colour roles ----------------------------------------- */
  const hasText = (el) =>
    Array.prototype.some.call(el.childNodes, (n) => n.nodeType === 3 && n.textContent.trim());
  const textNodes = visible.filter(hasText);
  const textColours = tally(textNodes.map((el) => toHex(cs(el).color)));

  /* ---- 4. letter spacing, split by size ----------------------------- */
  const tracking = (minSize, maxSize) =>
    tally(
      textNodes
        .filter((el) => {
          const s = px(cs(el).fontSize);
          return s >= minSize && s < maxSize;
        })
        .map((el) => {
          const c = cs(el);
          const ls = c.letterSpacing;
          if (ls === "normal") return "normal (0em)";
          const em = px(ls) / px(c.fontSize);
          return `${px(ls).toFixed(2)}px = ${em.toFixed(3)}em`;
        })
    );

  /* ---- 5. accent ----------------------------------------------------- */
  const chromatic = [];
  visible.forEach((el) => {
    const c = cs(el);
    [c.backgroundColor, c.color, c.borderTopColor].forEach((v) => {
      if (saturation(v) > 0.45) chromatic.push(toHex(v));
    });
  });
  const accents = tally(chromatic);

  /* Accent uses inside the first viewport only. Counting the whole page
     hides the thing that matters, which is how loud the top of the page is. */
  const topAccentUses = visible.filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) return false;
    const c = cs(el);
    return saturation(c.backgroundColor) > 0.45 || saturation(c.color) > 0.45;
  }).length;

  /* ---- 6. type scale -------------------------------------------------- */
  const sizes = tally(textNodes.map((el) => cs(el).fontSize));
  const weights = tally(textNodes.map((el) => cs(el).fontWeight));
  const families = tally(textNodes.map((el) => cs(el).fontFamily.split(",")[0].replace(/["']/g, "")));

  /* ---- 7. radii ------------------------------------------------------- */
  const radii = tally(
    visible
      .map((el) => cs(el).borderRadius)
      .filter((r) => r && r !== "0px")
      .map((r) => (px(r) >= 999 ? "pill" : r.split(" ")[0]))
  );

  /* ---- 8. elevation --------------------------------------------------- */
  const shadows = tally(
    visible.map((el) => cs(el).boxShadow).filter((s) => s && s !== "none")
  ).slice(0, 8);
  const insetOnly = shadows.filter((s) => s.value.includes("inset")).length;

  /* ---- 9. rhythm ------------------------------------------------------ */
  const widths = tally(
    visible
      .map((el) => {
        const w = px(cs(el).maxWidth);
        return w > 600 && w < 2000 ? `${w}px` : null;
      })
      .filter(Boolean)
  );
  const sectionPads = tally(
    Array.prototype.slice
      .call(document.querySelectorAll("section, main > div, [class*='section']"))
      .map((el) => {
        const c = cs(el);
        const t = px(c.paddingTop), b = px(c.paddingBottom);
        return t > 24 ? `${t}px / ${b}px` : null;
      })
      .filter(Boolean)
  );

  return JSON.stringify(
    {
      url: location.href,
      viewport: `${innerWidth}x${innerHeight}`,
      surfaces: { canvas, distinct: surfaces.length, top: surfaces.slice(0, 8) },
      borders: { distinct: borders.length, top: borders.slice(0, 6) },
      text: { distinct: textColours.length, top: textColours.slice(0, 8) },
      tracking: {
        display: tracking(32, 200),
        body: tracking(13, 20),
      },
      accent: { candidates: accents.slice(0, 5), usesInFirstViewport: topAccentUses },
      type: {
        families: families.slice(0, 4),
        distinctSizes: sizes.length,
        sizes: sizes.slice(0, 20),
        weights,
      },
      radii: { distinct: radii.length, all: radii },
      elevation: { distinctShadows: shadows.length, insetOnly, top: shadows },
      rhythm: { containers: widths.slice(0, 4), sectionPadding: sectionPads.slice(0, 4) },
    },
    null,
    1
  );
})();
