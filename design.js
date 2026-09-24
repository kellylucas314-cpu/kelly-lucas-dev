/* kellylucas.dev · the design desk (design.html)
   Renders the shelf and the rewatch list from design-library.js, filters
   them, and runs the type-scale toy. Every target is null-checked so the
   page stays readable if anything is missing. GSAP is optional. */

(function designDesk() {
  const library = window.DESIGN_LIBRARY || null;
  const items = library && Array.isArray(library.items) ? library.items : [];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const KIND_PLURAL = {
    gallery: "galleries",
    site: "sites",
    tool: "tools",
    video: "videos",
    repo: "repos",
    reading: "reading",
  };
  const KIND_ORDER = ["gallery", "site", "tool", "repo", "reading"];
  const TINTS = ["mint", "cream", "lilac"];
  const ARROW =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M1.5 12H21M12.99 3.51L21.47 12L12.99 20.48" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>';
  const PLAY =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>';

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const domainOf = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };

  const youtubeId = (url) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^(www|m)\./, "");
      if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || "";
      if (host === "youtube.com") return parsed.searchParams.get("v") || "";
    } catch {
      /* not a url */
    }
    return "";
  };

  const initials = (title, domain) => {
    const source = String(title || domain || "?")
      .replace(/[^\p{L}\p{N} ]/gu, " ")
      .trim();
    const words = source.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toLowerCase();
    return source.slice(0, 2).toLowerCase() || "?";
  };

  const external = (anchor, href) => {
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    return anchor;
  };

  function dotTag(text) {
    const tag = el("div", "dot-tag");
    tag.appendChild(el("span", "dot-tag__dot"));
    tag.appendChild(el("span", null, text));
    return tag;
  }

  function cta(href, label) {
    const anchor = external(el("a", "cta"), href);
    anchor.appendChild(el("span", "cta__label", label));
    const icon = el("span", "cta__icon");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = ARROW;
    anchor.appendChild(icon);
    return anchor;
  }

  /* ---------- The shelf ---------- */
  const shelf = items.filter((item) => item.kind !== "video");
  const videos = items.filter((item) => item.kind === "video");

  const grid = document.getElementById("shelfGrid");
  const countEl = document.getElementById("shelfCount");
  const emptyEl = document.getElementById("shelfEmpty");
  const chipRow = document.getElementById("shelfChips");
  const search = document.getElementById("shelfSearch");
  let activeKind = "all";

  function buildCard(item, index) {
    const domain = item.domain || domainOf(item.url);
    const title = item.title || domain || item.url;
    const card = el("article", "desk-card");
    card.dataset.kind = item.kind || "site";
    card.dataset.search = [title, domain, item.why, item.summary, (item.tags || []).join(" ")]
      .join(" ")
      .toLowerCase();

    const tile = external(el("a", "desk-tile desk-tile--" + TINTS[index % TINTS.length]), item.url);
    tile.setAttribute("aria-label", "Open " + title);
    if (item.thumb) {
      const img = el("img");
      img.src = item.thumb;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => img.remove());
      tile.appendChild(img);
    } else {
      tile.appendChild(el("span", "desk-tile__mark", initials(item.title, domain)));
      tile.appendChild(el("span", "desk-tile__domain", domain));
    }

    const top = el("div", "desk-card__top");
    top.appendChild(dotTag((item.kind || "site") + " · " + domain));
    const heading = el("h3", "desk-card__title");
    heading.appendChild(external(el("a", null, title), item.url));
    top.appendChild(heading);
    const why = String(item.why || item.summary || "").trim();
    if (why) top.appendChild(el("p", "desk-card__why", why));
    if (item.tags && item.tags.length) {
      top.appendChild(el("p", "desk-tags", item.tags.join(" · ")));
    }

    card.appendChild(tile);
    card.appendChild(top);
    card.appendChild(cta(item.url, "Open"));
    return card;
  }

  function applyFilter() {
    if (!grid) return;
    const query = ((search && search.value) || "").trim().toLowerCase();
    let shown = 0;
    grid.querySelectorAll(".desk-card").forEach((card) => {
      const kindOk = activeKind === "all" || card.dataset.kind === activeKind;
      const queryOk = !query || card.dataset.search.includes(query);
      const on = kindOk && queryOk;
      card.hidden = !on;
      if (on) shown += 1;
    });
    if (countEl) {
      countEl.textContent = shown === shelf.length
        ? shelf.length + " things on the shelf, newest first"
        : shown + " of " + shelf.length + " things on the shelf";
    }
    if (emptyEl) {
      const nothingSaved = shelf.length === 0;
      emptyEl.hidden = shown !== 0;
      emptyEl.textContent = nothingSaved
        ? "the shelf is empty. clip something with magpie and run the sync."
        : "nothing on the shelf matches that. try fewer letters.";
    }
    if (window.ScrollTrigger && typeof ScrollTrigger.refresh === "function") ScrollTrigger.refresh();
  }

  if (grid) {
    shelf.forEach((item, index) => grid.appendChild(buildCard(item, index)));

    if (chipRow) {
      const kinds = KIND_ORDER.filter((kind) => shelf.some((item) => item.kind === kind));
      ["all"].concat(kinds).forEach((kind) => {
        const chip = el("button", "chip" + (kind === "all" ? " is-active" : ""), kind === "all" ? "all" : KIND_PLURAL[kind]);
        chip.type = "button";
        chip.dataset.kind = kind;
        chip.setAttribute("aria-pressed", String(kind === "all"));
        chip.addEventListener("click", () => {
          activeKind = kind;
          chipRow.querySelectorAll(".chip").forEach((other) => {
            const on = other === chip;
            other.classList.toggle("is-active", on);
            other.setAttribute("aria-pressed", String(on));
          });
          applyFilter();
        });
        chipRow.appendChild(chip);
      });
    }

    if (search) search.addEventListener("input", applyFilter);
    applyFilter();

    /* Cards rise in as the shelf scrolls into view. The tween always
       completes to the natural state, so a filtered card is never stuck. */
    if (window.gsap && window.ScrollTrigger && !reduced && shelf.length) {
      gsap.from(grid.querySelectorAll(".desk-card"), {
        y: 28,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.05,
        scrollTrigger: { trigger: grid, start: "top 85%", once: true },
      });
    }
  }

  /* ---------- Design systems ---------- */
  const systemGrid = document.getElementById("systemGrid");
  const systems = library && Array.isArray(library.systems) ? library.systems : [];
  if (systemGrid) {
    if (!systems.length) {
      systemGrid.appendChild(el("p", "desk-empty", "no systems written down yet."));
    }
    systems.forEach((system) => {
      const card = el("article", "system-card");
      card.appendChild(dotTag((system.status || "system") + (system.site ? " \u00b7 " + system.site : "")));
      card.appendChild(el("h3", null, system.name || system.site || "untitled"));

      const palette = Array.isArray(system.palette) ? system.palette : [];
      if (palette.length) {
        const row = el("div", "palette-row");
        row.setAttribute("aria-label", "Palette");
        palette.forEach((color) => {
          const swatch = el("span", "tone");
          const chip = el("span", "tone__chip");
          chip.style.background = color.hex;
          chip.title = (color.name ? color.name + " " : "") + color.hex;
          swatch.appendChild(chip);
          swatch.appendChild(el("span", null, color.name || color.hex));
          row.appendChild(swatch);
        });
        card.appendChild(row);
      }

      if (system.type) {
        const type = el("p", "system-card__type");
        type.appendChild(el("b", null, "Type: "));
        type.appendChild(document.createTextNode(system.type));
        card.appendChild(type);
      }

      const rules = Array.isArray(system.rules) ? system.rules.filter(Boolean) : [];
      if (rules.length) {
        const list = el("ul", "system-rules");
        rules.forEach((rule) => list.appendChild(el("li", null, rule)));
        card.appendChild(list);
      }

      const links = el("div", "system-card__links");
      if (system.live) links.appendChild(external(el("a", null, "Live"), system.live));
      if (system.doc) links.appendChild(external(el("a", null, system.docLabel || "The rules"), system.doc));
      if (links.childNodes.length) card.appendChild(links);

      systemGrid.appendChild(card);
    });
  }

  /* ---------- Art libraries ---------- */
  const libraryList = document.getElementById("libraryList");
  const libraries = library && Array.isArray(library.libraries) ? library.libraries : [];
  if (libraryList) {
    if (!libraries.length) {
      const row = el("li");
      row.appendChild(el("span", "now-label", "nothing yet"));
      row.appendChild(el("span", "now-body", "no libraries listed yet."));
      libraryList.appendChild(row);
    }
    libraries.forEach((entry) => {
      const row = el("li");
      const label = el("span", "now-label");
      const link = el("a", null, entry.name || entry.url);
      link.href = entry.url;
      if (/^https?:\/\//.test(entry.url || "") && !/kellylucas\.dev/.test(entry.url)) external(link, entry.url);
      label.appendChild(link);
      row.appendChild(label);
      const body = el("span", "now-body");
      body.appendChild(document.createTextNode(entry.what || ""));
      if (entry.count) body.appendChild(el("small", null, entry.count));
      if (entry.private) body.appendChild(el("span", "private-pill", "private \u00b7 kelly only"));
      row.appendChild(body);
      libraryList.appendChild(row);
    });
  }

  /* ---------- Rewatch list ---------- */
  const videoGrid = document.getElementById("videoGrid");
  if (videoGrid) {
    if (!videos.length) {
      videoGrid.appendChild(el("p", "desk-empty", "no videos saved yet. clip one with magpie."));
    }
    videos.forEach((video) => {
      const id = youtubeId(video.url);
      const card = el("article", "video-card");

      const thumb = external(el("a", "video-thumb"), video.url);
      thumb.setAttribute("aria-label", "Watch " + (video.title || video.url) + " on YouTube");
      if (id) {
        const img = el("img");
        img.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
        img.alt = "";
        img.loading = "lazy";
        img.width = 480;
        img.height = 360;
        /* No thumbnail is better than a broken-image icon. */
        img.addEventListener("error", () => img.remove());
        thumb.appendChild(img);
      }
      const play = el("span", "video-play");
      play.setAttribute("aria-hidden", "true");
      play.innerHTML = PLAY;
      thumb.appendChild(play);

      const body = el("div", "video-body");
      body.appendChild(dotTag("video · " + (video.author || "youtube")));
      const heading = el("h3");
      heading.appendChild(external(el("a", null, video.title || (id ? "youtu.be/" + id : video.url)), video.url));
      body.appendChild(heading);

      const notes = Array.isArray(video.takeaways) ? video.takeaways.filter(Boolean) : [];
      if (notes.length) {
        const list = el("ul", "takeaways");
        notes.forEach((note) => list.appendChild(el("li", null, note)));
        body.appendChild(list);
      } else {
        body.appendChild(el("p", "pending-pill", "notes pending"));
        body.appendChild(el("p", "scribble", video.hasTranscript
          ? "(the transcript is in the vault. takeaways come next.)"
          : "(clip it with magpie, run the sync, the notes land here)"));
      }

      card.appendChild(thumb);
      card.appendChild(body);
      videoGrid.appendChild(card);
    });
    if (window.ScrollTrigger && typeof ScrollTrigger.refresh === "function") ScrollTrigger.refresh();
  }

  /* ---------- Type scale toy ---------- */
  const demo = document.getElementById("scaleDemo");
  if (demo) {
    const lines = Array.from(demo.querySelectorAll(".scale-line"));
    const buttons = Array.from(demo.querySelectorAll(".chip"));
    const base = 16;
    const apply = (ratio) => {
      lines.forEach((line) => {
        const step = Number(line.dataset.step || 0);
        const px = base * Math.pow(ratio, step);
        line.style.fontSize = px.toFixed(1) + "px";
        const label = line.querySelector(".scale-px");
        if (label) label.textContent = Math.round(px) + "px";
      });
    };
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((other) => {
          const on = other === button;
          other.classList.toggle("is-active", on);
          other.setAttribute("aria-pressed", String(on));
        });
        apply(Number(button.dataset.ratio));
      });
    });
    const active = buttons.find((button) => button.classList.contains("is-active")) || buttons[0];
    if (active) apply(Number(active.dataset.ratio));
  }
})();
