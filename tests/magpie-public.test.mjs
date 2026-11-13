import assert from "node:assert/strict";
import test from "node:test";
import { applyOps, cleanClip, normalize, upsertClip } from "../lib/magpie-store.mjs";
import { applySections } from "../lib/magpie-sections.mjs";
import {
  isPublicThumb,
  looksPersonal,
  openCollections,
  planPublic,
  publicView,
} from "../lib/magpie-public.mjs";

const STAMP = "2026-11-13T12:00:00Z";

/* A small library, sorted into sections the way the page does it. */
function sortedLibrary() {
  const lib = normalize({
    items: [
      { title: "Motion", url: "https://motion.dev", type: "web page", tags: ["magpie", "animation"], note: "Use for springy UI.", description: "An animation library.", thumbLocal: "thumbs/motion.jpg", file: "clips/motion.md" },
      { title: "A repo", url: "https://github.com/someone/thing", type: "github", tags: ["magpie"] },
      { title: "A talk", url: "https://youtube.com/watch?v=abc", type: "video", tags: ["magpie"] },
      { title: "HelioFlux hero ideas", url: "https://example.org/hero", type: "web page", tags: ["magpie", "helioflux"], thumbLocal: "thumbs/hf.jpg" },
      { title: "Deck notes", url: "https://docs.google.com/document/d/abc", type: "web page", tags: ["magpie", "design"] },
      { title: "Font pairing guide", url: "https://fonts.example.com/pairing", type: "article", tags: ["magpie", "typography"], note: "Ask sam@example.com for the file." },
      { title: "floor796", url: "https://floor796.com", type: "bookmark", tags: ["magpie", "stumbleupon"] },
      { title: "Nothing to go on", url: "https://example.net/zzz", type: "web page", tags: [] },
    ],
  });
  applySections(lib, STAMP);
  return lib;
}

test("a closed library gives a visitor nothing", () => {
  const lib = sortedLibrary();
  assert.equal(openCollections(lib).size, 0);
  const view = publicView(lib);
  assert.deepEqual(view.items, []);
  assert.deepEqual(view.collections, []);
  assert.equal(isPublicThumb(lib, "motion.jpg"), false);
});

test("the plan says what would open and what would be kept in, without changing anything", () => {
  const lib = sortedLibrary();
  const before = JSON.stringify(lib);
  const plan = planPublic(lib);
  assert.equal(JSON.stringify(lib), before);
  assert.equal(plan.on, false);
  assert.equal(plan.ready, true);
  assert.ok(plan.total >= 3);
  assert.ok(plan.counts.every((entry) => !/helioflux/i.test(entry.name)));
  assert.ok(plan.closed.some((entry) => /helioflux/i.test(entry.name) && entry.locked));
  const why = Object.fromEntries(plan.held.map((entry) => [entry.title, entry.why]));
  assert.match(why["Deck notes"] || "", /docs\.google\.com/);
  assert.match(why["Font pairing guide"] || "", /email address/);
});

test("opening needs sections first", () => {
  const lib = normalize({ items: [{ title: "Motion", url: "https://motion.dev" }] });
  assert.throws(() => applyOps(lib, [{ op: "public.open" }], STAMP), /Sort the library/);
  assert.equal(lib.publicOn, undefined);
});

test("an open library shows the card, never the saved copy, and never HelioFlux, Unsorted, Trash or personal clips", () => {
  const lib = sortedLibrary();
  const trashed = lib.items.find((item) => item.title === "A talk");
  applyOps(lib, [{ op: "trash", ids: [trashed.id] }], STAMP);
  const result = applyOps(lib, [{ op: "public.open" }], STAMP);
  assert.equal(lib.publicOn, STAMP);
  assert.equal(result.marked.length, 2);

  const view = publicView(lib);
  const titles = view.items.map((item) => item.title).sort();
  assert.deepEqual(titles, ["A repo", "Motion", "floor796"]);
  assert.ok(view.collections.length >= 3);
  assert.ok(view.collections.every((entry) => !/helioflux/i.test(entry.name)));

  const motion = view.items.find((item) => item.title === "Motion");
  assert.equal(motion.note, "Use for springy UI.");
  assert.equal(motion.file, undefined, "the saved copy stays Kelly's");
  assert.equal(motion.captureSource, undefined);
  assert.ok(!motion.tags.includes("magpie"));
  assert.equal(JSON.stringify(view).includes("HelioFlux hero"), false);
  assert.equal(JSON.stringify(view).includes("sam@example.com"), false);

  assert.equal(isPublicThumb(lib, "motion.jpg"), true);
  assert.equal(isPublicThumb(lib, "hf.jpg"), false);
  assert.equal(isPublicThumb(lib, "nope.jpg"), false);
});

test("HelioFlux can never be opened, by section or by name", () => {
  const lib = sortedLibrary();
  applyOps(lib, [{ op: "public.open" }], STAMP);
  const helio = lib.collections.find((entry) => /helioflux/i.test(entry.name));
  assert.throws(() => applyOps(lib, [{ op: "public.collection", id: helio.id, on: true }], STAMP), /HelioFlux stays private/);
  /* Even if the list were edited by hand. */
  lib.publicCollections.push(helio.id);
  assert.equal(openCollections(lib).has(helio.id), false);
  assert.equal(publicView(lib).items.some((item) => /HelioFlux/.test(item.title)), false);
  const made = applyOps(lib, [{ op: "collection.create", name: "HelioFlux decks" }], STAMP);
  assert.throws(() => applyOps(lib, [{ op: "public.collection", id: made.created[0], on: true }], STAMP), /HelioFlux stays private/);
});

test("Kelly can lock one clip, release a held one, and keep a whole collection in", () => {
  const lib = sortedLibrary();
  applyOps(lib, [{ op: "public.open" }], STAMP);
  const motion = lib.items.find((item) => item.title === "Motion");
  const held = lib.items.find((item) => item.title === "Font pairing guide");
  assert.equal(held.private, true);
  assert.match(held.privateWhy, /email/);

  applyOps(lib, [{ op: "private", ids: [motion.id], on: true }], STAMP);
  assert.equal(publicView(lib).items.some((item) => item.id === motion.id), false);
  applyOps(lib, [{ op: "private", ids: [held.id], on: false }], STAMP);
  assert.equal(publicView(lib).items.some((item) => item.id === held.id), true);
  /* A released clip is not marked again by a later edit. */
  applyOps(lib, [{ op: "edit", id: held.id, note: "Still ask sam@example.com." }], STAMP);
  assert.equal(publicView(lib).items.some((item) => item.id === held.id), true);

  const where = held.collection;
  applyOps(lib, [{ op: "public.collection", id: where, on: false }], STAMP);
  assert.equal(publicView(lib).items.some((item) => item.collection === where), false);
});

test("closing shuts everything, and Undo of opening takes the marks back off", () => {
  const lib = sortedLibrary();
  const { marked } = applyOps(lib, [{ op: "public.open" }], STAMP);
  const mine = lib.items.find((item) => item.title === "Motion");
  applyOps(lib, [{ op: "private", ids: [mine.id], on: true }], STAMP);
  applyOps(lib, [{ op: "public.close", unmark: [...marked, mine.id] }], STAMP);
  assert.equal(lib.publicOn, undefined);
  assert.deepEqual(publicView(lib).items, []);
  assert.ok(lib.items.filter((item) => marked.includes(item.id)).every((item) => !item.private));
  assert.equal(mine.private, true, "a clip Kelly locked herself stays locked");
});

test("while open, new and moved clips are checked on the way in", () => {
  const lib = sortedLibrary();
  applyOps(lib, [{ op: "public.open" }], STAMP);
  const safe = upsertClip(lib, cleanClip({ url: "https://github.com/someone/other", title: "Another repo" }), STAMP);
  assert.ok(publicView(lib).items.some((item) => item.id === safe.item.id), "a new clip in an open section shows by itself");

  const personal = upsertClip(lib, cleanClip({ url: "https://github.com/someone/private-thing?token=abc123", title: "A repo with a key in the address" }), STAMP);
  assert.equal(personal.item.private, true);
  assert.equal(publicView(lib).items.some((item) => item.id === personal.item.id), false);

  const unsorted = lib.items.find((item) => item.title === "Nothing to go on");
  assert.equal(unsorted.collection, "");
  assert.equal(publicView(lib).items.some((item) => item.id === unsorted.id), false, "Unsorted is never on show");

  const helio = lib.items.find((item) => /HelioFlux/.test(item.title));
  const open = [...openCollections(lib)][0];
  const moved = applyOps(lib, [{ op: "move", ids: [helio.id], collection: open }], STAMP);
  assert.deepEqual(moved.held, [helio.id]);
  assert.equal(publicView(lib).items.some((item) => item.id === helio.id), false, "HelioFlux work dragged into an open section is still kept in");
});

test("the personal check reads addresses, tags and Kelly's own words, not the page's", () => {
  assert.equal(looksPersonal({ url: "https://motion.dev", title: "Motion", note: "Great springs." }), "");
  assert.equal(looksPersonal({ url: "https://vercel.com/blog/a-post", title: "A post" }), "");
  assert.equal(looksPersonal({ url: "https://www.linkedin.com/posts/someone-123", title: "A post" }), "");
  assert.match(looksPersonal({ url: "https://mail.google.com/mail/u/0/#inbox/abc" }), /signed-in/);
  assert.match(looksPersonal({ url: "https://www.notion.so/workspace/Plan-abc" }), /signed-in/);
  assert.match(looksPersonal({ url: "https://claude.ai/chat/abc" }), /signed-in/);
  assert.match(looksPersonal({ url: "http://localhost:3000/x" }), /private network/);
  assert.match(looksPersonal({ url: "https://example.com/x", tags: ["investors"] }), /tagged investors/);
  assert.match(looksPersonal({ url: "https://example.com/x", note: "call 415-555-0133" }), /phone number/);
  assert.match(looksPersonal({ url: "https://helioflux.co/pricing", title: "Pricing" }), /HelioFlux/);
  assert.match(looksPersonal({ url: "https://example.com/x", title: "Series A term sheet template" }), /term sheet/);
  /* A page that merely describes itself with one of these words is fine. */
  assert.equal(looksPersonal({ url: "https://example.com/x", title: "A password manager review", description: "x" }) !== "", true);
  assert.equal(looksPersonal({ url: "https://example.com/y", title: "Type scale", description: "Keep it confidential? No." }), "");
});
