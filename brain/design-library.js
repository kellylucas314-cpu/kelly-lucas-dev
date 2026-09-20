// The private design library page. This file holds no library content: the
// catalog and every picture arrive from /api/magpie-design, which only
// answers a signed-in session.

const FILES = "/api/magpie-design?file=";
const STUDY_BASE = "/brain/design-library/files/";
const STUDY_PATH = /^studies\/[A-Za-z0-9][A-Za-z0-9._/-]*\.html(?:\?[A-Za-z0-9=&_-]*)?$/;
const GUIDE_SEEN = "design-library-guide-seen";
const FIRST_REFERENCES = 12;
const FIRST_IDEAS = 6;
const FIELDS = 7;

const $ = (id) => document.getElementById(id);
const state = { query: "", category: "", allReferences: false, allIdeas: false };
let catalog = null;

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
}

const fileUrl = (file) => FILES + encodeURIComponent(file);

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function outLink(label, url) {
  const href = safeUrl(url);
  if (!href) return null;
  return el("a", { href, target: "_blank", rel: "noopener noreferrer", text: `${label} ↗` });
}

function heading(tag, item) {
  const node = el(tag, { text: item.name });
  if (item.detail) node.append(" ", el("small", { text: item.detail }));
  return node;
}

// ------------------------------------------------------------------ search

function haystack(item) {
  return [item.id, item.name, item.detail, item.group, item.category, item.note,
    item.why, item.motion, item.pieces]
    .filter(Boolean).join(" ").toLowerCase();
}

function matches(item) {
  if (!state.query) return true;
  item.text ||= haystack(item);
  return state.query.split(/\s+/).every((word) => item.text.includes(word));
}

// ------------------------------------------------------------------ viewer

const viewer = { list: [], index: 0, opener: null };

function showViewer() {
  const entry = viewer.list[viewer.index];
  if (!entry) return;
  const image = $("viewerImage");
  image.src = fileUrl(entry.item.preview);
  image.alt = entry.item.name;
  $("viewerKicker").textContent = entry.kicker;
  $("viewerTitle").replaceChildren(...heading("span", entry.item).childNodes);
  $("viewerNote").textContent = entry.item.note;
  $("viewerActions").replaceChildren(...entry.links().filter(Boolean));
  $("viewerCredit").textContent = entry.credit;
  $("viewerPosition").textContent = `${viewer.index + 1} of ${viewer.list.length}`;
  $("viewerPrev").disabled = viewer.index === 0;
  $("viewerNext").disabled = viewer.index === viewer.list.length - 1;
}

function openViewer(list, index, opener) {
  Object.assign(viewer, { list, index, opener });
  showViewer();
  $("viewer").showModal();
}

function stepViewer(change) {
  const next = viewer.index + change;
  if (next < 0 || next >= viewer.list.length) return;
  viewer.index = next;
  showViewer();
}

// ------------------------------------------------------------------- cards

function fieldFor(text) {
  let sum = 0;
  for (const char of String(text)) sum += char.charCodeAt(0);
  return `field-${sum % FIELDS}`;
}

function shot(item, imageFile, entries) {
  const button = el("button", {
    class: "shot",
    type: "button",
    "aria-label": `Open the picture of ${item.name}`,
  });
  const image = el("img", {
    src: fileUrl(imageFile),
    alt: "",
    loading: "lazy",
    decoding: "async",
  });
  image.addEventListener("error", () => {
    button.replaceChildren(el("small", { text: "Picture unavailable" }));
    button.classList.add("shot-plain", fieldFor(item.name));
    button.disabled = true;
  }, { once: true });
  button.append(image);
  button.addEventListener("click", () => {
    openViewer(entries, entries.findIndex((entry) => entry.item === item), button);
  });
  return button;
}

function referenceLinks(item) {
  return [outLink("Open site", item.url), outLink("Open motion clip", item.motionUrl)];
}

function referenceCard(item, entries) {
  let top;
  if (item.preview) {
    top = shot(item, item.preview, entries);
  } else {
    // No saved picture: show where the link goes instead of repeating the name.
    const href = safeUrl(item.url);
    const host = href ? new URL(href).hostname.replace(/^www\./, "") : item.name;
    top = el("a", {
      class: `shot shot-plain ${fieldFor(item.category)}`,
      href: href || undefined,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": `Open the ${item.name} site`,
    }, [el("span", {}, [host, el("small", { text: "No saved picture. Opens the site." })])]);
  }
  return el("article", { class: "card" }, [
    top,
    el("div", { class: "card-body" }, [
      el("p", { class: "card-kicker" }, [
        el("span", { text: item.category }),
        el("span", { text: item.id }),
      ]),
      heading("h3", item),
      el("p", { class: "card-note", text: item.note }),
      el("div", { class: "card-actions" }, referenceLinks(item)),
    ]),
  ]);
}

function conceptCard(item, entries) {
  return el("article", { class: "card" }, [
    shot(item, item.thumb || item.preview, entries),
    el("div", { class: "card-body" }, [
      // The group heading above already names the group.
      el("p", { class: "card-kicker" }, [el("span", { text: item.id })]),
      heading("h4", item),
      el("p", { class: "card-note", text: item.note }),
      el("div", { class: "card-actions" }, [outLink("Open study", item.url)]),
    ]),
  ]);
}

function ideaCard(item) {
  return el("article", { class: "card idea" }, [
    el("div", { class: "card-body" }, [
      heading("h3", item),
      el("p", { class: "card-note", text: item.note }),
      el("details", {}, [
        el("summary", { text: "Why it could work" }),
        el("dl", {}, [
          item.why && el("div", {}, [el("dt", { text: "Why" }), el("dd", { text: item.why })]),
          item.motion && el("div", {}, [el("dt", { text: "Motion" }), el("dd", { text: item.motion })]),
        ]),
        el("div", { class: "card-actions" }, [outLink("Open original", item.url)]),
      ]),
    ]),
  ]);
}

function studyCard(item) {
  const open = STUDY_PATH.test(item.open) ? STUDY_BASE + item.open : "";
  return el("article", { class: "study" }, [
    el("h4", { text: item.name }),
    el("p", { text: item.pieces }),
    el("p", { text: item.motion }),
    open && el("a", { href: open, target: "_blank", rel: "noopener", text: "Open study ↗" }),
  ]);
}

// ---------------------------------------------------------------- sections

function moreButton(button, total, showingAll, shown) {
  const filtering = Boolean(state.query || state.category);
  button.hidden = filtering || total <= shown;
  button.textContent = showingAll ? "Show fewer" : `Show all ${total}`;
  button.setAttribute("aria-expanded", String(showingAll));
}

function renderReferences() {
  const found = catalog.references.filter((item) =>
    matches(item) && (!state.category || item.category === state.category));
  const filtering = Boolean(state.query || state.category);
  const visible = state.allReferences || filtering ? found : found.slice(0, FIRST_REFERENCES);
  const entries = visible.filter((item) => item.preview).map((item) => ({
    item,
    kicker: `${item.category} · ${item.id}`,
    links: () => referenceLinks(item),
    credit: item.capturedOn
      ? `Picture saved from the source on ${item.capturedOn}. Reference only, not cleared for reuse.`
      : "Reference only, not cleared for reuse.",
  }));
  $("referenceGrid").replaceChildren(...visible.map((item) => referenceCard(item, entries)));
  moreButton($("referenceMore"), found.length, state.allReferences, FIRST_REFERENCES);
  $("referenceEmpty").hidden = found.length > 0;
  $("referenceEmpty").textContent = "No inspiration matches that. Try a shorter word or another chip.";
  return found.length;
}

function renderChips() {
  const counts = new Map();
  for (const item of catalog.references) {
    counts.set(item.category, (counts.get(item.category) || 0) + 1);
  }
  const ordered = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const chips = [["", catalog.references.length], ...ordered].map(([category, count]) => {
    const chip = el("button", {
      class: "chip",
      type: "button",
      "aria-pressed": String(state.category === category),
    }, [category || "All", el("span", { text: String(count) })]);
    chip.addEventListener("click", () => {
      state.category = category;
      renderChips();
      render();
    });
    return chip;
  });
  $("categoryChips").replaceChildren(...chips);
}

function renderConcepts() {
  const found = catalog.concepts.filter(matches);
  const entries = found.map((item) => ({
    item,
    kicker: `${item.group} · ${item.id}`,
    links: () => [outLink("Open study", item.url)],
    credit: "An exploration. Being here does not mean it was chosen.",
  }));
  const groups = new Map();
  for (const item of found) {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item);
  }
  $("conceptGroups").replaceChildren(...[...groups].map(([name, items]) =>
    el("div", { class: "group" }, [
      el("h3", { class: "group-title" }, [name, el("span", { text: String(items.length) })]),
      el("div", { class: "grid" }, items.map((item) => conceptCard(item, entries))),
    ])));

  const studies = catalog.studies.filter(matches);
  $("studyRow").replaceChildren(...studies.map(studyCard));
  $("studies").hidden = studies.length === 0;

  const total = found.length + studies.length;
  $("conceptEmpty").hidden = total > 0;
  $("conceptEmpty").textContent = "None of our concepts match that.";
  return total;
}

function renderIdeas() {
  const found = catalog.ideas.filter(matches);
  const visible = state.allIdeas || state.query ? found : found.slice(0, FIRST_IDEAS);
  $("ideaGrid").replaceChildren(...visible.map(ideaCard));
  const button = $("ideaMore");
  button.hidden = Boolean(state.query) || found.length <= FIRST_IDEAS;
  button.textContent = state.allIdeas ? "Show fewer" : `Show all ${found.length}`;
  button.setAttribute("aria-expanded", String(state.allIdeas));
  $("ideaEmpty").hidden = found.length > 0;
  $("ideaEmpty").textContent = "No written ideas match that.";
  return found.length;
}

function render() {
  const references = renderReferences();
  const concepts = renderConcepts();
  const ideas = renderIdeas();
  $("countInspiration").textContent = String(references);
  $("countConcepts").textContent = String(concepts);
  $("countIdeas").textContent = String(ideas);

  const status = $("status");
  $("toolbar").classList.toggle("searching", Boolean(state.query));
  if (!state.query) {
    status.replaceChildren();
    return;
  }
  const total = references + concepts + ideas;
  const clear = el("button", { class: "ghost-button", type: "button", text: "Clear search" });
  clear.addEventListener("click", () => {
    $("search").value = "";
    state.query = "";
    render();
    $("search").focus();
  });
  status.replaceChildren(
    total === 1 ? "1 match" : `${total} matches`,
    ` for "${$("search").value.trim()}".`,
    clear,
  );
}

// ---------------------------------------------------------------- markdown
// A small renderer for the collection's own notes. It only ever builds text
// nodes and a fixed set of elements, so nothing in a note can run as code.

const INLINE = /\[([^\]]+)\]\(([^)\s]*)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
const HEX = /^#[0-9a-f]{6}$/i;

function inline(text) {
  const nodes = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const [, label, url, bold, code] = match;
    if (label !== undefined) {
      const href = safeUrl(url);
      nodes.push(href
        ? el("a", { href, target: "_blank", rel: "noopener noreferrer", text: label })
        : label);
    } else if (bold !== undefined) {
      nodes.push(el("strong", { text: bold }));
    } else {
      const node = el("code", { text: code });
      if (HEX.test(code)) {
        const swatch = el("span", { class: "swatch", "aria-hidden": "true" });
        swatch.style.background = code;
        node.prepend(swatch);
      }
      nodes.push(node);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const BULLET = /^\s*[-*]\s+/;
const NUMBER = /^\s*\d+\.\s+/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());

function renderMarkdown(markdown, container) {
  const lines = String(markdown || "").split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const title = line.match(HEADING);
    if (!line.trim()) {
      index += 1;
    } else if (title) {
      // The fold already names the note, so its own opening title is dropped.
      if (blocks.length || title[1].length > 1) blocks.push(el("h3", {}, inline(title[2])));
      index += 1;
    } else if (BULLET.test(line) || NUMBER.test(line)) {
      const pattern = BULLET.test(line) ? BULLET : NUMBER;
      const items = [];
      while (index < lines.length && pattern.test(lines[index])) {
        items.push(el("li", {}, inline(lines[index].replace(pattern, ""))));
        index += 1;
      }
      blocks.push(el(pattern === BULLET ? "ul" : "ol", {}, items));
    } else if (line.trim().startsWith("|") && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] || "")) {
      const head = cells(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(cells(lines[index]));
        index += 1;
      }
      blocks.push(el("div", {
        class: "table-scroll",
        tabindex: "0",
        role: "region",
        "aria-label": "Table. Scrolls sideways on a small screen.",
      }, [
        el("table", {}, [
          el("thead", {}, [el("tr", {}, head.map((cell) => el("th", { scope: "col" }, inline(cell))))]),
          el("tbody", {}, rows.map((row) => el("tr", {}, row.map((cell) => el("td", {}, inline(cell)))))),
        ]),
      ]));
    } else {
      const text = [];
      while (index < lines.length && lines[index].trim() && !HEADING.test(lines[index]) &&
        !BULLET.test(lines[index]) && !NUMBER.test(lines[index])) {
        text.push(lines[index].trim());
        index += 1;
      }
      blocks.push(el("p", {}, inline(text.join(" "))));
    }
  }
  container.replaceChildren(...blocks);
}

// ------------------------------------------------------------------- guide

function renderGuide() {
  const { guide, documents, collections } = catalog;
  const cover = $("guideCover");
  cover.href = fileUrl(guide.file);
  const size = `PDF, ${(guide.bytes / 1048576).toFixed(1)} MB`;
  cover.replaceChildren(
    guide.cover && el("img", { src: fileUrl(guide.cover), alt: "The first page of the design guide", loading: "lazy" }),
    el("span", {}, ["Open the design guide ↗", el("small", { text: size })]),
  );
  renderMarkdown(documents.guide, $("guideText"));
  renderMarkdown(documents.notes, $("notesText"));
  renderMarkdown(documents.provenance, $("provenanceText"));
  $("notesFold").hidden = !documents.notes;
  $("provenanceFold").hidden = !documents.provenance;

  $("collectionsFold").hidden = collections.length === 0;
  $("collectionList").replaceChildren(
    ...collections.map((item) => el("li", {}, [outLink(`Open the ${item.title}`, item.url)])),
    el("li", {}, [el("p", { text: "These live on the private studies site and may ask you to sign in." })]),
  );

  const parts = [];
  const synced = new Date(catalog.syncedAt);
  if (!Number.isNaN(synced.getTime())) {
    parts.push(`Copied here ${synced.toLocaleDateString(undefined, { dateStyle: "medium" })}`);
  }
  if (catalog.sourceCommit) parts.push(`library version ${catalog.sourceCommit.slice(0, 8)}`);
  const line = $("sourceLine");
  line.replaceChildren(parts.join(", "));
  const repo = outLink("Open the GitHub repo", catalog.repoUrl);
  if (repo) line.append(parts.length ? " · " : "", repo);
}

// -------------------------------------------------------------------- page

function showGuide(open, moveFocus) {
  $("guide").hidden = !open;
  $("guideButton").setAttribute("aria-expanded", String(open));
  if (open && moveFocus) {
    $("guide").scrollIntoView({ block: "center" });
    $("guideClose").focus();
  }
}

function remember(key) {
  try { localStorage.setItem(key, "1"); } catch { /* private mode: show it again next time */ }
}
function recall(key) {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}

function fail(message, canRetry) {
  $("summary").textContent = message;
  const status = $("status");
  status.replaceChildren();
  if (!canRetry) return;
  const retry = el("button", { class: "ghost-button", type: "button", text: "Try again" });
  retry.addEventListener("click", () => {
    $("summary").textContent = "Opening the library…";
    status.replaceChildren();
    load();
  });
  status.append(retry);
}

function watchSections() {
  if (!("IntersectionObserver" in window)) return;
  const links = [...document.querySelectorAll(".jump a")];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of links) {
        link.setAttribute("aria-current", String(link.dataset.section === entry.target.id));
      }
    }
  }, { rootMargin: "-25% 0px -65% 0px" });
  for (const link of links) {
    const section = $(link.dataset.section);
    if (section) observer.observe(section);
  }
}

async function load() {
  let response;
  try {
    response = await fetch(fileUrl("catalog.json"), { credentials: "same-origin", cache: "no-store" });
  } catch {
    return fail("Could not reach the library. Check your connection.", true);
  }
  if (response.status === 401) {
    const returnTo = location.pathname + location.search;
    location.replace(`/brain/login.html?returnTo=${encodeURIComponent(returnTo)}`);
    return;
  }
  if (response.status === 404) {
    return fail("Nothing here yet. The library has not been copied into private storage.", false);
  }
  if (!response.ok) return fail("The library is not answering right now.", true);

  try {
    catalog = await response.json();
    for (const key of ["references", "concepts", "studies", "ideas", "collections"]) {
      if (!Array.isArray(catalog[key])) catalog[key] = [];
    }
    catalog.documents ||= {};
    catalog.guide ||= { file: "", bytes: 0, cover: "" };
  } catch {
    return fail("The library arrived damaged. Copy it into private storage again.", false);
  }

  document.title = catalog.title || "Design library";
  $("pageTitle").textContent = catalog.title || "Design library";
  $("summary").textContent =
    "Everything we collected, in one private place. Search it all, or jump to a section.";

  const preset = new URLSearchParams(location.search).get("q") || "";
  $("search").value = preset;
  state.query = preset.trim().toLowerCase();

  renderChips();
  render();
  renderGuide();
  $("sections").hidden = false;
  watchSections();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}

$("search").addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLowerCase();
  if (catalog) render();
});
$("referenceMore").addEventListener("click", () => {
  state.allReferences = !state.allReferences;
  renderReferences();
  if (!state.allReferences) $("inspiration").scrollIntoView();
});
$("ideaMore").addEventListener("click", () => {
  state.allIdeas = !state.allIdeas;
  renderIdeas();
  if (!state.allIdeas) $("ideas").scrollIntoView();
});

$("guideButton").addEventListener("click", () => showGuide($("guide").hidden, true));
$("guideClose").addEventListener("click", () => {
  remember(GUIDE_SEEN);
  showGuide(false);
  $("search").focus();
});

$("lockButton").addEventListener("click", async () => {
  try {
    await fetch("/api/magpie-logout", { method: "POST", credentials: "same-origin" });
  } finally {
    location.replace("/brain/login.html?returnTo=/brain/design-library.html");
  }
});

$("viewerPrev").addEventListener("click", () => stepViewer(-1));
$("viewerNext").addEventListener("click", () => stepViewer(1));
$("viewerClose").addEventListener("click", () => $("viewer").close());
$("viewer").addEventListener("click", (event) => {
  if (event.target === $("viewer")) $("viewer").close();
});
$("viewer").addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") stepViewer(-1);
  if (event.key === "ArrowRight") stepViewer(1);
  if (event.key === "Escape") {
    event.preventDefault();
    $("viewer").close();
  }
});
$("viewer").addEventListener("close", () => {
  $("viewerImage").removeAttribute("src");
  viewer.opener?.focus();
});

showGuide(!recall(GUIDE_SEEN));
load();
