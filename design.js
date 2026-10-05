/* kellylucas.dev · the design desk (design.html)
   Renders the desk from design-library.js: five piles (the website,
   Heliopolis, Pretzel, resources, examples) plus the lab itself, and runs
   the type-scale toy. Every target is null-checked so the page stays
   readable if anything is missing. GSAP is optional and no longer loaded
   here; riseIn() quietly does nothing without it. */

(function designDesk() {
  const library = window.DESIGN_LIBRARY || null;
  const list = (key) => (library && Array.isArray(library[key]) ? library[key] : []);
  const items = list("items");
  const systems = list("systems");
  const libraries = list("libraries");
  const docs = list("docs");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const KIND_PLURAL = {
    gallery: "galleries",
    site: "sites",
    tool: "tools",
    video: "videos",
    repo: "repos",
    reading: "reading",
  };
  const KIND_ORDER = ["gallery", "site", "tool", "repo", "reading", "video"];
  const TINTS = ["mint", "sand", "lilac", "sky"];
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

  const offSite = (href) => /^https?:\/\//.test(href || "") && !/kellylucas\.dev/.test(href);

  const external = (anchor, href) => {
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    return anchor;
  };

  /* Same-site pages open in this tab; files and other sites open in a new one. */
  const link = (anchor, href) => {
    if (offSite(href) || /\.(pdf|jpg|jpeg|png|webp)(\?|#|$)/i.test(href || "")) return external(anchor, href);
    anchor.href = href;
    return anchor;
  };

  function dotTag(text) {
    const tag = el("div", "dot-tag");
    tag.appendChild(el("span", "dot-tag__dot"));
    tag.appendChild(el("span", null, text));
    return tag;
  }

  function cta(href, label, context) {
    const anchor = link(el("a", "cta"), href);
    anchor.appendChild(el("span", "cta__label", label));
    if (context) anchor.appendChild(el("span", "sr-only", ": " + context));
    const icon = el("span", "cta__icon");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = ARROW;
    anchor.appendChild(icon);
    return anchor;
  }

  const sectionOfItem = (item) => item.section || "examples";
  const sectionOfOwn = (thing) => thing.section || "lab";

  /* ---------- Cards ---------- */
  function buildCard(item, index) {
    const domain = item.domain || domainOf(item.url);
    const title = item.title || domain || item.url;
    const kind = item.kind || "site";
    const card = el("article", "desk-card");
    card.dataset.kind = kind;
    card.dataset.search = [title, domain, item.why, item.summary, (item.tags || []).join(" ")]
      .join(" ")
      .toLowerCase();

    /* One link per card: the whole card is the target, the picture is the face. */
    const face = external(el("a", "desk-card__link"), item.url);

    const tile = el("div", "desk-tile desk-tile--" + TINTS[index % TINTS.length]);
    const ytId = kind === "video" ? youtubeId(item.url) : "";
    if (item.thumb || ytId) {
      const img = el("img");
      img.src = item.thumb || "https://i.ytimg.com/vi/" + ytId + "/hqdefault.jpg";
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", () => img.remove());
      tile.appendChild(img);
    } else {
      tile.appendChild(el("span", "desk-tile__mark", initials(item.title, domain)));
      tile.appendChild(el("span", "desk-tile__domain", domain));
    }

    const body = el("div", "desk-card__body");
    const meta = el("div", "desk-card__meta");
    meta.appendChild(el("span", "kind-pill kind-pill--" + kind, kind));
    meta.appendChild(el("span", "desk-card__domain", domain));
    body.appendChild(meta);
    body.appendChild(el("h3", "desk-card__title", title));
    const why = String(item.why || item.summary || "").trim();
    if (why) body.appendChild(el("p", "desk-card__why", why));

    face.appendChild(tile);
    face.appendChild(body);
    card.appendChild(face);
    return card;
  }

  function buildVideo(video) {
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
    const heading = el("h3");
    heading.appendChild(external(el("a", null, video.title || (id ? "youtu.be/" + id : video.url)), video.url));
    body.appendChild(heading);
    body.appendChild(dotTag("video · " + (video.author || "youtube")));

    const notes = Array.isArray(video.takeaways) ? video.takeaways.filter(Boolean) : [];
    if (notes.length) {
      const notesList = el("ul", "takeaways");
      notes.forEach((note) => notesList.appendChild(el("li", null, note)));
      body.appendChild(notesList);
    } else {
      body.appendChild(el("p", "pending-pill", "notes pending"));
      body.appendChild(el("p", "desk-note", video.hasTranscript
        ? "The transcript is in the vault. Takeaways come next."
        : "Clip it with Magpie, run the sync, and the notes land here."));
    }

    card.appendChild(thumb);
    card.appendChild(body);
    return card;
  }

  function buildSystem(system) {
    const card = el("article", "system-card");
    card.appendChild(el("h3", null, system.name || system.site || "untitled"));
    card.appendChild(dotTag((system.status || "system") + (system.site ? " · " + system.site : "")));

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
      const rulesList = el("ul", "system-rules");
      rules.forEach((rule) => rulesList.appendChild(el("li", null, rule)));
      card.appendChild(rulesList);
    }

    const links = el("div", "system-card__links");
    const named = (label) => { const a = el("a", null, label); a.appendChild(el("span", "sr-only", ": " + system.name)); return a; };
    if (system.live) links.appendChild(link(named(system.liveLabel || "Live"), system.live));
    if (system.doc) links.appendChild(link(named(system.docLabel || "The rules"), system.doc));
    if (links.childNodes.length) card.appendChild(links);
    return card;
  }

  function buildLibrary(entry) {
    const row = el("li");
    const label = el("span", "now-label");
    const anchor = el("a", null, entry.name || entry.url);
    anchor.href = entry.url;
    if (offSite(entry.url)) external(anchor, entry.url);
    label.appendChild(anchor);
    row.appendChild(label);
    const body = el("span", "now-body");
    body.appendChild(document.createTextNode(entry.what || ""));
    if (entry.count) body.appendChild(el("small", null, entry.count));
    if (entry.private) body.appendChild(el("span", "private-pill", "private, Kelly only"));
    row.appendChild(body);
    return row;
  }

  /* A document: a PDF, a board, a page, or a strip of images. */
  function buildDoc(doc) {
    const images = Array.isArray(doc.images) ? doc.images : [];
    const card = el("article", "doc-card" + (images.length ? " doc-card--wide" : ""));

    if (images.length) {
      card.appendChild(el("h3", null, doc.title || "images"));
      card.appendChild(dotTag((doc.kind || "images") + (doc.meta ? " · " + doc.meta : "")));
      if (doc.what) card.appendChild(el("p", null, doc.what));
      const strip = el("div", "art-strip" + (doc.tall ? " art-strip--tall" : ""));
      strip.setAttribute("aria-label", doc.title || "images");
      images.forEach((image) => {
        const anchor = external(el("a"), image.full || image.src);
        const figure = el("figure");
        const img = el("img");
        img.src = image.src;
        img.alt = image.alt || image.caption || "";
        img.loading = "lazy";
        img.addEventListener("error", () => anchor.remove());
        figure.appendChild(img);
        if (image.caption) figure.appendChild(el("figcaption", null, image.caption));
        anchor.appendChild(figure);
        strip.appendChild(anchor);
      });
      card.appendChild(strip);
      if (doc.href) card.appendChild(cta(doc.href, doc.cta || "Open all", doc.title));
      return card;
    }

    const tile = link(el("a", "doc-tile"), doc.href);
    tile.setAttribute("aria-label", "Open " + (doc.title || doc.href));
    if (doc.thumb) {
      const img = el("img");
      img.src = doc.thumb;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => img.remove());
      tile.appendChild(img);
    } else {
      tile.appendChild(el("span", "doc-tile__mark", initials(doc.title, domainOf(doc.href))));
    }
    if (doc.kind === "pdf") tile.appendChild(el("span", "doc-tile__badge", "pdf"));
    card.appendChild(tile);

    const heading = el("h3");
    heading.appendChild(link(el("a", null, doc.title || doc.href), doc.href));
    card.appendChild(heading);
    card.appendChild(dotTag((doc.kind || "doc") + (doc.meta ? " · " + doc.meta : "")));
    if (doc.what) card.appendChild(el("p", null, doc.what));
    if (doc.private) card.appendChild(el("span", "private-pill", "private, sign-in"));
    card.appendChild(cta(doc.href, doc.cta || "Open", doc.title));
    return card;
  }

  /* ---------- Filling a section ---------- */
  const fill = (container, nodes) => {
    if (!container) return 0;
    nodes.forEach((node) => container.appendChild(node));
    return nodes.length;
  };
  const hideWhenEmpty = (container, count) => {
    const part = container && container.closest(".desk-part");
    if (part && !count) part.hidden = true;
  };
  const plural = (count, one, many) => count + " " + (count === 1 ? one : many || one + "s");

  /* Long piles fold: the first few cards show, one button opens the rest. */
  function foldLongList(container, keep) {
    if (!container || !keep) return;
    const cards = Array.from(container.children);
    if (cards.length <= keep + 2) return;
    const rest = cards.slice(keep);
    rest.forEach((card) => { card.hidden = true; });
    const row = el("div", "chip-row desk-fold");
    const button = el("button", "chip", "Show all " + cards.length);
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      rest.forEach((card) => { card.hidden = open; });
      button.textContent = open ? "Show all " + cards.length : "Show fewer";
      button.setAttribute("aria-expanded", String(!open));
      if (open) container.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
      if (window.ScrollTrigger && typeof ScrollTrigger.refresh === "function") ScrollTrigger.refresh();
    });
    row.appendChild(button);
    container.insertAdjacentElement("afterend", row);
  }

  function riseIn(container) {
    if (!(window.gsap && window.ScrollTrigger) || reduced || !container || !container.children.length) return;
    /* The tween always completes to the natural state, so a filtered card is never stuck. */
    gsap.from(container.children, {
      y: 28,
      opacity: 0,
      duration: 0.6,
      ease: "power3.out",
      stagger: 0.05,
      scrollTrigger: { trigger: container, start: "top 85%", once: true },
    });
  }

  document.querySelectorAll("[data-section]").forEach((block) => {
    const id = block.dataset.section;
    const part = block.dataset.part || "";

    if (part === "videos") {
      const grid = block.querySelector(".js-videos");
      const videos = items.filter((item) => sectionOfItem(item) === id && item.kind === "video");
      if (grid && !videos.length) grid.appendChild(el("p", "desk-empty", "No videos saved yet. Clip one with Magpie."));
      fill(grid, videos.map(buildVideo));
      return;
    }

    if (part === "shelf") {
      renderShelf(block, items.filter((item) => sectionOfItem(item) === id && item.kind !== "video"));
      return;
    }

    const mineSystems = systems.filter((system) => sectionOfOwn(system) === id);
    const mineLibraries = libraries.filter((entry) => sectionOfOwn(entry) === id);
    const mineDocs = docs.filter((doc) => doc.section === id);
    const mine = items.filter((item) => sectionOfItem(item) === id);

    const systemBox = block.querySelector(".js-systems");
    const systemCount = fill(systemBox, mineSystems.map(buildSystem));
    hideWhenEmpty(systemBox, systemCount);

    const docBox = block.querySelector(".js-docs");
    const docCount = fill(docBox, mineDocs.map(buildDoc));
    hideWhenEmpty(docBox, docCount);

    const libraryBox = block.querySelector(".js-libraries");
    const libraryCount = fill(libraryBox, mineLibraries.map(buildLibrary));
    hideWhenEmpty(libraryBox, libraryCount);

    const cardBox = block.querySelector(".js-cards");
    const cardCount = fill(cardBox, mine.map(buildCard));
    const empty = block.querySelector(".js-empty");
    if (cardCount) {
      if (empty) empty.hidden = true;
      foldLongList(cardBox, block.dataset.fold ? Number(block.dataset.fold) : 9);
      riseIn(cardBox);
    } else if (empty) {
      empty.hidden = false;
      if (cardBox) cardBox.hidden = true;
    } else {
      hideWhenEmpty(cardBox, 0);
    }

    const count = block.querySelector(".js-count");
    if (count) {
      const bits = [];
      if (systemCount) bits.push(plural(systemCount, "system"));
      if (docCount) bits.push(plural(docCount, "document"));
      if (libraryCount) bits.push(plural(libraryCount, "library", "libraries"));
      if (cardCount) bits.push(plural(cardCount, "clip"));
      count.textContent = bits.join(" · ");
    }
  });

  /* ---------- The shelf (resources), with chips and a search box ---------- */
  function renderShelf(block, shelf) {
    const grid = block.querySelector("#shelfGrid");
    const countEl = block.querySelector("#shelfCount");
    const emptyEl = block.querySelector("#shelfEmpty");
    const chipRow = block.querySelector("#shelfChips");
    const search = block.querySelector("#shelfSearch");
    if (!grid) return;
    let activeKind = "all";
    /* With no filter or search, the shelf shows its newest few and folds the rest. */
    const KEEP = 16;
    let expanded = false;
    const foldRow = el("div", "chip-row desk-fold");
    const foldButton = el("button", "chip");
    foldButton.type = "button";
    foldButton.setAttribute("aria-expanded", "false");
    foldButton.setAttribute("aria-controls", "shelfGrid");
    foldRow.appendChild(foldButton);
    grid.insertAdjacentElement("afterend", foldRow);
    foldButton.addEventListener("click", () => {
      expanded = !expanded;
      foldButton.setAttribute("aria-expanded", String(expanded));
      applyFilter();
      if (!expanded) grid.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    });

    function applyFilter() {
      const query = ((search && search.value) || "").trim().toLowerCase();
      const folding = activeKind === "all" && !query && !expanded && shelf.length > KEEP + 2;
      let shown = 0;
      let matched = 0;
      grid.querySelectorAll(".desk-card").forEach((card) => {
        const kindOk = activeKind === "all" || card.dataset.kind === activeKind;
        const queryOk = !query || card.dataset.search.includes(query);
        const match = kindOk && queryOk;
        if (match) matched += 1;
        const on = match && (!folding || matched <= KEEP);
        card.hidden = !on;
        if (on) shown += 1;
      });
      const unfiltered = activeKind === "all" && !query;
      foldRow.hidden = !unfiltered || shelf.length <= KEEP + 2;
      foldButton.textContent = expanded ? "Show fewer" : "Show all " + shelf.length;
      if (countEl) {
        countEl.textContent = unfiltered
          ? shelf.length + " things on the shelf, newest first"
          : matched + " of " + shelf.length + " things on the shelf";
      }
      if (emptyEl) {
        const nothingSaved = shelf.length === 0;
        emptyEl.hidden = matched !== 0;
        emptyEl.textContent = nothingSaved
          ? "The shelf is empty. Clip something with Magpie and run the sync."
          : "Nothing on the shelf matches that. Try fewer letters.";
      }
      if (window.ScrollTrigger && typeof ScrollTrigger.refresh === "function") ScrollTrigger.refresh();
    }

    shelf.forEach((item, index) => grid.appendChild(buildCard(item, index)));

    if (chipRow) {
      const kinds = KIND_ORDER.filter((kind) => shelf.some((item) => item.kind === kind));
      ["all"].concat(kinds).forEach((kind) => {
        const total = kind === "all" ? shelf.length : shelf.filter((item) => item.kind === kind).length;
        const chip = el("button", "chip" + (kind === "all" ? " is-active" : ""));
        chip.appendChild(el("span", null, kind === "all" ? "all" : KIND_PLURAL[kind]));
        chip.appendChild(el("span", "chip__count", String(total)));
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
    riseIn(grid);
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

  /* every link that opens a new tab says so */
  document.querySelectorAll('.desk-section a[target="_blank"]').forEach((anchor) => {
    if (/opens in a new tab/.test(anchor.textContent)) return;
    const label = anchor.getAttribute("aria-label");
    if (label) anchor.setAttribute("aria-label", label + " (opens in a new tab)");
    else anchor.appendChild(el("span", "sr-only", " (opens in a new tab)"));
  });

  if (window.ScrollTrigger && typeof ScrollTrigger.refresh === "function") ScrollTrigger.refresh();
})();
