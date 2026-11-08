import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchRepoCard,
  ConflictError,
  LIBRARY_PATH,
  applyOps,
  cleanClip,
  isPublicUrl,
  mergeVault,
  mutate,
  normalize,
  readLibrary,
  readPageMeta,
  upsertClip,
  urlKey,
} from "../lib/magpie-store.mjs";

function memoryStore(initial) {
  const files = new Map();
  let version = 0;
  if (initial) files.set(LIBRARY_PATH, { body: Buffer.from(JSON.stringify(initial)), etag: `v${++version}` });
  return {
    files,
    async read(path) {
      return files.get(path) || null;
    },
    async write(path, body, { ifMatch } = {}) {
      const current = files.get(path);
      if (ifMatch && current && current.etag !== ifMatch) throw new ConflictError("changed");
      files.set(path, { body: Buffer.from(body), etag: `v${++version}` });
    },
  };
}

const legacy = {
  items: [
    { title: "floor796", url: "https://floor796.com", type: "bookmark", tags: ["magpie", "stumbleupon"] },
    { title: "Land-book", url: "https://land-book.com/", type: "web page", tags: ["magpie", "desk:examples"] },
    { title: "HelioFlux idea", url: "https://example.org/hero", type: "web page", tags: ["magpie", "helioflux"] },
    { title: "A talk", url: "https://youtube.com/watch?v=abc", type: "video", tags: ["magpie"] },
    { title: "Tax rules", url: "https://irs.gov/x", type: "web page", tags: ["magpie"] },
  ],
};

test("an old library gets the four starter collections and obvious filing", () => {
  const lib = normalize(structuredClone(legacy));
  assert.deepEqual(lib.collections.map((c) => c.name), ["HelioFlux", "Design ideas", "Read & watch", "Weird & wonderful"]);
  assert.deepEqual(lib.items.map((i) => i.collection), ["weird", "design-ideas", "helioflux", "read-watch", ""]);
  assert.ok(lib.items.every((i) => /^c[a-f0-9]{12}$/.test(i.id)));
  /* Normalizing again changes nothing. */
  assert.deepEqual(normalize(structuredClone(lib)).items, lib.items);
});

test("the same address saved twice is one clip, and Kelly's edits survive", () => {
  const lib = normalize(structuredClone(legacy));
  const first = upsertClip(lib, cleanClip({ url: "https://www.new.dev/page/?utm_source=x", title: "New" }), "2026-11-08T00:00:00Z");
  assert.equal(first.existed, false);
  assert.equal(first.item.collection, "");
  applyOps(lib, [{ op: "edit", id: first.item.id, title: "My title", tags: "one, two" }]);
  const again = upsertClip(lib, cleanClip({ url: "https://new.dev/page#top", title: "New again" }), "2026-11-09T00:00:00Z");
  assert.equal(again.existed, true);
  assert.equal(lib.items.length, 6);
  assert.equal(again.item.title, "My title");
  assert.ok(again.item.tags.includes("one"));
  assert.equal(urlKey("https://www.new.dev/page/?utm_source=x"), urlKey("https://new.dev/page#top"));
});

test("collections nest, refuse loops, and deleting one sends clips to Unsorted", () => {
  const lib = normalize(structuredClone(legacy));
  const { created } = applyOps(lib, [{ op: "collection.create", name: "Logos", parent: "design-ideas" }]);
  const logos = created[0];
  assert.equal(lib.collections.find((c) => c.id === logos).parent, "design-ideas");
  assert.throws(() => applyOps(lib, [{ op: "collection.update", id: "design-ideas", parent: logos }]), /inside itself/);
  const landbook = lib.items[1].id;
  applyOps(lib, [{ op: "move", ids: [landbook], collection: logos }]);
  applyOps(lib, [{ op: "collection.delete", id: logos }]);
  assert.equal(lib.items[1].collection, "");
  assert.equal(lib.collections.some((c) => c.id === logos), false);
});

test("trash, restore and purge", () => {
  const lib = normalize(structuredClone(legacy));
  const id = lib.items[0].id;
  applyOps(lib, [{ op: "trash", ids: [id] }]);
  assert.ok(lib.items[0].removed);
  applyOps(lib, [{ op: "restore", ids: [id] }]);
  assert.equal(lib.items[0].removed, undefined);
  applyOps(lib, [{ op: "trash", ids: [id] }, { op: "purge", ids: [id] }]);
  assert.equal(lib.items.some((i) => i.id === id), false);
  assert.throws(() => applyOps(lib, [{ op: "nope" }]), /Unknown/);
});

test("a vault sync fills in page facts but keeps collections and edits", () => {
  const lib = normalize(structuredClone(legacy));
  const talk = lib.items[3];
  applyOps(lib, [{ op: "move", ids: [talk.id], collection: "helioflux" }, { op: "edit", id: talk.id, title: "Renamed" }]);
  const result = mergeVault(lib, [
    { title: "A talk (vault)", url: "https://www.youtube.com/watch?v=abc", hasTranscript: true, file: "magpie/clips/talk.md" },
    { title: "Only on the Mac", url: "https://mac.example/x", type: "web page", tags: ["magpie", "stumbleupon"] },
  ]);
  assert.deepEqual(result, { added: 1, updated: 1 });
  assert.equal(talk.collection, "helioflux");
  assert.equal(talk.title, "Renamed");
  assert.equal(talk.hasTranscript, true);
  /* First sync after the starter collections: the extra clip is filed too. */
  assert.equal(lib.items.at(-1).collection, "weird");
  const later = mergeVault(lib, [{ title: "Later", url: "https://mac.example/y", tags: ["stumbleupon"] }]);
  assert.equal(later.added, 1);
  assert.equal(lib.items.at(-1).collection, "");
});

test("writes retry on a conflict and keep one backup a day", async () => {
  const store = memoryStore(legacy);
  let sneaky = true;
  const realWrite = store.write.bind(store);
  store.write = async (path, body, options) => {
    if (path === LIBRARY_PATH && sneaky) {
      sneaky = false;
      await realWrite(path, store.files.get(path).body); /* someone else saved first */
    }
    return realWrite(path, body, options);
  };
  const { lib } = await mutate((library) => applyOps(library, [{ op: "collection.create", name: "Fonts" }]), store, () => "2026-11-08T10:00:00Z");
  assert.ok(lib.collections.some((c) => c.name === "Fonts"));
  assert.ok(store.files.has("magpie/backups/library-2026-11-08.json"));
  const { lib: reread } = await readLibrary(store);
  assert.ok(reread.collections.some((c) => c.name === "Fonts"));
  assert.equal(reread.backedUpOn, "2026-11-08");
});

test("only public addresses are fetched", () => {
  assert.equal(isPublicUrl("https://example.com/a.png"), true);
  for (const bad of ["http://localhost/x", "http://127.0.0.1:8765/clip", "http://192.168.1.4/", "http://10.0.0.1", "file:///etc/passwd", "https://example.com:8443/", "http://[::1]/"]) {
    assert.equal(isPublicUrl(bad), false, bad);
  }
});

test("a page's title, summary and picture are read from its head", () => {
  const meta = readPageMeta(
    `<html><head><title>Fallback</title><meta property="og:title" content="Nice &amp; Calm"><meta name="description" content="A summary."><meta property="og:image" content="/hero.png"></head></html>`,
    "https://www.example.com/post",
  );
  assert.equal(meta.title, "Nice & Calm");
  assert.equal(meta.description, "A summary.");
  assert.equal(meta.thumbnail, "https://www.example.com/hero.png");
  assert.equal(readPageMeta("", "https://youtu.be/x").type, "video");
});

test("a GitHub repo gets GitHub's own preview card, its custom image first", async () => {
  const asked = [];
  const fetcher = async (href) => {
    asked.push(href);
    if (href === "https://github.com/goabstract/Awesome-Design-Tools") {
      return { body: Buffer.from('<meta property="og:image" content="https://repository-images.githubusercontent.com/1/card.png">'), type: "text/html" };
    }
    return { body: Buffer.from("png"), type: "image/png" };
  };
  const card = await fetchRepoCard("goabstract", "Awesome-Design-Tools", { fetcher });
  assert.equal(card.type, "image/png");
  assert.equal(asked[1], "https://repository-images.githubusercontent.com/1/card.png");
  const plain = await fetchRepoCard("someone", "thing", { fetcher: async (href) => (href.startsWith("https://github.com/") ? null : { body: Buffer.from("x"), type: "image/png" }) });
  assert.ok(plain);
  assert.equal(await fetchRepoCard("../etc", "x", { fetcher }), null);
});
