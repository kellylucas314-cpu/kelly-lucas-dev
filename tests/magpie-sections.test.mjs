import assert from "node:assert/strict";
import test from "node:test";
import { SECTIONS, applySections, planSections, sectionFor } from "../lib/magpie-sections.mjs";
import { applyOps, cleanClip, iconHost, iconLinks, normalize, siteIcon, sniffIcon, upsertClip } from "../lib/magpie-store.mjs";

const clips = [
  { title: "floor796", url: "https://floor796.com", type: "bookmark", tags: ["stumbleupon"] },
  { title: "Land-book", url: "https://land-book.com/", type: "web page", tags: ["desk:examples"] },
  { title: "HelioFlux idea", url: "https://example.org/hero", type: "web page", tags: ["helioflux"] },
  { title: "A talk", url: "https://youtube.com/watch?v=abc", type: "video", tags: [] },
  { title: "Taste skill", url: "https://github.com/Leonxlnx/taste-skill", type: "web page", tags: [] },
  { title: "Photons", url: "https://www.nature.com/articles/x", type: "web page", tags: [] },
  { title: "21st", url: "https://21st.dev/", type: "web page", tags: ["components"] },
  { title: "Mystery", url: "https://example.com/what", type: "web page", tags: [] },
];
const library = () => normalize({ items: structuredClone(clips) }, "2026-11-01T00:00:00Z");
const where = (lib, title) => lib.items.find((item) => item.title === title).collection;

test("each kind of clip has one section, and the order decides", () => {
  const guess = (clip) => sectionFor(clip).section;
  assert.equal(guess(clips[0]), "weird");
  assert.equal(guess(clips[1]), "inspo");
  assert.equal(guess(clips[2]), "helioflux");
  assert.equal(guess(clips[3]), "read-watch");
  assert.equal(guess(clips[4]), "code");
  assert.equal(guess(clips[5]), "science");
  assert.equal(guess(clips[6]), "design-tools");
  assert.equal(guess(clips[7]), "");
  /* HelioFlux beats GitHub; GitHub beats everything else. */
  assert.equal(guess({ url: "https://github.com/a/b", tags: ["helioflux", "science"] }), "helioflux");
  assert.equal(guess({ url: "https://github.com/a/b", tags: ["science", "fun"] }), "code");
  assert.equal(sectionFor(clips[4]).why, "it’s on GitHub");
});

test("the first sort makes seven sections, files the clips and can be undone exactly", () => {
  const lib = library();
  const before = JSON.stringify({ items: lib.items, collections: lib.collections.map(({ id, name, color, parent }) => ({ id, name, color, parent })) });
  const plan = planSections(lib);
  assert.equal(plan.first, true);
  assert.equal(plan.counts.find((entry) => entry.id === "weird").name, "Random fun");

  const result = applyOps(lib, [{ op: "sections.sort" }], "2026-11-09T00:00:00Z");
  assert.ok(lib.sectionsOn);
  assert.deepEqual(lib.collections.map((entry) => entry.name).sort(), SECTIONS.map((section) => section.name).sort());
  assert.equal(where(lib, "Taste skill"), "code");
  assert.equal(where(lib, "Photons"), "science");
  assert.equal(where(lib, "21st"), "design-tools");
  assert.equal(where(lib, "Land-book"), "inspo");
  assert.equal(where(lib, "floor796"), "weird");
  assert.equal(where(lib, "Mystery"), "");
  assert.equal(lib.items.find((item) => item.title === "Photons").filedBy, "magpie");

  applyOps(lib, result.undo, "2026-11-09T00:01:00Z");
  assert.equal(lib.sectionsOn, undefined);
  const after = JSON.stringify({
    items: lib.items.map(({ filedBy, filedWhy, ...rest }) => rest),
    collections: lib.collections.map(({ id, name, color, parent }) => ({ id, name, color, parent })),
  });
  assert.equal(after.length, before.length);
  assert.deepEqual(
    Object.fromEntries(lib.items.map((item) => [item.title, item.collection])),
    Object.fromEntries(JSON.parse(before).items.map((item) => [item.title, item.collection])),
  );
  assert.deepEqual(lib.collections.map((entry) => entry.name).sort(), ["Design ideas", "HelioFlux", "Read & watch", "Weird & wonderful"]);
});

test("after the first sort, Kelly's own filing is never touched", () => {
  const lib = library();
  applySections(lib, "2026-11-09T00:00:00Z");
  applyOps(lib, [{ op: "collection.create", name: "Mine", id: "mine" }], "2026-11-09T00:02:00Z");
  const taste = lib.items.find((item) => item.title === "Taste skill");
  applyOps(lib, [{ op: "move", ids: [taste.id], collection: "mine" }], "2026-11-09T00:03:00Z");
  assert.equal(taste.filedBy, undefined);
  const again = applySections(lib, "2026-11-09T00:04:00Z");
  assert.equal(again.sorted, 0);
  assert.equal(taste.collection, "mine");
});

test("a new clip files itself once sections are on, unless it asks to wait", () => {
  const lib = library();
  const off = upsertClip(lib, cleanClip({ url: "https://github.com/x/early", title: "Early" }, "2026-11-09T01:00:00Z"), "2026-11-08T00:00:00Z").item;
  assert.equal(off.collection, "");
  applySections(lib, "2026-11-09T00:00:00Z");
  const auto = upsertClip(lib, cleanClip({ url: "https://github.com/x/y", title: "Y" }, "2026-11-09T01:00:00Z"), "2026-11-09T01:00:00Z").item;
  assert.equal(auto.collection, "code");
  assert.equal(auto.filedWhy, "it’s on GitHub");
  const wait = upsertClip(lib, cleanClip({ url: "https://github.com/x/z", title: "Z", collection: "unsorted" }, "2026-11-09T01:00:00Z"), "2026-11-09T01:00:00Z").item;
  assert.equal(wait.collection, "");
  const picked = upsertClip(lib, cleanClip({ url: "https://github.com/x/w", title: "W", collection: "science" }, "2026-11-09T01:00:00Z"), "2026-11-09T01:00:00Z").item;
  assert.equal(picked.collection, "science");
  assert.equal(picked.filedBy, undefined);
  /* A section Kelly deleted is respected: its clips wait in Unsorted. */
  applyOps(lib, [{ op: "collection.delete", id: "code" }], "2026-11-09T02:00:00Z");
  const later = upsertClip(lib, cleanClip({ url: "https://github.com/x/q", title: "Q" }, "2026-11-09T01:00:00Z"), "2026-11-09T03:00:00Z").item;
  assert.equal(later.collection, "");
});

test("site icons: only real pictures, only public hosts, asked for once", async () => {
  assert.equal(iconHost("www.GitHub.com"), "github.com");
  for (const bad of ["localhost", "127.0.0.1", "a/b.com", "x.internal", "", "evil.com/path"]) assert.equal(iconHost(bad), "");
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
  assert.equal(sniffIcon(png), "image/png");
  assert.equal(sniffIcon(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>1</script></svg>")), "");
  assert.deepEqual(
    iconLinks('<link rel="icon" href="/f.png"><link rel="apple-touch-icon" href="/t.png"><link rel="icon" href="/x.svg">', "https://x.com/"),
    ["https://x.com/t.png", "https://x.com/f.png"],
  );

  const files = new Map();
  const store = {
    async read(path) { return files.get(path) || null; },
    async write(path, body) { files.set(path, { body: Buffer.from(body), etag: "1" }); },
  };
  const asked = [];
  const fetcher = async (url) => {
    asked.push(url);
    if (url === "https://good.com/") return { body: Buffer.from('<link rel="icon" href="/i.png">'), type: "text/html", url };
    if (url === "https://good.com/i.png") return { body: png, type: "image/png", url };
    if (url === "https://svg.com/favicon.ico") return { body: Buffer.from("<svg><script>alert(1)</script></svg>      "), type: "image/x-icon", url };
    return null;
  };
  const now = () => new Date("2026-11-09T00:00:00Z");
  assert.equal((await siteIcon("good.com", { store, fetcher, now })).type, "image/png");
  assert.equal((await siteIcon("good.com", { store, fetcher, now })).type, "image/png");
  assert.equal(asked.length, 2, "the second ask is answered from the store");
  assert.equal(await siteIcon("svg.com", { store, fetcher, now }), null);
  const count = asked.length;
  assert.equal(await siteIcon("svg.com", { store, fetcher, now }), null);
  assert.equal(asked.length, count, "a site with no icon is not asked again for a month");
  assert.equal(await siteIcon("localhost", { store, fetcher, now }), null);
});
