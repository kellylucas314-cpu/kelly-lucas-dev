/* The design desk: where clips land, and what the page is built from.
   Run: npm run test:design */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { SECTIONS, kindOf, loadRules, matchDomain, findWord, sortClip } from "../lib/desk-sort.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const rules = loadRules();

test("the rules name every section", () => {
  for (const id of SECTIONS) assert.ok(rules.sections[id]?.name, id);
});

test("Kelly's own sites go to their project", () => {
  assert.equal(sortClip({ url: "https://helioflux.co/science.html", title: "The science" }).section, "website");
  assert.equal(sortClip({ url: "https://myheliopolis.com/meetings/2026-09-17/#library", title: "Library" }).section, "heliopolis");
  assert.equal(sortClip({ url: "https://pretzel.thetravelprotocol.com/", title: "Pretzel Protocol" }).section, "pretzel");
  assert.equal(sortClip({ url: "https://www.kellylucas.dev/heliopolis/index.html", title: "Art library" }).section, "heliopolis");
});

test("a competitor site tagged for the website lands under the website", () => {
  const verdict = sortClip({ url: "https://www.manifold.bio/", title: "Manifold Bio", type: "web page",
    tags: ["helioflux", "website-inspiration", "competitive-inspiration", "biotech"] });
  assert.equal(verdict.section, "website");
});

test("a gallery tagged helioflux is still a resource", () => {
  const verdict = sortClip({ url: "https://www.awwwards.com/", title: "Awwwards", type: "web page",
    tags: ["helioflux", "website-inspiration", "design-inspiration"] });
  assert.equal(verdict.section, "resources");
  assert.equal(verdict.kind, "gallery");
});

test("design videos, repos and reading are resources; a site is an example", () => {
  assert.equal(sortClip({ url: "https://youtu.be/ZsP20PN14O0", title: "5 Trendy Animations", type: "video", tags: ["design"] }).section, "resources");
  assert.equal(sortClip({ url: "https://github.com/Leonxlnx/taste-skill", title: "Taste Skill", type: "github", tags: ["design-tools"] }).section, "resources");
  assert.equal(sortClip({ url: "https://www.nngroup.com/articles/", title: "NN/g articles", type: "web page", tags: ["ux"] }).section, "resources");
  assert.equal(sortClip({ url: "https://example-studio.com/", title: "Studio", type: "web page", note: "love the hero on this one, an example for later" }).section, "examples");
});

test("papers, transcripts and plain articles stay in the vault", () => {
  assert.equal(sortClip({ url: "https://drive.google.com/x", title: "HelioFlux 07-28 Fundraising Transcript", type: "transcript", tags: ["HelioFlux", "QWC", "transcript"] }).onDesk, false);
  assert.equal(sortClip({ url: "https://www.popularmechanics.com/science/a/cells-glow/", title: "Every Cell in Your Body Glows", type: "article", tags: ["HelioFlux", "biophotons"] }).onDesk, false);
  assert.equal(sortClip({ url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1/", title: "Ultraweak photon emission", type: "paper", tags: ["paper"] }).onDesk, false);
});

test("an explicit desk tag wins, and desk:none keeps a clip out", () => {
  assert.equal(sortClip({ url: "https://anything.example/", title: "x", tags: ["desk:pretzel"] }).section, "pretzel");
  assert.equal(sortClip({ url: "https://www.awwwards.com/", title: "Awwwards", tags: ["desk:none"] }).onDesk, false);
});

test("matching is careful", () => {
  assert.equal(findWord("we build things", ["ui"]), "");
  assert.equal(findWord("A UI kit for builders", ["ui"]), "ui");
  assert.equal(matchDomain("https://heliopolis.kellylucas314.workers.dev/", ["*heliopolis"]), "*heliopolis");
  assert.equal(matchDomain("https://notheliopolis.example/", ["heliopolis.example"]), "");
  assert.equal(kindOf({ url: "https://dribbble.com/", type: "web page" }), "gallery");
});

test("design-library.js is well formed and every item has a section", () => {
  const match = read("design-library.js").match(/window\.DESIGN_LIBRARY\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  assert.ok(match, "data file shape");
  const library = JSON.parse(match[1]);
  const allowed = new Set([...SECTIONS, "lab"]);
  for (const item of library.items) assert.ok(SECTIONS.includes(item.section), `${item.title || item.url} has no section`);
  for (const system of library.systems) assert.ok(allowed.has(system.section), `${system.name} has no section`);
  for (const entry of library.libraries) assert.ok(allowed.has(entry.section), `${entry.name} has no section`);
  for (const doc of library.docs) {
    assert.ok(SECTIONS.includes(doc.section), `${doc.title} has no section`);
    assert.ok(doc.title && doc.href, `${doc.title} is missing a link`);
    const local = (value) => value && !/^(https?:)?\/\//.test(value) && !value.startsWith("/");
    if (local(doc.href)) assert.ok(existsSync(path.join(root, doc.href)), `${doc.href} is missing`);
    if (local(doc.thumb)) assert.ok(existsSync(path.join(root, doc.thumb)), `${doc.thumb} is missing`);
    for (const image of doc.images || []) if (local(image.src)) assert.ok(existsSync(path.join(root, image.src)), `${image.src} is missing`);
  }
  /* Site copy never uses em dashes. */
  const copy = JSON.stringify([library.systems, library.libraries, library.docs, library.manual]);
  assert.doesNotMatch(copy, /—/);
  /* The pieces the sections are built from. */
  assert.ok(library.docs.some((doc) => doc.section === "website" && /HOUSE-STYLE\.pdf$/.test(doc.href)));
  assert.ok(library.docs.some((doc) => doc.section === "website" && /contact-sheet\.pdf$/.test(doc.href)));
  assert.ok(library.systems.some((system) => system.section === "pretzel"));
  assert.ok(library.systems.some((system) => system.section === "heliopolis"));
});

test("design.html has the five sections and the nav between them", () => {
  const html = read("design.html");
  for (const id of SECTIONS) {
    assert.match(html, new RegExp(`id="${id}"`), id);
    assert.match(html, new RegExp(`href="#${id}"`), "nav to " + id);
  }
  assert.doesNotMatch(html, /—/);
  assert.match(html, /data-section="lab"/);
});
