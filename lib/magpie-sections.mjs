/* lib/magpie-sections.mjs: which section a clip belongs in.

   Kelly, 2026-11-09: "categorize ... a section for GitHub, a section for
   design sites like 21st.dev, a section for inspo, a section for random
   fun, a section for science ... you pick the sections."

   Sections are ordinary collections that Magpie files into by itself. One
   decision, made here, used by the Sort button, by every new clip (the
   feather, the Add box, the Mac merge) and by the feather's popup, which
   shows the guess before Kelly presses Clip. Kelly's own filing always
   wins: Magpie only ever files a clip that is new or still in Unsorted
   (plus, the first time, the four starter collections it filled itself).

   The order is the rule. First match wins:
     1. HelioFlux       her company: its own pages, or tagged for it
     2. Code & skills   anything on GitHub or another code host
     3. Science         papers, journals, science sites and science tags
     4. Design tools    a design signal on a tool: fonts, color, components
     5. Inspo           a design signal on a gallery or a site worth studying
     6. Random fun      the StumbleUpon archive and anything tagged fun
     7. Read & watch    articles and videos
   Nothing matched: it waits in Unsorted, which is the honest answer. */

import rules from "./desk-rules.json" with { type: "json" };
import { hostOf, kindOf, matchDomain, sortClip } from "./desk-sort.mjs";

export const SECTIONS = [
  { id: "helioflux", name: "HelioFlux", color: "navy" },
  { id: "code", name: "Code & skills", color: "sage" },
  { id: "design-tools", name: "Design tools", color: "coral" },
  { id: "inspo", name: "Inspo", color: "deep-coral" },
  { id: "read-watch", name: "Read & watch", color: "teal" },
  { id: "science", name: "Science", color: "deep-teal" },
  { id: "weird", name: "Random fun", color: "honey" },
];

/* The four collections the library started with (lib/magpie-store.mjs).
   The first sort may move clips out of these, since Magpie filled them. */
export const STARTER_IDS = ["helioflux", "design-ideas", "read-watch", "weird"];
const OLD_NAMES = { weird: "Weird & wonderful" };

const CODE_HOSTS = ["github.com", "gist.github.com", "gitlab.com", "bitbucket.org", "codeberg.org", "npmjs.com", "pypi.org", "huggingface.co", "codepen.io"];
const SCIENCE_HOSTS = [
  "arxiv.org", "biorxiv.org", "medrxiv.org", "chemrxiv.org", "nature.com", "science.org", "sciencemag.org",
  "cell.com", "pnas.org", "nih.gov", "plos.org", "elifesciences.org", "frontiersin.org", "mdpi.com",
  "sciencedirect.com", "springer.com", "springernature.com", "wiley.com", "tandfonline.com", "acs.org",
  "aps.org", "iop.org", "rsc.org", "royalsocietypublishing.org", "royalsociety.org", "oup.com",
  "biomedcentral.com", "jamanetwork.com", "nejm.org", "thelancet.com", "bmj.com", "researchgate.net",
  "semanticscholar.org", "doi.org", "scholar.google.com", "jstor.org", "europepmc.org", "ssrn.com",
  "quantamagazine.org", "scientificamerican.com", "newscientist.com", "phys.org", "sciencedaily.com",
  "sciencenews.org", "nautil.us", "nasa.gov", "esa.int", "cern.ch", "noaa.gov", "usgs.gov", "si.edu",
  "livescience.com", "space.com", "eurekalert.org", "the-scientist.com", "statnews.com",
];
const SCIENCE_TAGS = [
  "science", "physics", "biology", "chemistry", "neuroscience", "astronomy", "astrophysics", "space",
  "math", "mathematics", "quantum", "biophoton", "biophotons", "genetics", "genomics", "medicine",
  "paper", "papers", "ecology", "geology", "evolution", "cosmology", "microbiology",
  "biochemistry", "optics", "photonics", "mitochondria", "cell-biology", "climate", "botany", "zoology",
];
const FUN_TAGS = ["stumbleupon", "weird", "fun", "funny", "random", "humor", "humour", "games", "game", "toys", "oddities", "wtf"];
const HELIOFLUX_TAGS = ["helioflux", "helioflux-website"];

const norm = (value) => String(value || "").trim().toLowerCase();

/* { section, why }. section is "" when Magpie has no honest guess; why
   finishes the sentence "Magpie filed this here because ...". */
export function sectionFor(item = {}) {
  const tags = (item.tags || []).map(norm).filter(Boolean);
  const type = norm(item.type);
  const host = hostOf(item.url);
  const hasTag = (list) => tags.find((tag) => list.includes(tag));

  let verdict = { onDesk: false, section: null, kind: "site" };
  try {
    verdict = sortClip(item, rules);
  } catch {
    /* a clip the desk rules can't read is still a clip */
  }
  const desk = norm(item.deskSection) || (verdict.onDesk ? verdict.section : "");

  /* 1. HelioFlux */
  const helioTag = hasTag(HELIOFLUX_TAGS);
  if (helioTag) return { section: "helioflux", why: "it’s tagged #" + helioTag };
  if (desk === "website") return { section: "helioflux", why: "it’s for the HelioFlux website" };
  if (matchDomain(item.url, rules.sections?.website?.domains || [])) return { section: "helioflux", why: "it’s a HelioFlux page" };

  /* 2. Code & skills */
  const codeHost = matchDomain(item.url, CODE_HOSTS);
  if (codeHost) return { section: "code", why: host === "github.com" || host === "gist.github.com" ? "it’s on GitHub" : "it’s on " + host };
  if (type.startsWith("github") || type === "repo") return { section: "code", why: "it’s a code repo" };

  /* 3. Science */
  if (type === "paper" || item.doi || item.journal) return { section: "science", why: "it’s a paper" };
  if (matchDomain(item.url, SCIENCE_HOSTS)) return { section: "science", why: host + " is a science site" };
  const scienceTag = hasTag(SCIENCE_TAGS);
  if (scienceTag) return { section: "science", why: "it’s tagged #" + scienceTag };

  /* 4 and 5. Design: tools, then things to look at. Design reading and
     design videos fall through to Read & watch. */
  if (desk && desk !== "none") {
    const kind = verdict.kind || kindOf(item, rules);
    if (kind === "tool") return { section: "design-tools", why: "it’s a design tool" };
    if (kind === "gallery") return { section: "inspo", why: "it’s a design gallery" };
    if (kind === "site") return { section: "inspo", why: "it’s a site saved for its design" };
  }

  /* 6. Random fun */
  if (norm(item.captureSource).includes("stumbleupon") || tags.includes("stumbleupon")) {
    return { section: "weird", why: "it came from your StumbleUpon archive" };
  }
  const funTag = hasTag(FUN_TAGS);
  if (funTag) return { section: "weird", why: "it’s tagged #" + funTag };

  /* 7. Read & watch */
  if (type === "video" || type === "transcript" || matchDomain(item.url, ["youtube.com", "youtu.be", "vimeo.com", "ted.com"])) {
    return { section: "read-watch", why: "it’s a video" };
  }
  if (["article", "pdf", "document", "reading", "newsletter"].includes(type) || matchDomain(item.url, rules.kinds?.reading || [])) {
    return { section: "read-watch", why: "it’s an article" };
  }
  if (type === "bookmark") return { section: "weird", why: "it’s an old bookmark" };
  return { section: "", why: "" };
}

/* Section id -> the collection that stands for it in this library: the
   one with that id, or one Kelly made with the same name. */
export function sectionTargets(lib) {
  const targets = new Map();
  for (const section of SECTIONS) {
    const byId = lib.collections.find((entry) => entry.id === section.id);
    const byName = lib.collections.find((entry) => norm(entry.name) === norm(section.name));
    const found = byId || byName;
    if (found) targets.set(section.id, found.id);
  }
  return targets;
}

/* Files one new clip, if sections are on and its section still exists. */
export function fileNewClip(lib, item) {
  if (!lib.sectionsOn || item.collection) return false;
  const guess = sectionFor(item);
  const target = guess.section && sectionTargets(lib).get(guess.section);
  if (!target) return false;
  item.collection = target;
  item.filedBy = "magpie";
  item.filedWhy = guess.why;
  return true;
}

/* What the Sort button would do, without doing it. */
export function planSections(lib) {
  const first = !lib.sectionsOn;
  const targets = sectionTargets(lib);
  const movable = new Set(first ? ["", ...STARTER_IDS] : [""]);
  const moves = [];
  for (const item of lib.items) {
    if (item.removed) continue;
    const from = item.collection || "";
    if (!movable.has(from)) continue;
    const guess = sectionFor(item);
    if (!guess.section) continue;
    /* The first sort makes the missing sections; later ones respect a
       section Kelly deleted and leave its clips in Unsorted. */
    const to = targets.get(guess.section) || (first ? guess.section : "");
    if (!to || to === from) continue;
    moves.push({ id: item.id, from, to, section: guess.section, why: guess.why });
  }
  const counts = SECTIONS.map((section) => {
    const found = lib.collections.find((entry) => entry.id === targets.get(section.id));
    /* The first sort renames "Weird & wonderful"; say the new name now. */
    const renamed = first && found && OLD_NAMES[section.id] === found.name;
    return {
      id: section.id,
      target: found?.id || section.id,
      name: found && !renamed ? found.name : section.name,
      color: found?.color || section.color,
      n: moves.filter((move) => move.section === section.id).length,
    };
  });
  const unsorted = lib.items.filter((item) => !item.removed && !item.collection).length;
  return { first, moves, counts, total: moves.length, fromUnsorted: moves.filter((move) => !move.from).length, unsorted };
}

/* Does it. Returns { changed, sorted, undo }: undo is a list of ordinary
   library changes that puts everything back exactly as it was. */
export function applySections(lib, stamp = new Date().toISOString()) {
  const plan = planSections(lib);
  const undo = [];
  const made = [];
  if (plan.first) {
    const targets = sectionTargets(lib);
    for (const section of SECTIONS) {
      if (targets.has(section.id)) continue;
      lib.collections.push({ id: section.id, name: section.name, parent: "", color: section.color, createdAt: stamp });
      made.push(section.id);
    }
    for (const [id, oldName] of Object.entries(OLD_NAMES)) {
      const entry = lib.collections.find((other) => other.id === id);
      const fresh = SECTIONS.find((section) => section.id === id);
      if (entry && fresh && entry.name === oldName) {
        entry.name = fresh.name;
        undo.push({ op: "collection.update", id, name: oldName });
      }
    }
  }
  const byId = new Map(lib.items.map((item) => [item.id, item]));
  const back = new Map();
  const changed = [];
  for (const move of plan.moves) {
    const item = byId.get(move.id);
    if (!item) continue;
    item.collection = move.to;
    item.filedBy = "magpie";
    item.filedWhy = move.why;
    changed.push(item.id);
    if (!back.has(move.from)) back.set(move.from, []);
    back.get(move.from).push(item.id);
  }
  /* "Design ideas" was a starter collection; once its clips have moved to
     Design tools and Inspo, an empty one is only clutter. */
  if (plan.first) {
    const old = lib.collections.find((entry) => entry.id === "design-ideas");
    const empty = old && !lib.items.some((item) => item.collection === old.id) && !lib.collections.some((entry) => entry.parent === old.id);
    if (empty) {
      lib.collections = lib.collections.filter((entry) => entry.id !== old.id);
      undo.unshift({ op: "collection.create", id: old.id, name: old.name, color: old.color, parent: old.parent || "" });
    }
  }
  for (const [from, ids] of back) undo.push({ op: "move", ids, collection: from });
  for (const id of made) undo.push({ op: "collection.delete", id });
  if (plan.first) undo.push({ op: "sections.reset" });
  lib.sectionsOn = lib.sectionsOn || stamp;
  return { changed, sorted: changed.length, made, undo, first: plan.first };
}
