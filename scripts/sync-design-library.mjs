#!/usr/bin/env node
/* Fills design-library.js from the Magpie vault.

   The design desk (design.html) reads one data file. This script rebuilds
   the Magpie half of it: every clip the sorter (lib/desk-sort.mjs, rules in
   lib/desk-rules.json) puts on the desk becomes a card, filed under one of
   five piles: website, heliopolis, pretzel, resources, examples. A clip
   tagged desk:<section> is filed there; desk:none keeps it off.
   Entries in the file's `manual` list are kept exactly as written and win
   over the Magpie copy of the same URL, so a hand-written "why" is never
   lost when the same page gets clipped later. The `systems`, `libraries`
   and `docs` lists (Kelly's own design systems, art libraries and style
   documents) are hand-written and pass through untouched.

   usage:  npm run sync:design                        (default vault path)
           npm run sync:design -- /path/to/magpie     (another vault)
           npm run sync:design -- --thumbs            (also copy previews)
   MAGPIE_SOURCE=/path/to/magpie also works.

   --thumbs copies each clip's small preview (under 200 KB) into
   assets/design/thumbs/ so the card shows a picture instead of initials.
   Cards with no preview can get one from scripts/capture-design-thumbs.mjs,
   which saves assets/design/thumbs/<card id>.jpg; the sync picks those up
   by name on every run. */

import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { RESOURCE_KINDS, SECTIONS, kindOf, loadRules, sortClip } from "../lib/desk-sort.mjs";

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

/* Whether a clip lands on the desk, and in which pile, is decided by
   lib/desk-sort.mjs from lib/desk-rules.json. */
const rules = loadRules();

/* Housekeeping tags that mean nothing to a visitor. */
const HIDDEN_TAGS = new Set([
  "magpie", "stumbleupon", "collector", "helioflux", "website-inspiration",
  "competitive-inspiration", "repo-radar", "agentic-os", "openclaw",
  "security-review", "kellylucas-dev", "design-desk", "design",
]);
const hiddenTag = (tag) => HIDDEN_TAGS.has(tag) || tag.startsWith("desk:");

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

/* A picture taken by scripts/capture-design-thumbs.mjs is named after the
   card's id, so it survives every sync. */
export function shotName(id) {
  const stem = String(id || "").replace(/[^a-z0-9.-]+/gi, "-").replace(/^-+|-+$/g, "");
  return stem ? `${stem}.jpg` : "";
}

async function shotFor(id) {
  const name = shotName(id);
  if (!name) return "";
  return (await exists(path.join(thumbDir, name))) ? `assets/design/thumbs/${name}` : "";
}

/* The Magpie preview when there is one, else a captured shot, else nothing. */
async function thumbFor(clip, id) {
  const name = path.basename(String(clip.thumbLocal || ""));
  if (!name) return shotFor(id);
  const dest = path.join(thumbDir, name);
  const served = `assets/design/thumbs/${name}`;
  if (await exists(dest)) return served;
  if (!wantThumbs) return shotFor(id);
  const src = path.join(sourceRoot, "thumbs", name);
  try {
    const info = await stat(src);
    if (info.size > MAX_THUMB_BYTES) return shotFor(id);
    await copyFile(src, dest);
    return served;
  } catch {
    return shotFor(id);
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
const verdicts = new Map();
const clips = (library.items || []).filter((clip) => {
  const verdict = sortClip(clip, rules);
  if (verdict.onDesk) verdicts.set(clip, verdict);
  return verdict.onDesk;
});
if (!clips.length) throw new Error(`No desk clips found in ${sourceRoot}`);

/* Keep the vault's copy of the rules in step, so the Magpie server and the
   Chrome clipper file new clips the same way this script does. */
try {
  await copyFile(path.join(worktree, "lib", "desk-rules.json"), path.join(sourceRoot, "desk-rules.json"));
} catch {
  /* another vault, or none: the site's copy is the one that matters here */
}

let existing = { manual: [], items: [] };
try {
  existing = parseExisting(await readFile(targetPath, "utf8"));
} catch {
  /* first run: nothing to keep */
}
const manual = Array.isArray(existing.manual) ? existing.manual : [];
/* Kelly's own design systems, art libraries and style documents are
   hand-written too, and never come from Magpie, so they pass through untouched. */
const systems = Array.isArray(existing.systems) ? existing.systems : [];
const libraries = Array.isArray(existing.libraries) ? existing.libraries : [];
const docs = Array.isArray(existing.docs) ? existing.docs : [];

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
    kind: verdicts.get(clip).kind,
    section: verdicts.get(clip).section,
    tags: uniq((clip.tags || []).map(norm).filter((tag) => tag && !hiddenTag(tag))),
    why,
    summary: firstSentences(parsed.summary || clip.description || ""),
    takeaways: parsed.takeaways.map(dedash),
    hasTranscript: Boolean(clip.hasTranscript),
    thumb: await thumbFor(clip, id),
    clippedAt: clip.clippedAt || "",
    source: "magpie",
  }));
}

/* Manual entries: kept verbatim in `manual`, and layered on top of the
   Magpie copy of the same URL when there is one. */
for (const entry of manual) {
  const id = entry.id || fingerprint(entry.url);
  if (!id) continue;
  /* `hidden: true` takes a clip off the desk without touching the vault. */
  if (entry.hidden) {
    byId.delete(id);
    continue;
  }
  const overrides = compact({ ...entry, id: undefined, hidden: undefined });
  const base = byId.get(id);
  const guessKind = kindOf({ url: entry.url, type: entry.kind === "video" ? "video" : "" }, rules);
  const merged = base
    ? { ...base, ...overrides, id, source: "magpie+manual" }
    : { id, domain: domainOf(entry.url), kind: guessKind, tags: [], ...overrides, source: "manual" };
  if (!merged.thumb) merged.thumb = await shotFor(id);
  /* A hand-written entry is on the desk by definition: its own `section`,
     else the sorter's guess, else resources or examples by kind. */
  if (!SECTIONS.includes(merged.section)) {
    const guess = sortClip({ url: merged.url, title: merged.title, tags: merged.tags, note: merged.why,
      type: merged.kind === "video" ? "video" : "" }, rules);
    merged.section = guess.onDesk ? guess.section : RESOURCE_KINDS.has(merged.kind) ? "resources" : "examples";
  }
  byId.set(id, merged);
}

const dateOf = (item) => String(item.clippedAt || item.added || "");
const items = [...byId.values()].sort((a, b) =>
  (Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))) ||
  dateOf(b).localeCompare(dateOf(a)),
);

const out = {
  updatedAt: new Date().toISOString().slice(0, 10),
  systems,
  libraries,
  docs,
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
for (const section of SECTIONS) {
  const pile = items.filter((item) => item.section === section);
  console.log(`\n${section} (${pile.length})`);
  for (const item of pile) {
    console.log(`  - [${item.kind}] ${item.title || item.url}${item.source === "manual" ? "  (manual)" : ""}`);
  }
}
