/* kellylucas.dev · Magpie's design systems room (/brain/systems.html)
   The palettes, type and rules behind my own sites, with the drawings and
   documents that go with them. It renders systems-data.js, which is written
   by hand. Every target is null-checked so the page stays readable if
   anything is missing. This room replaced the design desk on 2026-11-13:
   the links the desk used to shelve now live in the library itself. */

(function systemsRoom() {
  const library = window.DESIGN_SYSTEMS || null;
  const list = (key) => (library && Array.isArray(library[key]) ? library[key] : []);
  const systems = list("systems");
  const libraries = list("libraries");
  const docs = list("docs");
  const ARROW =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M1.5 12H21M12.99 3.51L21.47 12L12.99 20.48" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>';

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
        /* This room only loads pictures from this site, so a drawing kept
           on another site opens here as its local copy; "Open full size"
           still goes to the original. */
        if (offSite(image.full)) anchor.dataset.view = image.src;
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

  document.querySelectorAll("[data-section]").forEach((block) => {
    const id = block.dataset.section;
    const systemBox = block.querySelector(".js-systems");
    const systemCount = fill(systemBox, systems.filter((system) => system.section === id).map(buildSystem));
    hideWhenEmpty(systemBox, systemCount);
    if (systemBox && systemCount === 1) systemBox.classList.add("system-grid--one");

    const docBox = block.querySelector(".js-docs");
    const docCount = fill(docBox, docs.filter((doc) => doc.section === id).map(buildDoc));
    hideWhenEmpty(docBox, docCount);

    const libraryBox = block.querySelector(".js-libraries");
    const libraryCount = fill(libraryBox, libraries.filter((entry) => entry.section === id).map(buildLibrary));
    hideWhenEmpty(libraryBox, libraryCount);

    const count = block.querySelector(".js-count");
    if (count) {
      const bits = [];
      if (docCount) bits.push(plural(docCount, "document"));
      if (libraryCount) bits.push(plural(libraryCount, "library", "libraries"));
      count.textContent = bits.join(" · ");
    }
  });

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

  /* ---------- The picture viewer: art strips and notebook pages open here ---------- */
  const box = document.getElementById("lightbox");
  const isPicture = (href) => /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(href || "");
  if (box && typeof box.showModal === "function") {
    const img = document.getElementById("lightboxImg");
    const cap = document.getElementById("lightboxCap");
    const pos = document.getElementById("lightboxPos");
    const prev = document.getElementById("lightboxPrev");
    const next = document.getElementById("lightboxNext");
    const open = document.getElementById("lightboxOpen");
    let group = [];
    let at = 0;
    let opener = null;
    const show = (index) => {
      at = Math.max(0, Math.min(group.length - 1, index));
      const anchor = group[at];
      const thumb = anchor.querySelector("img");
      const caption = anchor.querySelector("figcaption");
      img.src = anchor.dataset.view || anchor.href;
      img.alt = (thumb && thumb.alt) || "";
      cap.textContent = (caption && caption.textContent) || (thumb && thumb.alt) || "";
      pos.textContent = group.length > 1 ? at + 1 + " of " + group.length : "";
      prev.hidden = next.hidden = group.length < 2;
      prev.disabled = at === 0;
      next.disabled = at === group.length - 1;
      open.href = anchor.href;
    };
    document.addEventListener("click", (event) => {
      const anchor = event.target.closest(".art-strip a, .notepage__photo");
      if (!anchor || !isPicture(anchor.getAttribute("href"))) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      const scope = anchor.closest(".art-strip") || anchor.closest(".notebook-grid") || document;
      group = Array.from(scope.querySelectorAll(".art-strip a, .notepage__photo")).filter((a) => isPicture(a.getAttribute("href")));
      opener = anchor;
      show(group.indexOf(anchor));
      box.showModal();
      document.documentElement.classList.add("sheet-open");
    });
    prev.addEventListener("click", () => show(at - 1));
    next.addEventListener("click", () => show(at + 1));
    document.getElementById("lightboxClose").addEventListener("click", () => box.close());
    box.addEventListener("click", (event) => { if (event.target === box) box.close(); });
    box.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); show(at - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); show(at + 1); }
    });
    box.addEventListener("close", () => {
      document.documentElement.classList.remove("sheet-open");
      img.removeAttribute("src");
      if (opener) opener.focus({ preventScroll: true });
    });
  }

  /* every link that opens a new tab says so */
  document.querySelectorAll('.desk-section a[target="_blank"]').forEach((anchor) => {
    if (/opens in a new tab/.test(anchor.textContent)) return;
    const label = anchor.getAttribute("aria-label");
    if (label) anchor.setAttribute("aria-label", label + " (opens in a new tab)");
    else anchor.appendChild(el("span", "sr-only", " (opens in a new tab)"));
  });
})();
