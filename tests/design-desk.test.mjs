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

test("the design systems room is well formed, and holds no HelioFlux work", () => {
  const match = read("brain/systems-data.js").match(/window\.DESIGN_SYSTEMS\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  assert.ok(match, "data file shape");
  const room = JSON.parse(match[1]);
  const allowed = new Set(["lab", "heliopolis", "pretzel"]);
  for (const system of room.systems) assert.ok(allowed.has(system.section), `${system.name} has no section`);
  for (const entry of room.libraries) assert.ok(allowed.has(entry.section), `${entry.name} has no section`);
  for (const doc of room.docs) {
    assert.ok(allowed.has(doc.section), `${doc.title} has no section`);
    assert.ok(doc.title && doc.href, `${doc.title} is missing a link`);
    /* The room lives under /brain/, so every path on this site starts at the root. */
    const onSite = (value) => value && !/^(https?:)?\/\//.test(value);
    for (const value of [doc.href, doc.thumb, ...(doc.images || []).map((image) => image.src)]) {
      if (!onSite(value)) continue;
      assert.ok(value.startsWith("/"), `${value} must be an absolute path`);
      if (value.startsWith("/assets/")) assert.ok(existsSync(path.join(root, value)), `${value} is missing`);
    }
  }
  for (const id of allowed) assert.ok(room.systems.some((system) => system.section === id), `no system for ${id}`);
  const copy = JSON.stringify(room);
  assert.doesNotMatch(copy, /—/);
  /* This page is public; company work stays out of it. */
  assert.doesNotMatch(copy, /helioflux/i);
  assert.equal(existsSync(path.join(root, "assets/design/website")), false, "the HelioFlux pile is off the site");
});

test("the room page has its sections, and the old desk is gone", () => {
  const html = read("brain/systems.html");
  for (const id of ["heliopolis", "pretzel", "notebook", "lab"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
    assert.match(html, new RegExp(`href="#${id}"`), "nav to " + id);
  }
  assert.doesNotMatch(html, /—/);
  assert.doesNotMatch(html, /helioflux/i);
  assert.match(html, /href="\/brain\/gallery\.html"/);
  for (const gone of ["design.html", "design.js", "design-library.js"]) assert.equal(existsSync(path.join(root, gone)), false, gone);
  const vercel = JSON.parse(read("vercel.json"));
  assert.ok(vercel.redirects.some((entry) => entry.source === "/design.html" && entry.destination === "/brain/systems.html"));
  /* No site page still points at the old address. */
  for (const page of ["index.html", "magpie.html", "colophon.html", "log.html", "404.html", "playground.html", "brain/gallery.html"]) {
    assert.doesNotMatch(read(page), /href="\/design\.html"/, page);
  }
});
