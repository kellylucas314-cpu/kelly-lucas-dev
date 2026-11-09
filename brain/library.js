/* kellylucas.dev · Magpie, my library (/brain/gallery.html)
   The one Magpie library. The feather, the Add box and the Mac all save
   into it; this page reads it from /api/magpie-library (signed-in only) and
   organises it through /api/magpie-update.

   Left: Unsorted (the inbox), Everything, your own collections (nested,
   colored, drag a card onto one to file it) and Trash. Right: search,
   kinds, tags, origin, sort, cards or a list, and a side sheet that reads
   each clip's saved note and edits it. Filters live in the URL, every
   change is saved at once and can be undone from the toast, and every
   target is null-checked. */

(function magpieLibrary() {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const VAULT_NAME = "kip-workspace";
  const BATCH = 48;
  const LOGIN = "/brain/login.html";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const COLORS = ["teal", "coral", "honey", "sage", "navy"];
  const COLOR_NAME = { teal: "Teal", coral: "Coral", honey: "Honey", sage: "Sage", navy: "Navy" };

  /* Kinds group Magpie's types. Each one wears its own pair of colors (style.css). */
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

  const state = { q: "", shelf: "", tag: "", origin: "", sort: "new", view: "grid", col: "", limit: BATCH };
  let ITEMS = [];
  let COLLECTIONS = [];
  let visible = [];
  let tagTotals = [];
  let sheetList = [];
  let sheetIndex = -1;
  let sheetReturn = null;
  let noteRequest = 0;
  let selecting = false;
  const selected = new Set();
  const folded = new Set(readFolded());

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
  const icon = (id, className) => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "ico" + (className ? " " + className : ""));
    const use = document.createElementNS(ns, "use");
    use.setAttribute("href", "#" + id);
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
  function readFolded() {
    try {
      return JSON.parse(localStorage.getItem("magpie-folded") || "[]");
    } catch {
      return [];
    }
  }
  function saveFolded() {
    try {
      localStorage.setItem("magpie-folded", JSON.stringify([...folded]));
    } catch { /* a private window: folds just don't stick */ }
  }

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
    if (source === "library") return "Added here";
    if (source.includes("browser") || item.savedVia === "cloud") return "Browser clipper";
    if (source.includes("stumbleupon") || tags.includes("stumbleupon")) return "StumbleUpon archive";
    if (source.includes("collector") || tags.includes("collector")) return "Magpie Collector";
    if (source) return item.captureSource;
    if (String(item.type || "").toLowerCase() === "bookmark") return "Imported bookmark";
    return "Origin not recorded";
  }

  /* GitHub repos: the owner and name, read from the address. */
  function repoOf(url) {
    const match = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/?(?:[?#].*)?$/i.exec(url || "");
    if (!match || /^(orgs|topics|collections|sponsors|marketplace|settings|features)$/i.test(match[1])) return null;
    return { owner: match[1], name: match[2].replace(/\.git$/i, "") };
  }
  const humanName = (slug) => slug.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  /* "drawio-skill" reads as "Drawio skill"; a bare "skills" borrows its owner. */
  function repoTitle(repo) {
    let name = humanName(repo.name);
    if (!/\s/.test(name) && name.length <= 8) name = humanName(repo.owner) + " " + name;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /* A card title that reads at a glance. The full title stays in search and
     in the side sheet; a title Kelly typed herself is never shortened. */
  function shortTitle(title, repo, edited) {
    if (edited) return { short: title, rest: "" };
    if (repo) {
      const slash = new RegExp("^\\s*" + repo.owner.replace(/[.]/g, "\\.") + "\\s*/\\s*" + repo.name.replace(/[.]/g, "\\.") + "\\s*(?::|\\s[-|]\\s|$)", "i");
      const plain = /^[\w.-]+$/.test(title.trim()) && title.trim().toLowerCase() === repo.name.toLowerCase();
      if (slash.test(title) || plain) {
        return { short: repoTitle(repo), rest: title.replace(slash, "").trim() };
      }
    }
    if (title.length <= 56) return { short: title, rest: "" };
    const cut = /\s(?:[|\u2013\u2014\u00b7-])\s|:\s/.exec(title);
    if (cut && cut.index >= 4 && cut.index <= 60) {
      return { short: title.slice(0, cut.index).trim(), rest: title.slice(cut.index + cut[0].length).trim() };
    }
    return { short: title, rest: "" };
  }

  function prepareOne(item, index) {
    const tags = Array.isArray(item.tags) ? item.tags.map(String).filter((tag) => tag && tag !== "magpie" && !tag.startsWith("desk:")) : [];
    const url = safeHttpUrl(item.url);
    const site = String(item.site || hostOf(url) || "");
    const title = String(item.title || site || item.url || "Untitled");
    const repo = repoOf(url);
    const { short, rest } = shortTitle(title, repo, Boolean(item.editedAt));
    const text = String(item.note || item.description || item.excerpt || rest || "").trim();
    const shelf = shelfOf(item);
    const origin = originOf(item);
    const thumbName = String(item.thumbLocal || "").split("/").pop();
    return {
      id: String(item.id || "i" + index),
      order: index,
      raw: item,
      title,
      short,
      repo,
      url,
      site,
      text,
      tags,
      shelf,
      origin,
      collection: String(item.collection || ""),
      removed: Boolean(item.removed),
      clipped: String(item.clippedAt || ""),
      file: String(item.file || ""),
      transcript: Boolean(item.hasTranscript),
      thumb: thumbName ? "/api/magpie-thumb?name=" + encodeURIComponent(thumbName) : "",
      hay: [title, item.description, item.excerpt, item.note, site, KIND_WORD[shelf], origin, tags.join(" ")]
        .join(" ")
        .toLowerCase(),
    };
  }
  const byId = (id) => ITEMS.find((item) => item.id === id);
  const live = () => ITEMS.filter((item) => !item.removed);

  /* ---------- collections ---------- */
  const colOf = (id) => COLLECTIONS.find((entry) => entry.id === id);
  const childrenOf = (id) => COLLECTIONS.filter((entry) => (entry.parent || "") === id);
  function familyOf(id) {
    const out = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      COLLECTIONS.forEach((entry) => {
        if (entry.parent && out.has(entry.parent) && !out.has(entry.id)) { out.add(entry.id); grew = true; }
      });
    }
    return out;
  }
  /* The tree, flattened in reading order with depth: for menus and selects. */
  function flatTree(parent = "", depth = 0, out = []) {
    childrenOf(parent)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
      .forEach((entry) => {
        out.push({ entry, depth });
        flatTree(entry.id, depth + 1, out);
      });
    return out;
  }
  function placeName(id) {
    if (id === "unsorted" || !id) return "Unsorted";
    if (id === "trash") return "Trash";
    return colOf(id)?.name || "Unsorted";
  }
  function viewName() {
    if (state.col === "") return "Everything";
    return placeName(state.col);
  }
  function countFor(key) {
    const items = live();
    if (key === "") return items.length;
    if (key === "unsorted") return items.filter((item) => !item.collection).length;
    if (key === "trash") return ITEMS.length - items.length;
    const family = familyOf(key);
    return items.filter((item) => family.has(item.collection)).length;
  }

  /* ---------- state in the URL ---------- */
  function readUrl() {
    const params = new URLSearchParams(location.search);
    state.q = params.get("q") || "";
    state.shelf = SHELF[params.get("shelf")] ? params.get("shelf") : "";
    state.tag = params.get("tag") || "";
    state.origin = params.get("origin") || "";
    state.sort = ["new", "old", "az", "site"].includes(params.get("sort")) ? params.get("sort") : "new";
    state.view = params.get("view") === "list" ? "list" : "grid";
    state.col = params.get("col") || "";
  }
  function writeUrl() {
    const params = new URLSearchParams();
    if (state.col) params.set("col", state.col);
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
  function inPlace(item) {
    if (state.col === "trash") return item.removed;
    if (item.removed) return false;
    if (state.col === "") return true;
    if (state.col === "unsorted") return !item.collection;
    return familyOf(state.col).has(item.collection);
  }
  function matches(item, skip) {
    if (!inPlace(item)) return false;
    const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (skip !== "q" && words.some((word) => !item.hay.includes(word))) return false;
    if (skip !== "shelf" && state.shelf && item.shelf !== state.shelf) return false;
    if (skip !== "tag" && state.tag && !item.tags.includes(state.tag)) return false;
    if (skip !== "origin" && state.origin) {
      if (state.origin === NOT_ARCHIVE ? item.origin === ARCHIVE : item.origin !== state.origin) return false;
    }
    return true;
  }
  function sorted(list) {
    const copy = list.slice();
    if (state.sort === "site") copy.sort((a, b) => a.site.replace(/^www\./, "").localeCompare(b.site.replace(/^www\./, ""), "en", { sensitivity: "base" }) || b.clipped.localeCompare(a.clipped));
    else if (state.sort === "az") copy.sort((a, b) => a.short.localeCompare(b.short, "en", { sensitivity: "base" }));
    else if (state.sort === "old") copy.sort((a, b) => a.clipped.localeCompare(b.clipped) || a.order - b.order);
    else copy.sort((a, b) => b.clipped.localeCompare(a.clipped) || b.order - a.order);
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

  /* A GitHub repo has no picture worth showing, so its card is a label: a
     soft color band on a dot grid with the owner, the name set big, the raw
     repo name in mono and a wave edge (Kelly, 2026-11-09: "C's layout with A's big name"). The color
     comes from the repo's own name, so a repo keeps it everywhere. */
  const REPO_COLORS = ["teal", "coral", "honey", "sage"];
  function repoColor(repo) {
    let h = 0;
    for (const ch of (repo.owner + "/" + repo.name).toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return REPO_COLORS[h % REPO_COLORS.length];
  }
  function waveEdge() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 100 12");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "repo-band__edge");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M0 12V7C8 1 17 1 25 7S42 13 50 7 67 1 75 7 92 13 100 7V12Z");
    svg.appendChild(path);
    return svg;
  }
  function buildRepoBand(item, className) {
    const band = el("span", className + " repo-band repo-band--" + repoColor(item.repo));
    const owner = el("span", "repo-band__owner");
    owner.appendChild(icon("i-github", "repo-band__mark"));
    owner.appendChild(el("span", "repo-band__who", item.repo.owner + "/"));
    band.appendChild(owner);
    band.appendChild(el("span", "repo-band__name", item.short));
    band.appendChild(el("span", "repo-band__slug", item.repo.name));
    band.appendChild(waveEdge());
    return band;
  }

  function buildPicture(item, className) {
    if (item.repo) return buildRepoBand(item, className);
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
    const card = el("article", "clip clip--" + item.shelf + (item.repo ? " clip--repo" : ""));
    card.dataset.id = item.id;
    if (selected.has(item.id)) card.classList.add("is-picked");
    if (finePointer && !item.removed) card.draggable = true;

    const check = el("label", "clip__check");
    const box = el("input");
    box.type = "checkbox";
    box.dataset.pick = item.id;
    box.checked = selected.has(item.id);
    check.appendChild(box);
    check.appendChild(el("span", "clip__tick"));
    check.appendChild(el("span", "sr-only", "Select " + item.title));
    card.appendChild(check);

    if (item.url) {
      const face = el("a", "clip__face");
      face.href = item.url;
      face.target = "_blank";
      face.rel = "noopener noreferrer";
      face.tabIndex = -1;
      face.draggable = false;
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
    meta.appendChild(el("span", "kind kind--" + item.shelf, item.repo ? "GitHub" : KIND_WORD[item.shelf]));
    if (item.transcript) meta.appendChild(el("span", "kind kind--transcript", "transcript"));
    const when = dateWord(item.clipped);
    if (when) {
      const time = el("time", null, when);
      time.dateTime = item.clipped.slice(0, 10);
      meta.appendChild(time);
    }
    if (item.site) meta.appendChild(el("span", "clip__site", item.site));
    body.appendChild(meta);

    const heading = el("h3", "clip__title");
    if (item.short !== item.title) heading.title = item.title;
    if (item.url) {
      const a = el("a", null, item.short);
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.draggable = false;
      a.appendChild(el("span", "sr-only", " (opens in a new tab)"));
      heading.appendChild(a);
    } else {
      heading.textContent = item.short;
    }
    body.appendChild(heading);
    if (item.text) body.appendChild(el("p", "clip__text", item.text));
    if (item.tags.length) body.appendChild(buildTags(item, 4));

    const foot = el("div", "clip__foot");
    const where = el("button", "clip__where col--" + (colOf(item.collection)?.color || "none"));
    where.type = "button";
    where.dataset.file = item.id;
    where.setAttribute("aria-haspopup", "menu");
    where.setAttribute("aria-label", (item.removed ? "In Trash" : "In " + placeName(item.collection)) + ". File “" + item.title + "”");
    where.appendChild(el("span", "clip__where-dot"));
    where.appendChild(el("span", "clip__where-name", item.removed ? "Trash" : placeName(item.collection)));
    where.appendChild(icon("i-caret", "clip__where-caret"));
    foot.appendChild(where);
    const read = el("button", "clip__read", item.file ? "Read" : "Open");
    read.type = "button";
    read.dataset.open = item.id;
    read.appendChild(el("span", "sr-only", (item.file ? " the note: " : " the details: ") + item.title));
    foot.appendChild(read);
    body.appendChild(foot);
    card.appendChild(body);
    return card;
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

  /* ---------- the rail: Unsorted, Everything, collections, Trash ---------- */
  function railRow(key, label, options = {}) {
    const row = el("button", "rail-row" + (options.className ? " " + options.className : ""));
    row.type = "button";
    row.dataset.col = key;
    if (state.col === key) row.setAttribute("aria-current", "true");
    if (options.icon) row.appendChild(icon(options.icon, "rail-row__ico"));
    if (options.dot) row.appendChild(el("span", "rail-row__dot"));
    row.appendChild(el("span", "rail-row__name", label));
    const n = countFor(key);
    row.appendChild(el("span", "rail-row__n mono", String(n)));
    if (key === "unsorted" && n) row.classList.add("has-new");
    return row;
  }

  function railBranch(parent) {
    const list = el("ul", parent ? "rail-tree__kids" : "rail-tree");
    flatTree(parent, 0).filter((node) => node.depth === 0).forEach(({ entry }) => {
      const li = el("li", "rail-node");
      const line = el("div", "rail-line col--" + entry.color);
      const kids = childrenOf(entry.id);
      if (kids.length) {
        const twist = el("button", "rail-twist");
        twist.type = "button";
        twist.dataset.twist = entry.id;
        const open = !folded.has(entry.id);
        twist.setAttribute("aria-expanded", String(open));
        twist.setAttribute("aria-label", (open ? "Fold " : "Unfold ") + entry.name);
        twist.appendChild(icon("i-caret"));
        line.appendChild(twist);
      } else {
        line.appendChild(el("span", "rail-twist rail-twist--none"));
      }
      line.appendChild(railRow(entry.id, entry.name, { dot: true }));
      const more = el("button", "rail-more");
      more.type = "button";
      more.dataset.more = entry.id;
      more.setAttribute("aria-haspopup", "menu");
      more.setAttribute("aria-label", "Options for " + entry.name);
      more.appendChild(icon("i-dots"));
      line.appendChild(more);
      li.appendChild(line);
      if (kids.length && !folded.has(entry.id)) li.appendChild(railBranch(entry.id));
      list.appendChild(li);
    });
    return list;
  }

  function renderRail() {
    const top = $("railTop");
    const tree = $("railTree");
    const bottom = $("railBottom");
    if (!top || !tree || !bottom) return;
    top.textContent = "";
    top.appendChild(el("li")).appendChild(railRow("unsorted", "Unsorted", { icon: "i-inbox", className: "rail-row--unsorted" }));
    top.appendChild(el("li")).appendChild(railRow("", "Everything", { icon: "i-all" }));
    tree.textContent = "";
    if (COLLECTIONS.length) tree.appendChild(railBranch(""));
    else tree.appendChild(el("p", "rail-none", "No collections yet. Make one with the plus."));
    bottom.textContent = "";
    bottom.appendChild(el("li")).appendChild(railRow("trash", "Trash", { icon: "i-trash", className: "rail-row--trash" }));
    const toggle = $("railToggle");
    if (toggle) {
      toggle.querySelector(".rail-toggle__name").textContent = viewName();
      toggle.querySelector(".rail-toggle__n").textContent = String(countFor(state.col));
    }
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
    everything.appendChild(el("span", null, "All kinds"));
    everything.appendChild(el("span", "shelf__n mono", String(base.length)));
    row.appendChild(everything);
    SHELVES.forEach((shelf) => {
      const n = counts.get(shelf.key) || 0;
      if (!n && state.shelf !== shelf.key) return;
      const button = el("button", "shelf shelf--" + shelf.key);
      button.type = "button";
      button.dataset.shelf = shelf.key;
      button.setAttribute("aria-pressed", String(state.shelf === shelf.key));
      button.appendChild(shape(shelf.shape, "shelf__shape"));
      button.appendChild(el("span", null, shelf.label));
      button.appendChild(el("span", "shelf__n mono", String(n)));
      row.appendChild(button);
    });
  }

  function computeTags() {
    const counts = new Map();
    live().forEach((item) => item.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    tagTotals = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return counts;
  }

  function renderTags() {
    const row = $("tagRow");
    if (!row) return;
    row.textContent = "";
    const top = tagTotals.slice(0, 12).map(([tag]) => tag);
    if (state.tag && !top.includes(state.tag)) top.unshift(state.tag);
    top.forEach((tag) => {
      const chip = el("button", "chip", "#" + tag);
      chip.type = "button";
      chip.dataset.tag = tag;
      chip.setAttribute("aria-pressed", String(state.tag === tag));
      row.appendChild(chip);
    });
    if (tagTotals.length > 12) {
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
    if (state.origin) pills.push(["origin", originLabel(state.origin)]);
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

  function renderHead() {
    const title = $("placeTitle");
    if (!title) return;
    title.textContent = viewName();
    const entry = colOf(state.col);
    const head = $("placeHead");
    head.className = "lib-place col--" + (entry ? entry.color : state.col === "unsorted" ? "unsorted" : state.col === "trash" ? "trash" : "all");
    const crumbs = $("placeCrumbs");
    crumbs.textContent = "";
    if (entry && entry.parent) {
      const trail = [];
      let cursor = colOf(entry.parent);
      while (cursor && trail.length < 10) { trail.unshift(cursor); cursor = colOf(cursor.parent); }
      trail.forEach((step) => {
        const link = el("button", "lib-place__crumb", step.name);
        link.type = "button";
        link.dataset.col = step.id;
        crumbs.appendChild(link);
        crumbs.appendChild(el("span", "lib-place__sep", "/"));
      });
    }
    const empty = $("emptyTrash");
    if (empty) empty.hidden = !(state.col === "trash" && countFor("trash"));
  }

  function renderGrid() {
    const grid = $("grid");
    if (!grid) return;
    grid.classList.toggle("is-list", state.view === "list");
    grid.classList.toggle("is-selecting", selecting);
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
    const inView = ITEMS.filter((item) => inPlace(item)).length;
    $("resultCount").textContent = filtered
      ? plural(visible.length, "clip") + " of " + inView.toLocaleString("en-US")
      : plural(inView, "clip") + ", " + (state.sort === "az" ? "A to Z" : state.sort === "site" ? "grouped by site" : state.sort === "old" ? "oldest first" : "newest first");

    const empty = $("emptyState");
    empty.hidden = visible.length > 0;
    if (!visible.length) {
      const button = $("emptyButton");
      button.onclick = null;
      if (filtered) {
        $("emptyTitle").textContent = "Nothing matches";
        $("emptyText").textContent = "Try fewer letters, another kind, or clear the filters.";
        button.hidden = false;
        button.textContent = "Clear filters";
        button.dataset.act = "clear";
      } else if (!ITEMS.length) {
        $("emptyTitle").textContent = "Nothing clipped yet";
        $("emptyText").textContent = "Clip a page with the feather, or add a link here, and it lands in Unsorted.";
        button.hidden = false;
        button.textContent = "Add a link";
        button.dataset.act = "add";
      } else if (state.col === "unsorted") {
        $("emptyTitle").textContent = "Unsorted is clear";
        $("emptyText").textContent = "Everything new has a home. New clips will wait here until you file them.";
        button.hidden = false;
        button.textContent = "See everything";
        button.dataset.act = "all";
      } else if (state.col === "trash") {
        $("emptyTitle").textContent = "Trash is empty";
        $("emptyText").textContent = "Clips you throw away wait here, so you can change your mind.";
        button.hidden = true;
      } else {
        $("emptyTitle").textContent = "Nothing in " + viewName() + " yet";
        $("emptyText").textContent = finePointer
          ? "Drag a card onto this collection in the list, or use the button under any card."
          : "Use the button under any card to file it here.";
        button.hidden = false;
        button.textContent = "Go to Unsorted";
        button.dataset.act = "unsorted";
      }
    }
    const surprise = $("surpriseButton");
    if (surprise) surprise.disabled = !live().some((item) => item.file);
  }

  function renderStats() {
    const stats = {
      clips: live().length,
      collections: COLLECTIONS.length,
      unsorted: countFor("unsorted"),
      tags: tagTotals.length,
    };
    document.querySelectorAll("[data-stat]").forEach((node) => {
      node.textContent = (stats[node.dataset.stat] || 0).toLocaleString("en-US");
    });
    const dates = live().map((item) => item.clipped).filter(Boolean).sort();
    const since = $("libSince");
    if (since && dates.length) since.textContent = "since " + dateWord(dates[0]) + ", newest " + dateWord(dates[dates.length - 1]);
  }

  const ARCHIVE = "StumbleUpon archive";
  const NOT_ARCHIVE = "-archive";
  const originLabel = (value) => (value === NOT_ARCHIVE ? "Not the StumbleUpon archive" : value);

  function fillOrigins() {
    const select = $("originSelect");
    if (!select) return;
    const counts = countBy(live(), "origin");
    select.textContent = "";
    const all = el("option", null, "Every origin");
    all.value = "";
    select.appendChild(all);
    if (counts.has(ARCHIVE)) {
      const rest = live().length - counts.get(ARCHIVE);
      const skipArchive = el("option", null, "Skip the StumbleUpon archive (" + rest + ")");
      skipArchive.value = NOT_ARCHIVE;
      select.appendChild(skipArchive);
    }
    [...counts.keys()].sort().forEach((origin) => {
      const option = el("option", null, origin + " (" + counts.get(origin) + ")");
      option.value = origin;
      select.appendChild(option);
    });
    if (state.origin && !counts.has(state.origin) && !(state.origin === NOT_ARCHIVE && counts.has(ARCHIVE))) state.origin = "";
  }

  function render(options = {}) {
    if (state.col && !["unsorted", "trash"].includes(state.col) && !colOf(state.col)) state.col = "";
    visible = sorted(ITEMS.filter((item) => matches(item)));
    if (!options.keepLimit) state.limit = BATCH;
    renderRail();
    renderHead();
    renderShelves();
    renderTags();
    if (!$("allTags").hidden) renderAllTags();
    renderActive();
    renderGrid();
    renderSelectBar();
    $("originSelect").value = state.origin;
    $("sortSelect").value = state.sort;
    document.querySelectorAll(".lib-view button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
    });
    writeUrl();
  }

  /* After the data changed: counts, tags and origins move too. */
  function refresh(options = {}) {
    computeTags();
    renderStats();
    fillOrigins();
    render({ keepLimit: true, ...options });
  }

  function scrollToResults() {
    const bar = document.querySelector(".lib-bar");
    const results = $("results");
    if (!results) return;
    const top = results.getBoundingClientRect().top + window.scrollY - (bar && getComputedStyle(bar).position === "sticky" ? bar.offsetHeight : 0) + 8;
    if (window.scrollY > top + 40) window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }

  function setTag(tag) {
    state.tag = state.tag === tag ? "" : tag;
    render();
    scrollToResults();
  }

  function goTo(col) {
    state.col = col;
    selected.clear();
    closeRailOnPhone();
    render();
    scrollToResults();
  }

  /* ---------- saving changes ---------- */
  async function send(ops) {
    const response = await fetch("/api/magpie-update", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ops }),
    });
    if (response.status === 401) { goToLogin(); throw new Error("signed out"); }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Magpie couldn’t save that change.");
    return body;
  }

  /* Takes the server's answer as the truth for the clips it touched. */
  function absorb(answer) {
    if (Array.isArray(answer.collections)) COLLECTIONS = answer.collections;
    (answer.items || []).forEach((raw) => {
      const index = ITEMS.findIndex((item) => item.id === raw.id);
      if (index >= 0) ITEMS[index] = prepareOne(raw, ITEMS[index].order);
    });
    if (Array.isArray(answer.removedIds) && answer.removedIds.length) {
      const gone = new Set(answer.removedIds);
      ITEMS = ITEMS.filter((item) => !gone.has(item.id));
    }
  }

  /* Change it here at once, save it, and put it back if the save fails. */
  async function change(ops, local, message, undoOps) {
    const before = { items: ITEMS.map((item) => ({ ...item, raw: { ...item.raw } })), collections: COLLECTIONS.map((entry) => ({ ...entry })) };
    if (local) local();
    refresh();
    try {
      const answer = await send(ops);
      absorb(answer);
      refresh();
      if (message) toast(message, undoOps ? () => change(typeof undoOps === "function" ? undoOps() : undoOps, null, "Undone") : null);
      return answer;
    } catch (error) {
      ITEMS = before.items;
      COLLECTIONS = before.collections;
      refresh();
      toast(error.message || "Magpie couldn’t save that change.", null, true);
      return null;
    }
  }

  function setRaw(item, patch) {
    Object.assign(item.raw, patch);
    const fresh = prepareOne(item.raw, item.order);
    Object.assign(item, fresh);
  }

  function moveClips(ids, target) {
    const items = ids.map(byId).filter(Boolean);
    if (!items.length) return;
    const back = new Map();
    items.forEach((item) => {
      const from = item.removed ? "trash" : item.collection;
      if (!back.has(from)) back.set(from, []);
      back.get(from).push(item.id);
    });
    const undo = [...back.entries()].map(([from, list]) => (from === "trash" ? { op: "trash", ids: list } : { op: "move", ids: list, collection: from }));
    const where = target ? colOf(target)?.name : "Unsorted";
    change(
      [{ op: "move", ids: items.map((item) => item.id), collection: target }],
      () => items.forEach((item) => { setRaw(item, { collection: target, removed: undefined }); delete item.raw.removed; item.removed = false; }),
      (items.length === 1 ? "Filed in " : plural(items.length, "clip") + " filed in ") + where,
      undo,
    );
  }

  function trashClips(ids) {
    const items = ids.map(byId).filter(Boolean);
    if (!items.length) return;
    const stamp = new Date().toISOString();
    change(
      [{ op: "trash", ids: items.map((item) => item.id) }],
      () => items.forEach((item) => setRaw(item, { removed: stamp })),
      (items.length === 1 ? "Moved to Trash" : plural(items.length, "clip") + " moved to Trash"),
      [{ op: "restore", ids: items.map((item) => item.id) }],
    );
  }

  function restoreClips(ids) {
    const items = ids.map(byId).filter(Boolean);
    change(
      [{ op: "restore", ids: items.map((item) => item.id) }],
      () => items.forEach((item) => { delete item.raw.removed; setRaw(item, {}); }),
      (items.length === 1 ? "Restored to " + placeName(items[0].collection) : plural(items.length, "clip") + " restored"),
      [{ op: "trash", ids: items.map((item) => item.id) }],
    );
  }

  function purgeClips(ids) {
    const items = ids.map(byId).filter((item) => item && item.removed);
    if (!items.length) return;
    change(
      [{ op: "purge", ids: items.map((item) => item.id) }],
      () => { const gone = new Set(items.map((item) => item.id)); ITEMS = ITEMS.filter((item) => !gone.has(item.id)); },
      items.length === 1 ? "Deleted for good" : plural(items.length, "clip") + " deleted for good",
    );
  }

  /* ---------- the toast ---------- */
  let toastTimer = 0;
  function toast(message, undo, isError) {
    const box = $("toast");
    if (!box) return;
    clearTimeout(toastTimer);
    box.className = "lib-toast" + (isError ? " is-error" : "");
    box.textContent = "";
    box.appendChild(el("span", "lib-toast__text", message));
    if (undo) {
      const button = el("button", "lib-toast__undo", "Undo");
      button.type = "button";
      button.addEventListener("click", () => { box.hidden = true; undo(); }, { once: true });
      box.appendChild(button);
    }
    box.hidden = false;
    toastTimer = setTimeout(() => { box.hidden = true; }, undo ? 7000 : 4000);
  }

  /* ---------- one small menu, reused: file a clip, a collection's options ---------- */
  let menuAnchor = null;
  function closeMenu(returnFocus) {
    const menu = $("popMenu");
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    menu.textContent = "";
    if (menuAnchor) menuAnchor.setAttribute("aria-expanded", "false");
    if (returnFocus && menuAnchor && document.contains(menuAnchor)) menuAnchor.focus({ preventScroll: true });
    menuAnchor = null;
  }
  function placeMenu(anchor) {
    const menu = $("popMenu");
    const box = anchor.getBoundingClientRect();
    const width = Math.min(300, window.innerWidth - 24);
    menu.style.width = width + "px";
    let left = Math.min(Math.max(12, box.left), window.innerWidth - width - 12);
    menu.style.left = left + "px";
    const below = window.innerHeight - box.bottom;
    menu.style.maxHeight = "";
    const height = Math.min(menu.scrollHeight, window.innerHeight * 0.7);
    if (below < height + 16 && box.top > below) {
      menu.style.top = Math.max(12, box.top - height - 8) + "px";
    } else {
      menu.style.top = Math.min(box.bottom + 8, window.innerHeight - height - 12) + "px";
    }
    menu.style.maxHeight = Math.round(window.innerHeight * 0.7) + "px";
  }
  function openMenu(anchor, build, label) {
    const menu = $("popMenu");
    if (!menu) return;
    if (menuAnchor === anchor && !menu.hidden) return closeMenu(true);
    closeMenu();
    menuAnchor = anchor;
    anchor.setAttribute("aria-expanded", "true");
    menu.setAttribute("aria-label", label);
    menu.textContent = "";
    build(menu);
    menu.hidden = false;
    placeMenu(anchor);
    const first = menu.querySelector("[aria-checked='true'], button:not(:disabled), input");
    if (first) first.focus({ preventScroll: true });
  }
  function menuItem(text, act, options = {}) {
    const button = el("button", "menu-item" + (options.className ? " " + options.className : ""));
    button.type = "button";
    button.setAttribute("role", options.radio ? "menuitemradio" : "menuitem");
    if (options.radio) button.setAttribute("aria-checked", String(Boolean(options.checked)));
    if (options.depth) button.style.setProperty("--depth", options.depth);
    if (options.color) button.classList.add("col--" + options.color);
    if (options.dot) button.appendChild(el("span", "menu-item__dot"));
    if (options.icon) button.appendChild(icon(options.icon, "menu-item__ico"));
    button.appendChild(el("span", "menu-item__text", text));
    if (options.checked) button.appendChild(icon("i-check", "menu-item__check"));
    button.addEventListener("click", (event) => { event.stopPropagation(); act(button); });
    return button;
  }
  const menuRule = () => { const hr = el("hr", "menu-rule"); hr.setAttribute("role", "separator"); return hr; };

  /* An inline name box inside the menu (new collection, rename). */
  function menuNameBox(menu, { placeholder, value = "", submit, cancel }) {
    const form = el("form", "menu-name");
    const input = el("input");
    input.type = "text";
    input.maxLength = 60;
    input.placeholder = placeholder;
    input.value = value;
    input.setAttribute("aria-label", placeholder);
    const ok = el("button", "menu-name__ok", "Save");
    ok.type = "submit";
    form.appendChild(input);
    form.appendChild(ok);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) return input.focus();
      submit(name);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(); }
    });
    menu.appendChild(form);
    input.focus();
    input.select();
    return form;
  }

  function fileMenu(anchor, ids) {
    const items = ids.map(byId).filter(Boolean);
    if (!items.length) return;
    const one = items.length === 1 ? items[0] : null;
    const current = one ? (one.removed ? "trash" : one.collection) : null;
    openMenu(anchor, (menu) => {
      menu.appendChild(el("p", "menu-head", one ? "File in" : "File " + plural(items.length, "clip") + " in"));
      menu.appendChild(menuItem("Unsorted", () => { closeMenu(true); moveClips(ids, ""); }, { radio: true, checked: current === "", icon: "i-inbox" }));
      flatTree().forEach(({ entry, depth }) => {
        menu.appendChild(menuItem(entry.name, () => { closeMenu(true); moveClips(ids, entry.id); }, {
          radio: true, checked: current === entry.id, depth, color: entry.color, dot: true,
        }));
      });
      const add = menuItem("New collection…", () => {
        add.remove();
        menuNameBox(menu, {
          placeholder: "Name the new collection",
          submit: async (name) => {
            closeMenu(true);
            const answer = await change([{ op: "collection.create", name }], null, null);
            const id = answer && answer.created && answer.created[0];
            if (id) moveClips(ids, id);
          },
          cancel: () => closeMenu(true),
        });
        placeMenu(anchor);
      }, { icon: "i-plus", className: "menu-item--add" });
      menu.appendChild(add);
      menu.appendChild(menuRule());
      if (items.every((item) => item.removed)) {
        menu.appendChild(menuItem("Restore", () => { closeMenu(true); restoreClips(ids); }, { icon: "i-undo" }));
        menu.appendChild(menuItem("Delete for good", () => { closeMenu(true); purgeClips(ids); }, { icon: "i-trash", className: "menu-item--danger" }));
      } else {
        menu.appendChild(menuItem("Move to Trash", () => { closeMenu(true); trashClips(ids); }, { icon: "i-trash", className: "menu-item--danger" }));
      }
    }, one ? "File “" + one.title + "”" : "File the selected clips");
  }

  function collectionMenu(anchor, id) {
    const entry = colOf(id);
    if (!entry) return;
    openMenu(anchor, (menu) => {
      menu.appendChild(el("p", "menu-head", entry.name));
      menu.appendChild(menuItem("Rename", () => {
        menu.textContent = "";
        menuNameBox(menu, {
          placeholder: "Rename " + entry.name,
          value: entry.name,
          submit: (name) => {
            closeMenu(true);
            if (name === entry.name) return;
            const old = entry.name;
            change([{ op: "collection.update", id, name }], () => { entry.name = name; }, "Renamed to " + name, [{ op: "collection.update", id, name: old }]);
          },
          cancel: () => closeMenu(true),
        });
      }, { icon: "i-pen" }));
      menu.appendChild(menuItem("New collection inside", () => {
        menu.textContent = "";
        menuNameBox(menu, {
          placeholder: "Name it (inside " + entry.name + ")",
          submit: (name) => {
            closeMenu(true);
            folded.delete(id);
            saveFolded();
            change([{ op: "collection.create", name, parent: id }], null, name + " is inside " + entry.name);
          },
          cancel: () => closeMenu(true),
        });
      }, { icon: "i-plus" }));
      if (entry.parent) {
        menu.appendChild(menuItem("Move to the top level", () => {
          closeMenu(true);
          const old = entry.parent;
          change([{ op: "collection.update", id, parent: "" }], () => { entry.parent = ""; }, entry.name + " is at the top level", [{ op: "collection.update", id, parent: old }]);
        }, { icon: "i-up" }));
      }
      const swatches = el("div", "menu-swatches");
      swatches.setAttribute("role", "group");
      swatches.setAttribute("aria-label", "Color");
      COLORS.forEach((color) => {
        const swatch = el("button", "menu-swatch col--" + color);
        swatch.type = "button";
        swatch.setAttribute("aria-label", COLOR_NAME[color]);
        swatch.setAttribute("aria-pressed", String(entry.color === color));
        swatch.addEventListener("click", (event) => {
          event.stopPropagation();
          closeMenu(true);
          if (entry.color === color) return;
          change([{ op: "collection.update", id, color }], () => { entry.color = color; }, null);
        });
        swatches.appendChild(swatch);
      });
      menu.appendChild(swatches);
      menu.appendChild(menuRule());
      const del = menuItem("Delete collection", () => {
        menu.textContent = "";
        const n = countFor(id);
        menu.appendChild(el("p", "menu-confirm", "Delete “" + entry.name + "”? " +
          (n ? "Its " + plural(n, "clip") + " go back to Unsorted" : "It’s empty") +
          (childrenOf(id).length ? ", and the collections inside it move up a level." : ".")));
        const row = el("div", "menu-confirm__row");
        const yes = el("button", "btn btn--sm menu-confirm__yes", "Delete");
        yes.type = "button";
        yes.addEventListener("click", () => {
          closeMenu();
          if (state.col === id) state.col = entry.parent || "";
          change([{ op: "collection.delete", id }], () => {
            COLLECTIONS.forEach((other) => { if (other.parent === id) other.parent = entry.parent; });
            ITEMS.forEach((item) => { if (item.collection === id) setRaw(item, { collection: "" }); });
            COLLECTIONS = COLLECTIONS.filter((other) => other.id !== id);
          }, "Deleted “" + entry.name + "”");
          $("railTree").focus?.();
        });
        const no = el("button", "btn btn--sm btn--line", "Keep it");
        no.type = "button";
        no.addEventListener("click", () => closeMenu(true));
        row.appendChild(yes);
        row.appendChild(no);
        menu.appendChild(row);
        no.focus();
      }, { icon: "i-trash", className: "menu-item--danger" });
      menu.appendChild(del);
    }, "Options for " + entry.name);
  }

  function newCollection(anchor) {
    openMenu(anchor, (menu) => {
      menu.appendChild(el("p", "menu-head", "New collection"));
      menuNameBox(menu, {
        placeholder: "Name it, like Logos or Recipes",
        submit: async (name) => {
          closeMenu(true);
          const answer = await change([{ op: "collection.create", name }], null, null);
          const id = answer && answer.created && answer.created[0];
          if (id) {
            toast("Made " + name + ". Drag cards onto it, or file them from the card.");
            goTo(id);
          }
        },
        cancel: () => closeMenu(true),
      });
    }, "New collection");
  }

  /* ---------- picking several ---------- */
  function setSelecting(on) {
    selecting = on;
    if (!on) selected.clear();
    const button = $("selectButton");
    if (button) {
      button.setAttribute("aria-pressed", String(on));
      button.lastChild.textContent = on ? "Done" : "Select";
    }
    renderGrid();
    renderSelectBar();
  }
  function togglePick(id, on) {
    if (on === undefined) on = !selected.has(id);
    if (on) selected.add(id); else selected.delete(id);
    if (selected.size && !selecting) setSelecting(true);
    const card = document.querySelector('.clip[data-id="' + CSS.escape(id) + '"]');
    if (card) {
      card.classList.toggle("is-picked", on);
      const box = card.querySelector("input[data-pick]");
      if (box) box.checked = on;
    }
    renderSelectBar();
  }
  function renderSelectBar() {
    const bar = $("selectBar");
    if (!bar) return;
    [...selected].forEach((id) => { if (!visible.some((item) => item.id === id)) selected.delete(id); });
    bar.hidden = !selecting;
    $("selectCount").textContent = selected.size ? plural(selected.size, "clip") + " picked" : "Pick clips to file";
    const none = !selected.size;
    $("selectMove").disabled = none;
    $("selectTrash").disabled = none;
    const inTrash = state.col === "trash";
    $("selectTrash").lastChild.textContent = inTrash ? "Restore" : "Trash";
    $("selectAll").textContent = selected.size && selected.size === Math.min(visible.length, state.limit) ? "Pick none" : "Pick all " + Math.min(visible.length, state.limit);
  }

  /* ---------- dragging a card onto a collection ---------- */
  function wireDrag() {
    const grid = $("grid");
    const rail = $("rail");
    let dragging = [];
    grid.addEventListener("dragstart", (event) => {
      const card = event.target.closest && event.target.closest(".clip");
      if (!card) return;
      const id = card.dataset.id;
      dragging = selected.has(id) && selected.size > 1 ? [...selected] : [id];
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", byId(id)?.url || id);
      document.body.classList.add("is-dragging");
      card.classList.add("is-lifted");
      const ghost = $("dragGhost");
      if (ghost) {
        ghost.textContent = dragging.length === 1 ? (byId(id)?.title || "1 clip") : plural(dragging.length, "clip");
        event.dataTransfer.setDragImage(ghost, 20, 20);
      }
    });
    grid.addEventListener("dragend", (event) => {
      document.body.classList.remove("is-dragging");
      const card = event.target.closest && event.target.closest(".clip");
      if (card) card.classList.remove("is-lifted");
      rail.querySelectorAll(".is-drop").forEach((node) => node.classList.remove("is-drop"));
      dragging = [];
    });
    rail.addEventListener("dragover", (event) => {
      const row = event.target.closest && event.target.closest(".rail-row");
      if (!row || !dragging.length || row.dataset.col === "") return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      rail.querySelectorAll(".is-drop").forEach((node) => { if (node !== row) node.classList.remove("is-drop"); });
      row.classList.add("is-drop");
    });
    rail.addEventListener("dragleave", (event) => {
      const row = event.target.closest && event.target.closest(".rail-row");
      if (row && !row.contains(event.relatedTarget)) row.classList.remove("is-drop");
    });
    rail.addEventListener("drop", (event) => {
      const row = event.target.closest && event.target.closest(".rail-row");
      if (!row || !dragging.length) return;
      event.preventDefault();
      row.classList.remove("is-drop");
      const target = row.dataset.col;
      const ids = dragging.slice();
      dragging = [];
      if (target === "trash") trashClips(ids);
      else moveClips(ids, target === "unsorted" ? "" : target);
      if (selecting) setSelecting(false);
    });
  }

  /* ---------- the phone: the rail folds into one button ---------- */
  function closeRailOnPhone() {
    const toggle = $("railToggle");
    if (!toggle || getComputedStyle(toggle).display === "none") return;
    toggle.setAttribute("aria-expanded", "false");
    $("rail").classList.remove("is-open");
  }

  function obsidianLink(file) {
    return "obsidian://open?vault=" + encodeURIComponent(VAULT_NAME) + "&file=" + encodeURIComponent(file.replace(/\.md$/, ""));
  }

  function fillPlaceSelect(select, value, options = {}) {
    if (!select) return;
    select.textContent = "";
    const unsorted = el("option", null, "Unsorted");
    unsorted.value = "";
    select.appendChild(unsorted);
    flatTree().forEach(({ entry, depth }) => {
      const option = el("option", null, " ".repeat(depth) + entry.name);
      option.value = entry.id;
      select.appendChild(option);
    });
    if (options.trash) {
      const trash = el("option", null, "Trash");
      trash.value = "trash";
      select.appendChild(trash);
    }
    select.value = value;
  }

  function fillEdit(item) {
    fillPlaceSelect($("editCol"), item.removed ? "trash" : item.collection, { trash: item.removed });
    $("editTitle").value = item.title;
    $("editTags").value = item.tags.join(", ");
    $("editNote").value = String(item.raw.note || "");
    $("editMsg").textContent = "";
    $("editTrash").textContent = item.removed ? "Restore" : "Move to Trash";
  }

  async function showNote(item) {
    const sheet = $("sheet");
    const body = $("sheetBody");
    const ticket = ++noteRequest;
    $("sheetTitle").textContent = item.title;
    const meta = $("sheetMeta");
    meta.textContent = "";
    meta.appendChild(el("span", "kind kind--" + item.shelf, item.repo ? "GitHub" : KIND_WORD[item.shelf]));
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
    const obsidian = $("sheetObsidian");
    obsidian.hidden = !item.file;
    if (item.file) obsidian.href = obsidianLink(item.file);
    const tags = $("sheetTags");
    tags.replaceWith(Object.assign(buildTags(item), { id: "sheetTags", className: "clip__tags sheet__tags" }));
    fillEdit(item);

    $("sheetPos").textContent = (sheetIndex + 1) + " of " + sheetList.length;
    $("sheetPrev").disabled = sheetIndex <= 0;
    $("sheetNext").disabled = sheetIndex >= sheetList.length - 1;
    $("sheetScroll").scrollTop = 0;

    if (!sheet.open) {
      if (typeof sheet.showModal === "function") sheet.showModal();
      else sheet.setAttribute("open", "");
      document.documentElement.classList.add("sheet-open");
    }
    if (!item.file) {
      body.className = "md";
      body.innerHTML = "";
      if (item.raw.description) body.appendChild(el("blockquote", null, item.raw.description));
      body.appendChild(el("p", "md__none", "No saved copy of this page, just the link. Clip it with the feather to keep the text too."));
      return;
    }
    body.className = "md is-loading";
    body.innerHTML = "<p>Reading the saved note…</p>";
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
    sheetList = visible.slice();
    sheetIndex = sheetList.findIndex((item) => item.id === id);
    if (sheetIndex < 0) {
      const item = byId(id);
      if (!item) return;
      sheetList = [item];
      sheetIndex = 0;
    }
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
  const sheetItem = () => {
    const shown = sheetList[sheetIndex];
    return shown ? byId(shown.id) || shown : null;
  };

  /* ---------- dialogs: add a link, connect the feather ---------- */
  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  function closeDialog(dialog) {
    if (!dialog) return;
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function openAdd(prefill = {}) {
    const dialog = $("addDialog");
    $("addUrl").value = prefill.url || "";
    $("addNote").value = prefill.note || "";
    const here = colOf(state.col) ? state.col : "";
    fillPlaceSelect($("addCol"), here);
    $("addMsg").textContent = "";
    $("addMsg").className = "pop__msg";
    $("addSave").disabled = false;
    $("addSave").textContent = "Save it";
    openDialog(dialog);
    (prefill.url ? $("addNote") : $("addUrl")).focus();
  }

  async function saveAdd(event) {
    event.preventDefault();
    const typed = $("addUrl").value.trim();
    const absolute = (value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
      } catch {
        return "";
      }
    };
    const url = /\s/.test(typed) ? "" : absolute(typed) || absolute("https://" + typed.replace(/^\/+/, ""));
    const msg = $("addMsg");
    if (!url || !/\.[a-z]{2,}$/i.test(hostOf(url))) {
      msg.textContent = "That doesn’t look like a web address. Paste the whole link.";
      msg.className = "pop__msg is-error";
      $("addUrl").focus();
      return;
    }
    const save = $("addSave");
    save.disabled = true;
    save.textContent = "Saving…";
    msg.className = "pop__msg";
    msg.textContent = "Reading the page for its title and picture…";
    try {
      const response = await fetch("/api/magpie-save", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, note: $("addNote").value.trim(), collection: $("addCol").value, captureSource: "library" }),
      });
      if (response.status === 401) return goToLogin();
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.item) throw new Error(body.error || "Magpie couldn’t save that just now.");
      const index = ITEMS.findIndex((item) => item.id === body.item.id);
      if (index >= 0) ITEMS[index] = prepareOne(body.item, ITEMS[index].order);
      else ITEMS.push(prepareOne(body.item, ITEMS.length ? Math.max(...ITEMS.map((item) => item.order)) + 1 : 0));
      closeDialog($("addDialog"));
      refresh();
      const place = placeName(body.item.collection);
      toast((body.existed ? "Already saved, updated it in " : "Saved to ") + place, null);
      const card = document.querySelector('.clip[data-id="' + CSS.escape(body.item.id) + '"]');
      if (card) {
        card.classList.add("is-new");
        card.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      } else if (!body.existed && state.col !== "" && state.col !== body.item.collection && !(state.col === "unsorted" && !body.item.collection)) {
        toast("Saved to " + place + ". Open " + place + " to see it.");
      }
    } catch (error) {
      msg.textContent = error.message;
      msg.className = "pop__msg is-error";
      save.disabled = false;
      save.textContent = "Try again";
    }
  }

  async function openConnect() {
    const dialog = $("connectDialog");
    const field = $("connectKey");
    field.value = "Fetching your key…";
    $("connectCopy").disabled = true;
    const bookmarklet = $("connectBookmarklet");
    if (bookmarklet) {
      bookmarklet.href = "javascript:location.href='" + location.origin + "/brain/gallery.html?add='+encodeURIComponent(location.href)";
    }
    openDialog(dialog);
    try {
      const response = await fetch("/api/magpie-session?key=1", { credentials: "same-origin", cache: "no-store" });
      const body = await response.json();
      if (!body.authenticated) return goToLogin();
      if (!body.clipKey) throw new Error("no key");
      field.value = body.clipKey;
      $("connectCopy").disabled = false;
      $("connectSite").textContent = location.origin;
    } catch {
      field.value = "The key didn’t load. Close this and try again.";
    }
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

    /* the rail */
    const rail = $("rail");
    rail.addEventListener("click", (event) => {
      const twist = event.target.closest("button[data-twist]");
      if (twist) {
        const id = twist.dataset.twist;
        if (folded.has(id)) folded.delete(id); else folded.add(id);
        saveFolded();
        renderRail();
        const again = rail.querySelector('button[data-twist="' + CSS.escape(id) + '"]');
        if (again) again.focus({ preventScroll: true });
        return;
      }
      const more = event.target.closest("button[data-more]");
      if (more) return collectionMenu(more, more.dataset.more);
      const row = event.target.closest("button[data-col]");
      if (row) {
        goTo(row.dataset.col);
        const again = rail.querySelector('.rail-row[data-col="' + CSS.escape(row.dataset.col) + '"]');
        if (again && getComputedStyle($("railToggle")).display === "none") again.focus({ preventScroll: true });
      }
    });
    $("newCollection").addEventListener("click", (event) => newCollection(event.currentTarget));
    $("railToggle").addEventListener("click", (event) => {
      const open = event.currentTarget.getAttribute("aria-expanded") !== "true";
      event.currentTarget.setAttribute("aria-expanded", String(open));
      rail.classList.toggle("is-open", open);
    });
    $("connectButton").addEventListener("click", openConnect);
    $("placeCrumbs").addEventListener("click", (event) => {
      const crumb = event.target.closest("button[data-col]");
      if (crumb) goTo(crumb.dataset.col);
    });
    $("emptyTrash").addEventListener("click", () => {
      const ids = ITEMS.filter((item) => item.removed).map((item) => item.id);
      if (ids.length) purgeClips(ids);
    });

    /* the cards */
    $("grid").addEventListener("click", (event) => {
      const pick = event.target.closest("input[data-pick]");
      if (pick) { togglePick(pick.dataset.pick, pick.checked); return; }
      if (event.target.closest(".clip__check")) return;
      const tag = event.target.closest("button[data-tag]");
      if (tag) return setTag(tag.dataset.tag);
      const file = event.target.closest("button[data-file]");
      if (file) {
        const id = file.dataset.file;
        return fileMenu(file, selected.has(id) && selected.size > 1 ? [...selected] : [id]);
      }
      const open = event.target.closest("button[data-open]");
      if (open) return openSheet(open.dataset.open, open);
      if (selecting) {
        const card = event.target.closest(".clip");
        if (card && !event.target.closest("a")) { event.preventDefault(); togglePick(card.dataset.id); }
        else if (card && event.target.closest("a")) { event.preventDefault(); togglePick(card.dataset.id); }
      }
    });

    $("activeFilters").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-clear]");
      if (!button) return;
      const key = button.dataset.clear;
      if (key === "all" || key === "q") { search.value = ""; state.q = ""; }
      if (key === "all") { state.shelf = ""; state.tag = ""; state.origin = ""; }
      else if (key !== "q") state[key] = "";
      render();
      search.focus({ preventScroll: true });
    });

    $("emptyButton").addEventListener("click", (event) => {
      const act = event.currentTarget.dataset.act;
      if (act === "clear") {
        search.value = "";
        Object.assign(state, { q: "", shelf: "", tag: "", origin: "" });
        render();
        search.focus({ preventScroll: true });
      } else if (act === "add") openAdd();
      else if (act === "all") goTo("");
      else if (act === "unsorted") goTo("unsorted");
    });

    $("moreButton").addEventListener("click", () => {
      const firstNew = state.limit;
      state.limit += BATCH;
      renderGrid();
      const card = $("grid").children[firstNew];
      const link = card && (card.querySelector(".clip__title a") || card.querySelector("button"));
      if (link) link.focus({ preventScroll: true });
    });

    $("surpriseButton").addEventListener("click", (event) => {
      const pool = live().filter((item) => item.file);
      if (!pool.length) return;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      sheetList = [pick];
      sheetIndex = 0;
      sheetReturn = event.currentTarget;
      showNote(pick);
    });
    document.querySelectorAll("[data-go]").forEach((node) => node.addEventListener("click", () => goTo(node.dataset.go)));
    document.querySelectorAll("[data-add]").forEach((node) => node.addEventListener("click", () => openAdd()));

    /* picking several */
    $("selectButton").addEventListener("click", () => setSelecting(!selecting));
    $("selectDone").addEventListener("click", () => setSelecting(false));
    $("selectAll").addEventListener("click", () => {
      const shown = visible.slice(0, state.limit);
      const all = selected.size === shown.length && shown.length;
      selected.clear();
      if (!all) shown.forEach((item) => selected.add(item.id));
      renderGrid();
      renderSelectBar();
    });
    $("selectMove").addEventListener("click", (event) => { if (selected.size) fileMenu(event.currentTarget, [...selected]); });
    $("selectTrash").addEventListener("click", () => {
      if (!selected.size) return;
      const ids = [...selected];
      if (state.col === "trash") restoreClips(ids); else trashClips(ids);
      setSelecting(false);
    });

    /* the shared menu closes on a click elsewhere, Escape, or a scroll */
    document.addEventListener("click", (event) => {
      const menu = $("popMenu");
      if (!menu || menu.hidden) return;
      if (menu.contains(event.target) || (menuAnchor && menuAnchor.contains(event.target))) return;
      closeMenu();
    });
    $("popMenu").addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); closeMenu(true); return; }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const items = [...$("popMenu").querySelectorAll("button:not(:disabled)")];
      const at = items.indexOf(document.activeElement);
      if (at < 0) return;
      event.preventDefault();
      const next = items[(at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
      next.focus();
    });
    window.addEventListener("resize", () => closeMenu());
    window.addEventListener("scroll", () => { const menu = $("popMenu"); if (menu && !menu.hidden && !menu.contains(document.activeElement)) closeMenu(); }, { passive: true });

    /* the sheet */
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
        const card = item && document.querySelector('.clip[data-id="' + CSS.escape(item.id) + '"] .clip__read');
        if (card) card.focus({ preventScroll: true });
      }
    });
    sheet.addEventListener("keydown", (event) => {
      if (event.target.closest && event.target.closest("input, textarea, select")) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); stepSheet(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); stepSheet(1); }
    });
    $("sheetTags").parentElement.addEventListener("click", (event) => {
      const tag = event.target.closest(".sheet__tags button[data-tag]");
      if (!tag) return;
      closeSheet();
      setTag(tag.dataset.tag);
    });
    $("editCol").addEventListener("change", (event) => {
      const item = sheetItem();
      if (!item) return;
      const target = event.target.value;
      if (target === "trash") return;
      moveClips([item.id], target);
      $("editTrash").textContent = "Move to Trash";
    });
    $("sheetEdit").addEventListener("submit", async (event) => {
      event.preventDefault();
      const item = sheetItem();
      if (!item) return;
      const title = $("editTitle").value.trim() || item.title;
      const tags = $("editTags").value;
      const note = $("editNote").value;
      const old = { title: item.title, tags: item.tags.join(", "), note: String(item.raw.note || "") };
      $("editMsg").textContent = "Saving…";
      const answer = await change(
        [{ op: "edit", id: item.id, title, tags, note }],
        () => setRaw(item, {
          title,
          note,
          tags: ["magpie", ...(item.raw.tags || []).filter((tag) => String(tag).startsWith("desk:")), ...tags.split(",").map((tag) => tag.trim().replace(/^#/, "").toLowerCase().replace(/\s+/g, "-")).filter(Boolean)],
        }),
        "Saved your changes",
        [{ op: "edit", id: item.id, ...old }],
      );
      $("editMsg").textContent = answer ? "Saved." : "";
      if (answer) {
        const fresh = byId(item.id);
        if (fresh) {
          $("sheetTitle").textContent = fresh.title;
          $("sheetTags").replaceWith(Object.assign(buildTags(fresh), { id: "sheetTags", className: "clip__tags sheet__tags" }));
        }
      }
    });
    $("editTrash").addEventListener("click", () => {
      const item = sheetItem();
      if (!item) return;
      if (item.removed) restoreClips([item.id]);
      else { trashClips([item.id]); closeSheet(); }
      const fresh = byId(item.id);
      if (fresh) fillEdit(fresh);
    });

    /* dialogs */
    $("addForm").addEventListener("submit", saveAdd);
    $("addCancel").addEventListener("click", () => closeDialog($("addDialog")));
    $("connectClose").addEventListener("click", () => closeDialog($("connectDialog")));
    $("connectCopy").addEventListener("click", async () => {
      const field = $("connectKey");
      try {
        await navigator.clipboard.writeText(field.value);
      } catch {
        field.select();
        document.execCommand && document.execCommand("copy");
      }
      $("connectCopy").textContent = "Copied";
      setTimeout(() => { $("connectCopy").textContent = "Copy"; }, 1800);
    });
    ["addDialog", "connectDialog"].forEach((id) => {
      const dialog = $(id);
      dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(dialog); });
    });

    document.addEventListener("keydown", (event) => {
      const active = document.activeElement;
      const typing = active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName));
      if (event.key === "Escape" && selecting && !typing && !document.querySelector("dialog[open]") && $("popMenu").hidden) {
        setSelecting(false);
        return;
      }
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (typing || document.querySelector("dialog[open]")) return;
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

    wireDrag();
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
    const params = new URLSearchParams(location.search);
    const adding = { url: safeHttpUrl(params.get("add") || ""), note: params.get("note") || "" };
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
    const raw = Array.isArray(payload && payload.items) ? payload.items.filter((item) => item && typeof item === "object") : [];
    ITEMS = raw.map(prepareOne);
    COLLECTIONS = Array.isArray(payload.collections) ? payload.collections : [];
    const counts = computeTags();
    if (state.tag && !counts.has(state.tag)) state.tag = "";

    const grid = $("grid");
    grid.classList.remove("is-loading");
    grid.removeAttribute("aria-busy");
    renderStats();
    fillOrigins();
    wire();
    render();
    if (adding.url) openAdd(adding);
  }

  start();
})();
