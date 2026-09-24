/* lib/desk-sort.mjs: where a Magpie clip lands on the design desk.

   One decision, reused everywhere the desk is fed: the sync script that
   builds design-library.js, the tests, and (mirrored in Python) the Magpie
   companion server, which asks it the moment a clip arrives so the Chrome
   clipper can show "Design desk: Website" before Kelly presses Clip.

   The rules live in lib/desk-rules.json. A clip tagged desk:<section> always
   wins; desk:none keeps a clip off the desk. Otherwise:
     1. a clip of one of Kelly's own sites goes to that project
     2. a site tagged or described as belonging to a project goes there,
        as long as it is not a gallery, tool, repo, video or article
     3. anything with a design signal is a resource (galleries, tools,
        repos, reading, videos) or an example (a site worth studying)
     4. everything else stays in the vault only */

import { readFileSync } from "node:fs";
import path from "node:path";

export const SECTIONS = ["website", "heliopolis", "pretzel", "resources", "examples"];
export const PROJECTS = ["website", "heliopolis", "pretzel"];
export const RESOURCE_KINDS = new Set(["gallery", "tool", "repo", "reading", "video"]);

const RULES_PATH = path.join(import.meta.dirname, "desk-rules.json");
let cached = null;
export function loadRules(file = RULES_PATH) {
  if (file === RULES_PATH && cached) return cached;
  const rules = JSON.parse(readFileSync(file, "utf8"));
  if (file === RULES_PATH) cached = rules;
  return rules;
}

const norm = (value) => String(value || "").trim().toLowerCase();

export function hostOf(url) {
  try {
    return new URL(String(url || "").trim()).hostname.toLowerCase().replace(/^(www|m)\./, "");
  } catch {
    return "";
  }
}

function pathOf(url) {
  try {
    return new URL(String(url || "").trim()).pathname.toLowerCase().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

/* Three pattern shapes: "site.com" (that host or a subdomain of it),
   "*fragment" (any host containing the fragment), "host/path" (a prefix of
   host plus path). Returns the pattern that matched, or "". */
export function matchDomain(url, patterns = []) {
  const host = hostOf(url);
  if (!host) return "";
  const full = host + pathOf(url);
  for (const raw of patterns) {
    const pattern = norm(raw);
    if (!pattern) continue;
    if (pattern.startsWith("*")) {
      if (host.includes(pattern.slice(1))) return raw;
    } else if (pattern.includes("/")) {
      if (full.startsWith(pattern)) return raw;
    } else if (host === pattern || host.endsWith("." + pattern)) {
      return raw;
    }
  }
  return "";
}

/* Whole-word search, so "ui" does not fire on "build". */
export function findWord(text, words = []) {
  const haystack = " " + norm(text).replace(/[^a-z0-9]+/g, " ") + " ";
  for (const word of words) {
    const needle = " " + norm(word).replace(/[^a-z0-9]+/g, " ") + " ";
    if (needle.trim() && haystack.includes(needle)) return word;
  }
  return "";
}

/* The card kind: video, repo, reading, gallery, tool or site. Type first,
   then the domain lists, then tags. */
const KINDS = new Set(["gallery", "site", "tool", "video", "repo", "reading"]);

export function kindOf(clip, rules = loadRules()) {
  const type = norm(clip.type);
  const tags = (clip.tags || []).map(norm);
  const kinds = rules.kinds || {};
  /* A hand-written card says what it is. */
  if (KINDS.has(norm(clip.kind))) return norm(clip.kind);
  if (type === "video" || type === "transcript") return "video";
  if (type.startsWith("github") || matchDomain(clip.url, ["github.com", "gitlab.com"])) return "repo";
  if (matchDomain(clip.url, ["youtube.com", "youtu.be", "vimeo.com"])) return "video";
  if (matchDomain(clip.url, kinds.gallery || [])) return "gallery";
  if (matchDomain(clip.url, kinds.tool || [])) return "tool";
  if (matchDomain(clip.url, kinds.reading || [])) return "reading";
  if (["article", "paper", "document", "pdf"].includes(type)) return "reading";
  const toolTags = ["design-tool", "design-tools", "tools", "tool", "fonts", "typography", "color",
    "color-palette", "ai-design", "agent-skills", "skills", "components", "icons", "design-engineering"];
  const galleryTags = ["gallery", "galleries", "design-inspiration", "design-reference", "visual-inspiration",
    "website-examples", "inspiration", "references", "curation", "taste-library"];
  if (tags.some((tag) => toolTags.includes(tag))) return "tool";
  if (tags.some((tag) => galleryTags.includes(tag))) return "gallery";
  return "site";
}

/* Decide. Returns { onDesk, section, kind, reason }. */
export function sortClip(clip = {}, rules = loadRules()) {
  const tags = (clip.tags || []).map(norm).filter(Boolean);
  const kind = kindOf(clip, rules);
  const explicit = tags.find((tag) => tag.startsWith("desk:"));
  if (explicit) {
    const wanted = explicit.slice(5);
    if (wanted === "none" || wanted === "off" || wanted === "no") {
      return { onDesk: false, section: null, kind, reason: "marked not for the desk" };
    }
    if (SECTIONS.includes(wanted)) {
      return { onDesk: true, section: wanted, kind, reason: "tagged desk:" + wanted };
    }
  }

  const intent = new Set((rules.intentTags || []).map(norm));
  const designTag = tags.find((tag) => intent.has(tag));
  /* Only the title and Kelly's own note count as words. Scraped page
     descriptions say "design" far too easily (a cell-cycle animation, a
     course syllabus), so they never put a clip on the desk by themselves. */
  const ownText = [clip.note, clip.title].join(" ");
  const designWord = findWord(ownText, rules.designWords || []);
  const designDomain = matchDomain(clip.url, [...(rules.kinds?.gallery || []), ...(rules.kinds?.tool || [])]);
  const designSignal = designTag || designWord || designDomain;

  /* 1. One of Kelly's own sites. */
  for (const id of PROJECTS) {
    const section = rules.sections[id] || {};
    const hit = matchDomain(clip.url, section.domains || []);
    if (hit) return { onDesk: true, section: id, kind, reason: "its own site (" + hit + ")" };
  }

  /* Papers, transcripts and the like stay in the vault unless a design tag says otherwise. */
  const blocked = rules.notForDesk || {};
  const blockedType = (blocked.types || []).map(norm).includes(norm(clip.type));
  const blockedTag = tags.find((tag) => (blocked.tags || []).map(norm).includes(tag));
  if ((blockedType || blockedTag) && !designTag) {
    return { onDesk: false, section: null, kind, reason: blockedType ? "a " + norm(clip.type) + " stays in the vault" : "tagged " + blockedTag };
  }

  /* 2. Filed under a project by tag or by Kelly's own words. */
  if (!RESOURCE_KINDS.has(kind)) {
    for (const id of PROJECTS) {
      const section = rules.sections[id] || {};
      const tag = tags.find((value) => (section.tags || []).map(norm).includes(value));
      const word = findWord(ownText, section.words || []);
      /* A project tag alone is not enough (HelioFlux's business reading is tagged
         helioflux too); the clip also needs a design signal. */
      if ((tag || word) && designSignal) {
        return { onDesk: true, section: id, kind, reason: tag ? "tagged " + tag : "you wrote " + JSON.stringify(word) };
      }
    }
  }

  /* 3. A design signal: resource or example. */
  if (designSignal) {
    const why = designTag ? "tagged " + designTag : designDomain ? "a known " + kind + " (" + designDomain + ")" : "mentions " + JSON.stringify(designWord);
    return RESOURCE_KINDS.has(kind)
      ? { onDesk: true, section: "resources", kind, reason: why }
      : { onDesk: true, section: "examples", kind, reason: why };
  }

  /* 4. Not desk material. */
  return { onDesk: false, section: null, kind, reason: "no design signal; it stays in the vault" };
}

export function sectionName(id, rules = loadRules()) {
  return (rules.sections[id] && rules.sections[id].name) || id;
}
