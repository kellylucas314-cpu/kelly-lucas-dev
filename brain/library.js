/* kellylucas.dev · Magpie, my library (/brain/gallery.html)
   Reads the private library from /api/magpie-library (signed-in sessions
   only) and lays it out on shelves: search, shelves by kind, tags, origin,
   sort, cards or a list, and a side sheet that reads each clip's saved
   Markdown note. The page owns its look; the vault only supplies data.
   Every target is null-checked, and the filters live in the URL so a
   refresh or the back button keeps your place. */

(function magpieLibrary() {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const VAULT_NAME = "kip-workspace";
  const BATCH = 48;
  const LOGIN = "/brain/login.html";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Shelves group Magpie's types. Each one wears its own pair of colors (style.css). */
  const SHELVES = [
    { key: "page", label: "Pages", shape: "s-circle" },
    { key: "reading", label: "Reading", shape: "s-arch" },
    { key: "video", label: "Videos", shape: "s-sun" },
    { key: "code", label: "Code", shape: "s-cog" },
    { key: "picture", label: "Pictures", shape: "s-quat" },
    { key: "note", label: "Notes", shape: "s-bean" },
  ];
  const SHELF = Object.fromEntries(SHELVES.map((shelf) => [shelf.key, shelf]));
  const KIND_WORD = { page: "page", reading: "reading", video: "video", code: "code", picture: "picture", note: "note" };

  const state = { q: "", shelf: "", tag: "", origin: "", sort: "new", view: "grid", limit: BATCH };
  let ITEMS = [];
  let visible = [];
  let sheetList = [];
  let sheetIndex = -1;
  let sheetReturn = null;
  let noteRequest = 0;

  /* ---------- small helpers ---------- */
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const shape = (id, className) => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "-100 -100 200 200");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "shape" + (className ? " " + className : ""));
    const use = document.createElementNS(ns, "use");
    use.setAttribute("href", "#" + id);
    use.setAttribute("x", "-100");
    use.setAttribute("y", "-100");
    use.setAttribute("width", "200");
    use.setAttribute("height", "200");
    svg.appendChild(use);
    return svg;
  };
  const safeHttpUrl = (value) => {
    if (!value) return "";
    try {
      const url = new URL(value, location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  };
  const hostOf = (value) => {
    try {
      return new URL(value).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };
  const initials = (title, site) => {
    const words = String(title || site || "?").replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toLowerCase();
    return (words[0] || "?").slice(0, 2).toLowerCase();
  };
  const plural = (count, one, many) => count.toLocaleString("en-US") + " " + (count === 1 ? one : many || one + "s");
  const dateWord = (value) => {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const goToLogin = () => {
    location.replace(LOGIN + "?returnTo=" + encodeURIComponent(location.pathname + location.search));
  };

  /* What Magpie saved, read the way the old gallery read it. */
  function shelfOf(item) {
    const raw = String(item.type || "").toLowerCase().trim();
    let url;
    try { url = new URL(item.url || "", location.href); } catch { /* not a url */ }
    const host = (url?.hostname || "").replace(/^(www|m)\./, "").toLowerCase();
    if (host === "youtube.com" || host === "youtu.be" || host === "vimeo.com" || raw === "video") return "video";
    if (host === "gist.github.com") return "code";
    if (host === "github.com") return (url.pathname.split("/").filter(Boolean).length >= 2) ? "code" : "page";
    if (raw === "github" || raw === "github repo" || raw === "repo") return "code";
    if (raw === "article" || raw === "paper" || raw === "pdf") return "reading";
    if (raw === "image") return "picture";
    if (raw === "note") return "note";
    return "page";
  }
  function originOf(item) {
    const source = String(item.captureSource || "").toLowerCase().trim();
    const tags = (item.tags || []).map((tag) => String(tag).toLowerCase());
    if (source.includes("browser")) return "Browser clipper";
    if (source.includes("stumbleupon") || tags.includes("stumbleupon")) return "StumbleUpon archive";
    if (source.includes("collector") || tags.includes("collector")) return "Magpie Collector";
    if (source) return item.captureSource;
    if (String(item.type || "").toLowerCase() === "bookmark") return "Imported bookmark";
    return "Origin not recorded";
  }

  function prepare(raw) {
    return raw.filter((item) => item && typeof item === "object").map((item, index) => {
      const tags = Array.isArray(item.tags) ? item.tags.map(String).filter((tag) => tag && tag !== "magpie") : [];
      const url = safeHttpUrl(item.url);
      const site = String(item.site || hostOf(url) || "");
      const title = String(item.title || site || item.url || "Untitled");
      const text = String(item.note || item.description || item.excerpt || "").trim();
      const shelf = shelfOf(item);
      const origin = originOf(item);
      const thumbName = String(item.thumbLocal || "").split("/").pop();
      return {
        id: index,
        raw: item,
        title,
        url,
        site,
        text,
        tags,
        shelf,
        origin,
        clipped: String(item.clippedAt || ""),
        file: String(item.file || ""),
        transcript: Boolean(item.hasTranscript),
        thumb: thumbName ? "/api/magpie-thumb?name=" + encodeURIComponent(thumbName) : "",
        hay: [title, item.description, item.excerpt, item.note, site, KIND_WORD[shelf], origin, tags.join(" ")]
          .join(" ")
          .toLowerCase(),
      };
    });
  }

  /* ---------- state in the URL ---------- */
  function readUrl() {
    const params = new URLSearchParams(location.search);
    state.q = params.get("q") || "";
    state.shelf = SHELF[params.get("shelf")] ? params.get("shelf") : "";
    state.tag = params.get("tag") || "";
    state.origin = params.get("origin") || "";
    state.sort = ["new", "old", "az"].includes(params.get("sort")) ? params.get("sort") : "new";
    state.view = params.get("view") === "list" ? "list" : "grid";
  }
  function writeUrl() {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.shelf) params.set("shelf", state.shelf);
    if (state.tag) params.set("tag", state.tag);
    if (state.origin) params.set("origin", state.origin);
    if (state.sort !== "new") params.set("sort", state.sort);
    if (state.view !== "grid") params.set("view", state.view);
    /* the stand-in preview's test switches ride along */
    const current = new URLSearchParams(location.search);
    ["empty", "fail"].forEach((key) => { if (current.has(key)) params.set(key, current.get(key)); });
    const query = params.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : ""));
  }

  /* ---------- filtering ---------- */
  function matches(item, skip) {
    const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (skip !== "q" && words.some((word) => !item.hay.includes(word))) return false;
    if (skip !== "shelf" && state.shelf && item.shelf !== state.shelf) return false;
    if (skip !== "tag" && state.tag && !item.tags.includes(state.tag)) return false;
    if (skip !== "origin" && state.origin && item.origin !== state.origin) return false;
    return true;
  }
  function sorted(list) {
    const copy = list.slice();
    if (state.sort === "az") copy.sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }));
    else if (state.sort === "old") copy.sort((a, b) => a.clipped.localeCompare(b.clipped) || a.id - b.id);
    else copy.sort((a, b) => b.clipped.localeCompare(a.clipped) || a.id - b.id);
    return copy;
  }

  /* ---------- the cards ---------- */
  function buildTags(item, limit) {
    const list = el("ul", "clip__tags");
    const shown = limit ? item.tags.slice(0, limit) : item.tags;
    shown.forEach((tag) => {
      const li = el("li");
      const button = el("button", "clip__tag" + (tag === state.tag ? " is-on" : ""), "#" + tag);
      button.type = "button";
      button.dataset.tag = tag;
      button.setAttribute("aria-label", "Show clips tagged " + tag);
      li.appendChild(button);
      list.appendChild(li);
    });
    if (limit && item.tags.length > limit) list.appendChild(el("li", "clip__more", "+" + (item.tags.length - limit)));
    return list;
  }

  function buildPicture(item, className) {
    const pic = el("span", className + " clip__pic--" + item.shelf);
    const ph = el("span", "clip__ph");
    ph.appendChild(shape(SHELF[item.shelf].shape, "clip__shape"));
    ph.appendChild(el("span", "clip__initials", initials(item.title, item.site)));
    pic.appendChild(ph);
    if (item.thumb) {
      const img = el("img");
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.src = item.thumb;
      img.addEventListener("error", () => img.remove(), { once: true });
      img.addEventListener("load", () => pic.classList.add("has-img"), { once: true });
      pic.appendChild(img);
    }
    return pic;
  }

  function buildCard(item) {
    const card = el("article", "clip clip--" + item.shelf);
    card.dataset.id = String(item.id);

    if (item.url) {
      const face = el("a", "clip__face");
      face.href = item.url;
      face.target = "_blank";
      face.rel = "noopener noreferrer";
      face.tabIndex = -1;
      face.setAttribute("aria-hidden", "true");
      face.appendChild(buildPicture(item, "clip__pic"));
      card.appendChild(face);
    } else {
      const face = el("span", "clip__face");
      face.appendChild(buildPicture(item, "clip__pic"));
      card.appendChild(face);
    }

    const body = el("div", "clip__body");
    const meta = el("p", "clip__meta");
    meta.appendChild(el("span", "kind kind--" + item.shelf, KIND_WORD[item.shelf]));
    if (item.transcript) meta.appendChild(el("span", "kind kind--transcript", "transcript"));
    const when = dateWord(item.clipped);
    if (when) {
      const time = el("time", null, when);
      time.dateTime = item.clipped.slice(0, 10);
      meta.appendChild(time);
    }
    body.appendChild(meta);

    const heading = el("h3", "clip__title");
    if (item.url) {
      const a = el("a", null, item.title);
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.appendChild(el("span", "sr-only", " (opens in a new tab)"));
      heading.appendChild(a);
    } else {
      heading.textContent = item.title;
    }
    body.appendChild(heading);
    if (item.text) body.appendChild(el("p", "clip__text", item.text));
    if (item.tags.length) body.appendChild(buildTags(item, 4));

    const foot = el("div", "clip__foot");
    foot.appendChild(el("span", "clip__site", item.site || "no site saved"));
    if (item.file) {
      const read = el("button", "clip__read", "Read note");
      read.type = "button";
      read.dataset.open = String(item.id);
      read.appendChild(el("span", "sr-only", ": " + item.title));
      foot.appendChild(read);
    }
    body.appendChild(foot);
    card.appendChild(body);
    return card;
  }

  /* ---------- the controls ---------- */
  function countBy(list, key) {
    const counts = new Map();
    list.forEach((item) => counts.set(item[key], (counts.get(item[key]) || 0) + 1));
    return counts;
  }

  function renderShelves() {
    const row = $("shelfRow");
    if (!row) return;
    row.textContent = "";
    const base = ITEMS.filter((item) => matches(item, "shelf"));
    const counts = countBy(base, "shelf");
    const everything = el("button", "shelf shelf--all");
    everything.type = "button";
    everything.dataset.shelf = "";
    everything.setAttribute("aria-pressed", String(!state.shelf));
    everything.appendChild(el("span", "shelf__dot"));
    everything.appendChild(el("span", null, "Everything"));
    everything.appendChild(el("span", "shelf__n mono", String(base.length)));
    row.appendChild(everything);
    SHELVES.forEach((shelf) => {
      const total = ITEMS.filter((item) => item.shelf === shelf.key).length;
      if (!total) return;
      const n = counts.get(shelf.key) || 0;
      const button = el("button", "shelf shelf--" + shelf.key);
      button.type = "button";
      button.dataset.shelf = shelf.key;
      button.setAttribute("aria-pressed", String(state.shelf === shelf.key));
      if (!n && state.shelf !== shelf.key) button.classList.add("is-empty");
      button.appendChild(shape(shelf.shape, "shelf__shape"));
      button.appendChild(el("span", null, shelf.label));
      button.appendChild(el("span", "shelf__n mono", String(n)));
      row.appendChild(button);
    });
  }

  let tagTotals = [];
  function renderTags() {
    const row = $("tagRow");
    if (!row) return;
    row.textContent = "";
    const top = tagTotals.slice(0, 14).map(([tag]) => tag);
    if (state.tag && !top.includes(state.tag)) top.unshift(state.tag);
    top.forEach((tag) => {
      const chip = el("button", "chip", "#" + tag);
      chip.type = "button";
      chip.dataset.tag = tag;
      chip.setAttribute("aria-pressed", String(state.tag === tag));
      row.appendChild(chip);
    });
    if (tagTotals.length > 14) {
      const more = el("button", "chip chip--more");
      more.type = "button";
      more.id = "allTagsButton";
      const open = !$("allTags").hidden;
      more.setAttribute("aria-expanded", String(open));
      more.setAttribute("aria-controls", "allTags");
      more.textContent = open ? "Fewer tags" : "All " + tagTotals.length + " tags";
      row.appendChild(more);
    }
  }

  function renderAllTags() {
    const box = $("allTagList");
    if (!box) return;
    const find = (($("tagFind") && $("tagFind").value) || "").trim().toLowerCase();
    box.textContent = "";
    const list = tagTotals.filter(([tag]) => !find || tag.toLowerCase().includes(find));
    list.forEach(([tag, n]) => {
      const chip = el("button", "chip chip--small");
      chip.type = "button";
      chip.dataset.tag = tag;
      chip.setAttribute("aria-pressed", String(state.tag === tag));
      chip.appendChild(el("span", null, "#" + tag));
      chip.appendChild(el("span", "chip__count", String(n)));
      box.appendChild(chip);
    });
    if (!list.length) box.appendChild(el("p", "lib-alltags__none", "No tag has those letters."));
  }

  function renderActive() {
    const box = $("activeFilters");
    if (!box) return;
    box.textContent = "";
    const pills = [];
    if (state.q) pills.push(["q", "“" + state.q + "”"]);
    if (state.shelf) pills.push(["shelf", SHELF[state.shelf].label]);
    if (state.tag) pills.push(["tag", "#" + state.tag]);
    if (state.origin) pills.push(["origin", state.origin]);
    pills.forEach(([key, label]) => {
      const pill = el("button", "lib-pill");
      pill.type = "button";
      pill.dataset.clear = key;
      pill.setAttribute("aria-label", "Remove the filter " + label);
      pill.appendChild(el("span", null, label));
      const x = el("span", "lib-pill__x", "×");
      x.setAttribute("aria-hidden", "true");
      pill.appendChild(x);
      box.appendChild(pill);
    });
    if (pills.length > 1) {
      const all = el("button", "lib-clear", "Clear all");
      all.type = "button";
      all.dataset.clear = "all";
      box.appendChild(all);
    }
  }

  function renderGrid() {
    const grid = $("grid");
    if (!grid) return;
    grid.classList.toggle("is-list", state.view === "list");
    grid.textContent = "";
    const shown = visible.slice(0, state.limit);
    const frag = document.createDocumentFragment();
    shown.forEach((item) => frag.appendChild(buildCard(item)));
    grid.appendChild(frag);
    grid.hidden = !shown.length;

    const left = visible.length - shown.length;
    $("moreRow").hidden = left <= 0;
    if (left > 0) $("moreButton").textContent = "Show " + Math.min(BATCH, left) + " more (" + left + " to go)";

    const filtered = state.q || state.shelf || state.tag || state.origin;
    $("resultCount").textContent = !ITEMS.length
      ? "The library is empty."
      : filtered
        ? plural(visible.length, "clip") + " of " + ITEMS.length.toLocaleString("en-US")
        : plural(ITEMS.length, "clip") + ", " + (state.sort === "az" ? "A to Z" : state.sort === "old" ? "oldest first" : "newest first");

    const empty = $("emptyState");
    empty.hidden = visible.length > 0;
    if (!visible.length) {
      const none = !ITEMS.length;
      $("emptyTitle").textContent = none ? "Nothing clipped yet" : "Nothing matches";
      $("emptyText").textContent = none
        ? "Clip a page with the feather button, run the sync, and it lands here."
        : "Try fewer letters, another shelf, or clear the filters.";
      $("emptyButton").hidden = none;
    }
    const surprise = $("surpriseButton");
    if (surprise) surprise.disabled = !visible.some((item) => item.file);
  }

  function render(options = {}) {
    visible = sorted(ITEMS.filter((item) => matches(item)));
    if (!options.keepLimit) state.limit = BATCH;
    renderShelves();
    renderTags();
    if (!$("allTags").hidden) renderAllTags();
    renderActive();
    renderGrid();
    $("originSelect").value = state.origin;
    $("sortSelect").value = state.sort;
    document.querySelectorAll(".lib-view button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
    });
    writeUrl();
  }

  function scrollToResults() {
    const bar = document.querySelector(".lib-bar");
    const results = $("results");
    if (!results) return;
    const top = results.getBoundingClientRect().top + window.scrollY - (bar ? bar.offsetHeight : 0) + 8;
    if (window.scrollY > top + 40) window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }

  function setTag(tag) {
    state.tag = state.tag === tag ? "" : tag;
    render();
    scrollToResults();
  }

  /* ---------- the note sheet ---------- */
  function inline(text) {
    let out = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const codes = [];
    out = out.replace(/`([^`]+)`/g, (_, code) => { codes.push(code); return "\u0000" + (codes.length - 1) + "\u0000"; });
    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_, alt) => (alt ? "[picture: " + alt + "]" : "[picture]"));
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (whole, label, href) => {
      const url = safeHttpUrl(href.replace(/&amp;/g, "&"));
      return url ? '<a href="' + url.replace(/"/g, "&quot;") + '" target="_blank" rel="noopener noreferrer">' + label + "</a>" : label;
    });
    out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (whole, lead, href) => {
      const url = safeHttpUrl(href.replace(/&amp;/g, "&"));
      return url ? lead + '<a href="' + url.replace(/"/g, "&quot;") + '" target="_blank" rel="noopener noreferrer">' + href + "</a>" : whole;
    });
    out = out.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, page, label) => "<span class=\"md__wiki\">" + (label || page) + "</span>");
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => "<code>" + codes[Number(i)].replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</code>");
    return out;
  }

  /* A small, safe Markdown reader: everything is escaped first. */
  function markdown(source) {
    const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
    const html = [];
    let i = 0;
    const front = [];
    if (lines[0] === "---") {
      const end = lines.indexOf("---", 1);
      if (end > 0) {
        lines.slice(1, end).forEach((line) => {
          const match = /^([\w -]+):\s*(.*)$/.exec(line);
          if (match && match[2].trim()) front.push([match[1].trim(), match[2].trim().replace(/^["']|["']$/g, "")]);
        });
        i = end + 1;
      }
    }
    if (front.length) {
      html.push('<dl class="md__front">' + front.slice(0, 8).map(([key, value]) =>
        "<div><dt>" + inline(key) + "</dt><dd>" + inline(value) + "</dd></div>").join("") + "</dl>");
    }
    let list = null;
    let para = [];
    const flushPara = () => { if (para.length) { html.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } };
    const flushList = () => { if (list) { html.push("<" + list.tag + ">" + list.items.map((item) => "<li>" + inline(item) + "</li>").join("") + "</" + list.tag + ">"); list = null; } };
    for (; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^```/.test(line)) {
        flushPara(); flushList();
        const code = [];
        for (i += 1; i < lines.length && !/^```/.test(lines[i]); i += 1) code.push(lines[i]);
        html.push("<pre><code>" + code.join("\n").replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</code></pre>");
        continue;
      }
      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        flushPara(); flushList();
        const level = Math.min(4, heading[1].length + 1);
        html.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">");
        continue;
      }
      const bullet = /^\s*(?:[-*+]|(\d+)[.)])\s+(.*)$/.exec(line);
      if (bullet) {
        flushPara();
        const tag = bullet[1] ? "ol" : "ul";
        if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
        list.items.push(bullet[2].replace(/^\[( |x)\]\s*/i, (m, x) => (x.trim() ? "✓ " : "")));
        continue;
      }
      if (/^>\s?/.test(line)) {
        flushPara(); flushList();
        const quote = [];
        for (; i < lines.length && /^>\s?/.test(lines[i]); i += 1) quote.push(lines[i].replace(/^>\s?/, ""));
        i -= 1;
        html.push("<blockquote><p>" + inline(quote.join(" ")) + "</p></blockquote>");
        continue;
      }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushPara(); flushList(); html.push("<hr>"); continue; }
      if (!line.trim()) { flushPara(); flushList(); continue; }
      flushList();
      para.push(line.trim());
    }
    flushPara(); flushList();
    return html.join("\n");
  }

  function obsidianLink(file) {
    return "obsidian://open?vault=" + encodeURIComponent(VAULT_NAME) + "&file=" + encodeURIComponent(file.replace(/\.md$/, ""));
  }

  async function showNote(item) {
    const sheet = $("sheet");
    const body = $("sheetBody");
    const ticket = ++noteRequest;
    $("sheetTitle").textContent = item.title;
    const meta = $("sheetMeta");
    meta.textContent = "";
    meta.appendChild(el("span", "kind kind--" + item.shelf, KIND_WORD[item.shelf]));
    if (item.transcript) meta.appendChild(el("span", "kind kind--transcript", "transcript"));
    const when = dateWord(item.clipped);
    if (when) meta.appendChild(el("time", null, when));
    if (item.site) meta.appendChild(el("span", "clip__site", item.site));

    const pic = $("sheetPic");
    pic.textContent = "";
    pic.appendChild(buildPicture(item, "clip__pic sheet__picture"));

    const source = $("sheetSource");
    source.hidden = !item.url;
    if (item.url) source.href = item.url;
    $("sheetObsidian").href = obsidianLink(item.file);
    const tags = $("sheetTags");
    tags.replaceWith(Object.assign(buildTags(item), { id: "sheetTags", className: "clip__tags sheet__tags" }));

    $("sheetPos").textContent = (sheetIndex + 1) + " of " + sheetList.length;
    $("sheetPrev").disabled = sheetIndex <= 0;
    $("sheetNext").disabled = sheetIndex >= sheetList.length - 1;
    $("sheetScroll").scrollTop = 0;

    body.className = "md is-loading";
    body.innerHTML = "<p>Reading the saved note…</p>";
    if (!sheet.open) {
      if (typeof sheet.showModal === "function") sheet.showModal();
      else sheet.setAttribute("open", "");
      document.documentElement.classList.add("sheet-open");
    }
    try {
      const response = await fetch("/api/magpie-note?file=" + encodeURIComponent(item.file), { credentials: "same-origin", cache: "no-store" });
      if (ticket !== noteRequest) return;
      if (response.status === 401) return goToLogin();
      if (!response.ok) throw new Error("note unavailable");
      const text = await response.text();
      if (ticket !== noteRequest) return;
      body.className = "md";
      body.innerHTML = markdown(text) || "<p>This note is empty.</p>";
    } catch {
      if (ticket !== noteRequest) return;
      body.className = "md is-error";
      body.innerHTML = "";
      body.appendChild(el("p", null, "Magpie couldn’t load this note just now. The Obsidian button still opens it on the Mac."));
      if (item.text) body.appendChild(el("blockquote", null, item.text));
    }
  }

  function openSheet(id, returnFocus) {
    sheetList = visible.filter((item) => item.file);
    sheetIndex = sheetList.findIndex((item) => item.id === id);
    if (sheetIndex < 0) return;
    sheetReturn = returnFocus || null;
    showNote(sheetList[sheetIndex]);
  }
  function stepSheet(delta) {
    const next = sheetIndex + delta;
    if (next < 0 || next >= sheetList.length) return;
    sheetIndex = next;
    showNote(sheetList[sheetIndex]);
  }
  function closeSheet() {
    const sheet = $("sheet");
    if (sheet.open && typeof sheet.close === "function") sheet.close();
    else sheet.removeAttribute("open");
  }

  /* ---------- wiring ---------- */
  function wire() {
    const search = $("searchBox");
    let timer = 0;
    search.value = state.q;
    search.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = search.value.trim(); render(); }, 120);
    });
    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && search.value) { event.preventDefault(); search.value = ""; state.q = ""; render(); }
      if (event.key === "Enter") { event.preventDefault(); clearTimeout(timer); state.q = search.value.trim(); render(); scrollToResults(); }
    });

    $("originSelect").addEventListener("change", (event) => { state.origin = event.target.value; render(); });
    $("sortSelect").addEventListener("change", (event) => { state.sort = event.target.value; render(); });
    document.querySelector(".lib-view").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-view]");
      if (!button) return;
      state.view = button.dataset.view;
      render({ keepLimit: true });
    });

    $("shelfRow").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-shelf]");
      if (!button) return;
      const key = button.dataset.shelf;
      state.shelf = state.shelf === key ? "" : key;
      render();
    });

    $("tagRow").addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.id === "allTagsButton") {
        const box = $("allTags");
        box.hidden = !box.hidden;
        renderTags();
        if (!box.hidden) { renderAllTags(); $("tagFind").focus(); } else $("allTagsButton").focus();
        return;
      }
      if (button.dataset.tag) setTag(button.dataset.tag);
    });
    $("allTagList").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-tag]");
      if (button) setTag(button.dataset.tag);
    });
    $("tagFind").addEventListener("input", renderAllTags);
    $("tagFind").addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); $("allTags").hidden = true; renderTags(); $("allTagsButton").focus(); }
    });

    $("grid").addEventListener("click", (event) => {
      const tag = event.target.closest("button[data-tag]");
      if (tag) return setTag(tag.dataset.tag);
      const open = event.target.closest("button[data-open]");
      if (open) openSheet(Number(open.dataset.open), open);
    });

    $("activeFilters").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-clear]");
      if (!button) return;
      const key = button.dataset.clear;
      if (key === "all" || key === "q") { search.value = key === "all" ? "" : ""; state.q = ""; }
      if (key === "all") { state.shelf = ""; state.tag = ""; state.origin = ""; }
      else if (key !== "q") state[key] = "";
      render();
      search.focus({ preventScroll: true });
    });

    const clearAll = () => { search.value = ""; Object.assign(state, { q: "", shelf: "", tag: "", origin: "" }); render(); };
    $("emptyButton").addEventListener("click", () => { clearAll(); search.focus({ preventScroll: true }); });

    $("moreButton").addEventListener("click", () => {
      const firstNew = state.limit;
      state.limit += BATCH;
      renderGrid();
      const card = $("grid").children[firstNew];
      const link = card && (card.querySelector(".clip__title a") || card.querySelector("button"));
      if (link) link.focus({ preventScroll: true });
    });

    $("surpriseButton").addEventListener("click", (event) => {
      const pool = visible.filter((item) => item.file);
      if (!pool.length) return;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      openSheet(pick.id, event.currentTarget);
    });

    $("sheetPrev").addEventListener("click", () => stepSheet(-1));
    $("sheetNext").addEventListener("click", () => stepSheet(1));
    $("sheetClose").addEventListener("click", closeSheet);
    const sheet = $("sheet");
    sheet.addEventListener("click", (event) => { if (event.target === sheet) closeSheet(); });
    sheet.addEventListener("close", () => {
      document.documentElement.classList.remove("sheet-open");
      noteRequest += 1;
      const back = sheetReturn && document.contains(sheetReturn) ? sheetReturn : null;
      if (back) back.focus({ preventScroll: true });
      else {
        const item = sheetList[sheetIndex];
        const card = item && document.querySelector('.clip[data-id="' + item.id + '"] .clip__read');
        if (card) card.focus({ preventScroll: true });
      }
    });
    sheet.addEventListener("keydown", (event) => {
      if (event.target.closest && event.target.closest("input, textarea")) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); stepSheet(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); stepSheet(1); }
    });
    $("sheetTags").parentElement.addEventListener("click", (event) => {
      const tag = event.target.closest("button[data-tag]");
      if (!tag) return;
      closeSheet();
      setTag(tag.dataset.tag);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      if (active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
      if ($("sheet").open) return;
      event.preventDefault();
      search.focus();
      search.select();
    });

    $("lockButton").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await fetch("/api/magpie-logout", { method: "POST", credentials: "same-origin" });
      } catch { /* the cookie clears either way on the next sign-in */ }
      location.replace(LOGIN);
    });
  }

  function renderStats() {
    const stats = {
      clips: ITEMS.length,
      sites: new Set(ITEMS.map((item) => item.site).filter(Boolean)).size,
      tags: tagTotals.length,
      notes: ITEMS.filter((item) => item.file).length,
    };
    document.querySelectorAll("[data-stat]").forEach((node) => {
      node.textContent = (stats[node.dataset.stat] || 0).toLocaleString("en-US");
    });
    const dates = ITEMS.map((item) => item.clipped).filter(Boolean).sort();
    const since = $("libSince");
    if (since && dates.length) since.textContent = "since " + dateWord(dates[0]) + ", newest " + dateWord(dates[dates.length - 1]);
  }

  function fillOrigins() {
    const select = $("originSelect");
    const counts = countBy(ITEMS, "origin");
    [...counts.keys()].sort().forEach((origin) => {
      const option = el("option", null, origin + " (" + counts.get(origin) + ")");
      option.value = origin;
      select.appendChild(option);
    });
    if (state.origin && !counts.has(state.origin)) state.origin = "";
  }

  function showError(message) {
    const grid = $("grid");
    grid.classList.remove("is-loading");
    grid.removeAttribute("aria-busy");
    grid.hidden = true;
    $("resultCount").textContent = "";
    const empty = $("emptyState");
    empty.hidden = false;
    $("emptyTitle").textContent = "The library didn’t open";
    $("emptyText").textContent = message;
    const button = $("emptyButton");
    button.hidden = false;
    button.textContent = "Try again";
    button.onclick = (event) => { event.stopImmediatePropagation(); location.reload(); };
  }

  async function start() {
    readUrl();
    let payload;
    try {
      const response = await fetch("/api/magpie-library", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) return goToLogin();
      if (!response.ok) throw new Error("unavailable");
      payload = await response.json();
    } catch {
      showError("Magpie couldn’t reach the private library. Check the connection and try again.");
      return;
    }
    ITEMS = prepare(Array.isArray(payload && payload.items) ? payload.items : []);
    const counts = new Map();
    ITEMS.forEach((item) => item.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    tagTotals = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (state.tag && !counts.has(state.tag)) state.tag = "";

    const grid = $("grid");
    grid.classList.remove("is-loading");
    grid.removeAttribute("aria-busy");
    renderStats();
    fillOrigins();
    wire();
    render();
  }

  start();
})();
