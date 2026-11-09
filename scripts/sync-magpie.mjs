import { readFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { mergeVault, mutate } from "../lib/magpie-store.mjs";

const sourceRoot = path.resolve(
  process.argv[2] ||
  process.env.MAGPIE_SOURCE ||
  "/Users/kellylucas/Documents/GitHub/kip-workspace/magpie",
);
const libraryPath = path.join(sourceRoot, "library.json");
const library = JSON.parse(await readFile(libraryPath, "utf8"));
const items = Array.isArray(library.items) ? library.items : [];

if (!items.length) throw new Error("Magpie library is empty");

const thumbNames = [...new Set(
  items
    .map((item) => String(item.thumbLocal || "").split("/").pop())
    .filter(Boolean),
)];
const noteNames = [...new Set(
  items
    .map((item) => String(item.file || "").split("/").pop())
    .filter(Boolean),
)];

/* The Mac's pictures and notes go up as files. The library itself is
   merged, never overwritten: the website owns collections, trash and
   Kelly's edits, and keeps clips the Mac has never seen (phone saves). */
const tasks = [
  ...thumbNames.map((name) => ({
    pathname: `magpie/thumbs/${name}`,
    file: path.join(sourceRoot, "thumbs", name),
    contentType: name.toLowerCase().endsWith(".png")
      ? "image/png"
      : name.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/jpeg",
    maxAge: 86400,
  })),
  ...noteNames.map((name) => ({
    pathname: `magpie/notes/${name}`,
    file: path.join(sourceRoot, "clips", name),
    contentType: "text/markdown; charset=utf-8",
    maxAge: 60,
  })),
];

let cursor = 0;
const workers = Array.from({ length: Math.min(8, tasks.length) }, async () => {
  while (cursor < tasks.length) {
    const task = tasks[cursor++];
    const body = await readFile(task.file);
    await put(task.pathname, body, {
      access: "private",
      allowOverwrite: true,
      contentType: task.contentType,
      cacheControlMaxAge: task.maxAge,
    });
  }
});
await Promise.all(workers);

const { lib, result } = await mutate((cloud, stamp) => mergeVault(cloud, items, stamp));

console.log(
  `Merged ${items.length} vault clips into the library (${result.added} new, ${result.updated} updated; ` +
  `${lib.items.length} in all), with ${thumbNames.length} previews and ${noteNames.length} notes.`,
);
