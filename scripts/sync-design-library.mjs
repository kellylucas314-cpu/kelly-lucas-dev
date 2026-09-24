#!/usr/bin/env node
/* Fills design-library.js from the Magpie vault.

   The design desk (design.html) reads one data file. This script rebuilds
   the Magpie half of it: every clip that carries a desk tag becomes a card.
   Entries in the file's `manual` list are kept exactly as written and win
   over the Magpie copy of the same URL, so a hand-written "why" is never
   lost when the same page gets clipped later.

   usage:  npm run sync:design                        (default vault path)
           npm run sync:design -- /path/to/magpie     (another vault)
           npm run sync:design -- --thumbs            (also copy previews)
   MAGPIE_SOURCE=/path/to/magpie also works.

   --thumbs copies each clip's small preview (under 200 KB) into
   assets/design/thumbs/ so the card shows a picture instead of initials. */

import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const wantThumbs = args.includes("--thumbs");
const sourceArg = args.find((arg) => !arg.startsWith("--"));
const sourceRoot = path.resolve(
  sourceArg ||
  process.env.MAGPIE_SOURCE ||
  "/Users/kellylucas/Documents/GitHub/kip-workspace/magpie",
);
const worktree = path.resolve(import.meta.dirname, "..");
const targetPath = path.join(worktree, "design-library.js");
const thumbDir = path.join(worktree, "assets", "design", "thumbs");
const MAX_THUMB_BYTES = 200 * 1024;

/* A clip lands on the desk when it carries any of these tags. */
const DESK_TAGS = new Set([
  "design-desk", "design", "design-inspiration", "design-reference",
  "design-tool", "design-tools", "design-engineering", "web-design", "ui-ux",
  "website-examples", "visual-inspiration", "typography", "fonts", "color",
  "color-palette", "taste-library", "kellylucas-dev",
]);

/* Housekeeping tags that mean nothing to a visitor. */
const HIDDEN_TAGS = new Set([
  "magpie", "stumbleupon", "collector", "helioflux", "website-inspiration",
  "competitive-inspiration", "repo-radar", "agentic-os", "openclaw",
  "security-review", "kellylucas-dev", "design-desk", "design",
]);

/* Tags that decide a card's kind when the clip type does not. */
const TOOL_TAGS = new Set([
  "design-tool", "design-tools", "tools", "fonts", "typography", "color",
  "color-palette", "ai-design", "agent-skills", "skills", "components",
  "icons", "design-engineering",
]);
const GALLERY_TAGS = new Set([
  "design-inspiration", "design-reference", "visual-inspiration",
  "website-examples", "inspiration", "web-design", "ui-ux", "references",
  "curation", "taste-library",
]);

const norm = (tag) => String(tag || "").trim().toLowerCase();
const uniq = (list) => [...new Set(list)];

function domainOf(url) {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* One id per page, so youtu.be and youtube.com/watch meet in the middle. */
function fingerprint(url) {
  try {
    const parsed = new URL(String(url || "").trim());
    const host = parsed.hostname.toLowerCase().replace(/^(www|m)\./, "");
    const pathname = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    if (host === "youtu.be") return "youtube:" + pathname.split("/").filter(Boolean)[0];
    if (host === "youtube.com") {
      const video = parsed.searchParams.get("v");
      if (video) return "youtube:" + video;
    }
    return host + pathname;
  } catch {
    return "";
  }
}

/* Site copy never uses em dashes; page titles and descriptions often do. */
const dedash = (text) => String(text || "").replace(/\s*[\u2014\u2013]\s*/g, ", ").replace(/\s+/g, " ").trim();

/* "Mobbin, UI & UX design inspiration for mobile & web apps" becomes
   "Mobbin": keep the title segment that names the site itself. */
function cleanTitle(title, url) {
  const raw = String(title || "").trim();
  const parts = raw.split(/\s+(?:\||\u2014|\u2013|::|-|\u00b7)\s+|:\s+(?=\d)/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return dedash(raw).replace(/\.$/, "");
  const host = domainOf(url).toLowerCase();
  const core = host.replace(/\.[a-z]+$/, "");
  const squash = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const tokens = core.split(/[.-]/).filter((token) => token.length >= 3);
  const match = parts.slice().sort((a, b) => a.length - b.length).find((part) => {
    const flat = squash(part);
    if (!flat) return false;
    if (squash(core).includes(flat) || flat.includes(squash(core))) return true;
    return tokens.length > 0 && tokens.every((token) => flat.includes(token));
  });
  return dedash(match || parts[0]).replace(/\.$/, "");
}

/* First sentence or two, never cut mid-word, never past `limit`. */
function firstSentences(text, limit = 200) {
  const clean = dedash(text);
  if (clean.length <= limit) return clean;
  let out = "";
  for (const sentence of clean.match(/[^.!?]+[.!?]+(\s|$)/g) || [clean]) {
    if ((out + sentence).trim().length > limit) break;
    out += sentence;
  }
  out = out.trim();
  if (out) return out;
  const cut = clean.slice(0, limit);
  return cut.slice(0, cut.lastIndexOf(" ")) + "\u2026";
}

function kindOf(clip) {
  const type = String(clip.type || "").toLowerCase();
  const tags = (clip.tags || []).map(norm);
  if (type === "video" || type === "transcript") return "video";
  if (type.startsWith("github")) return "repo";
  if (["article", "paper", "document", "pdf"].includes(type)) return "reading";
  if (tags.some((tag) => TOOL_TAGS.has(tag))) return "tool";
  if (tags.some((tag) => GALLERY_TAGS.has(tag))) return "gallery";
  return "site";
}

/* Pull the useful parts out of a clip's Markdown note. */
function parseClip(markdown) {
  const sections = {};
  let current = "";
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^## (.+?)\s*$/);
    if (heading) {
      current = heading[1].trim().toLowerCase();
      sections[current] = sections[current] || [];
      continue;
    }
    if (current) sections[current].push(line);
  }
  const takeaways = (sections.notes || [])
    .map((line) => line.match(/^\s*[-*]\s+(.*)$/))
    .filter(Boolean)
    .map((match) => match[1].trim())
    .filter(Boolean);
  const summary = (sections.summary || []).join(" ").replace(/\s+/g, " ").trim();
  const myNotes = (sections["my notes / description"] || []).join("\n").trim();
  return { takeaways, summary, myNotes };
}

async function readClip(file) {
  const name = path.basename(String(file || ""));
  if (!name) return { takeaways: [], summary: "", myNotes: "" };
  try {
    return parseClip(await readFile(path.join(sourceRoot, "clips", name), "utf8"));
  } catch {
    return { takeaways: [], summary: "", myNotes: "" };
  }
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function thumbFor(clip) {
  const name = path.basename(String(clip.thumbLocal || ""));
  if (!name) return "";
  const dest = path.join(thumbDir, name);
  const served = `assets/design/thumbs/${name}`;
  if (await exists(dest)) return served;
  if (!wantThumbs) return "";
  const src = path.join(sourceRoot, "thumbs", name);
  try {
    const info = await stat(src);
    if (info.size > MAX_THUMB_BYTES) return "";
    await copyFile(src, dest);
    return served;
  } catch {
    return "";
  }
}

/* Drop empty strings and empty lists so the file stays readable. */
function compact(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) =>
      value !== "" && value != null && !(Array.isArray(value) && !value.length),
    ),
  );
}

function parseExisting(text) {
  const match = text.match(/window\.DESIGN_LIBRARY\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) throw new Error("design-library.js is not in the expected shape");
  return JSON.parse(match[1]);
}

const library = JSON.parse(
  await readFile(path.join(sourceRoot, "library.json"), "utf8"),
);
const clips = (library.items || []).filter((clip) =>
  (clip.tags || []).some((tag) => DESK_TAGS.has(norm(tag))),
);
if (!clips.length) throw new Error(`No desk-tagged clips found in ${sourceRoot}`);

let existing = { manual: [], items: [] };
try {
  existing = parseExisting(await readFile(targetPath, "utf8"));
} catch {
  /* first run: nothing to keep */
}
const manual = Array.isArray(existing.manual) ? existing.manual : [];

if (wantThumbs) await mkdir(thumbDir, { recursive: true });

const byId = new Map();
for (const clip of clips) {
  const id = fingerprint(clip.url);
  if (!id) continue;
  const parsed = await readClip(clip.file);
  /* Kelly's own one-liner is the card text. A note Kip wrote about her
     ("Kelly asked...") is provenance, not copy, so the summary leads. */
  const note = dedash(clip.note || parsed.myNotes || "");
  const why = /^kelly\b/i.test(note) ? "" : note;
  byId.set(id, compact({
    id,
    title: cleanTitle(clip.title, clip.url),
    url: clip.url,
    domain: domainOf(clip.url),
    author: dedash(clip.author || ""),
    kind: kindOf(clip),
    tags: uniq((clip.tags || []).map(norm).filter((tag) => tag && !HIDDEN_TAGS.has(tag))),
    why,
    summary: firstSentences(parsed.summary || clip.description || ""),
    takeaways: parsed.takeaways.map(dedash),
    hasTranscript: Boolean(clip.hasTranscript),
    thumb: await thumbFor(clip),
    clippedAt: clip.clippedAt || "",
    source: "magpie",
  }));
}

/* Manual entries: kept verbatim in `manual`, and layered on top of the
   Magpie copy of the same URL when there is one. */
for (const entry of manual) {
  const id = entry.id || fingerprint(entry.url);
  if (!id) continue;
  const overrides = compact({ ...entry, id: undefined });
  const base = byId.get(id);
  byId.set(id, base
    ? { ...base, ...overrides, id, source: "magpie+manual" }
    : { id, domain: domainOf(entry.url), kind: "site", tags: [], ...overrides, source: "manual" });
}

const dateOf = (item) => String(item.clippedAt || item.added || "");
const items = [...byId.values()].sort((a, b) =>
  (Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))) ||
  dateOf(b).localeCompare(dateOf(a)),
);

const out = {
  updatedAt: new Date().toISOString().slice(0, 10),
  manual,
  items,
};
const header = [
  "/* design-library.js: the data behind design.html.",
  "   Generated by scripts/sync-design-library.mjs. Edit `manual` by hand;",
  "   `items` is rebuilt from the Magpie vault on every run. */",
  "",
].join("\n");
await writeFile(targetPath, `${header}window.DESIGN_LIBRARY = ${JSON.stringify(out, null, 2)};\n`);

const counts = {};
for (const item of items) counts[item.kind] = (counts[item.kind] || 0) + 1;
console.log(`design-library.js: ${items.length} items from ${sourceRoot}`);
for (const [kind, count] of Object.entries(counts)) console.log(`  ${kind.padEnd(8)} ${count}`);
for (const item of items) {
  console.log(`  - [${item.kind}] ${item.title || item.url}${item.source === "manual" ? "  (manual)" : ""}`);
}
