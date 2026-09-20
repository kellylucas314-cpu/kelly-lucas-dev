// Copies the private design library into private storage for
// /brain/design-library.html. The collection itself never enters this public
// repository: point this script at a local clone of the private library.
//
//   npm run sync:design-library -- /path/to/library-clone
//   node scripts/sync-design-library.mjs /path/to/clone --out /tmp/preview
//   node scripts/sync-design-library.mjs /path/to/clone --dry-run
//
// --out writes the exact private layout to a local folder instead of
// uploading, and --dry-run only lists what would be sent.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { resolveDesignFile } from "../api/magpie-design.js";

const run = promisify(execFile);

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
};
const outDir = option("--out");
const dryRun = flag("--dry-run");
const positional = args.filter((value, index) =>
  !value.startsWith("--") && args[index - 1] !== "--out");
const sourceRoot = path.resolve(positional[0] || process.env.DESIGN_LIBRARY_SOURCE || "");

if (!positional[0] && !process.env.DESIGN_LIBRARY_SOURCE) {
  throw new Error("Pass the path to a local clone of the private design library.");
}

const STUDY_FILE = /\.(?:html|css|js|png|ttf|txt)$/i;
const LONG_CACHE = 86400;
const SHORT_CACHE = 60;

async function readJson(relative) {
  const parsed = JSON.parse(await readFile(path.join(sourceRoot, relative), "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${relative} is not a list`);
  return parsed;
}

async function readText(relative) {
  try {
    return await readFile(path.join(sourceRoot, relative), "utf8");
  } catch {
    return "";
  }
}

async function git(...command) {
  try {
    const { stdout } = await run("git", ["-C", sourceRoot, ...command]);
    return stdout.trim();
  } catch {
    return "";
  }
}

// "Amaterasu — site" reads better as a name with a small detail beside it,
// and a few older titles still carry a pasted link marker.
function displayTitle(title) {
  const clean = String(title || "")
    .replace(/\s*↗\s*(?:\(external site, new tab\))?\s*$/u, "")
    .trim();
  const match = clean.match(/^(.*?)\s+[—·]\s+(.*)$/u);
  return match ? { name: match[1], detail: match[2] } : { name: clean, detail: "" };
}

// Notes link to other files in the collection. Those files are not on the
// website, so point the links at the private repository instead.
function resolveLinks(markdown, fromFile, repoUrl) {
  const directory = path.posix.dirname(fromFile);
  return markdown
    .split("\n")
    .filter((line) => !line.startsWith("[← "))
    .join("\n")
    .replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
      if (/^(?:https?:|mailto:|#)/i.test(target)) return whole;
      if (!repoUrl) return "]()";
      const resolved = path.posix.normalize(path.posix.join(directory, target));
      if (resolved.startsWith("..")) return "]()";
      return `](${repoUrl}/blob/main/${resolved.split("/").map(encodeURIComponent).join("/")})`;
    })
    .trim();
}

function originalCollections(readme) {
  const section = readme.split(/^## Original interactive collections\s*$/m)[1] || "";
  const links = [];
  for (const line of section.split("\n")) {
    if (line.startsWith("## ")) break;
    const match = line.match(/^- \[([^\]]+)\]\((https?:[^)\s]+)\)/);
    if (match) links.push({ title: match[1], url: match[2] });
  }
  return links;
}

// Each runnable study names its own page; everything beside that page that a
// browser can use travels with it. Local launchers stay behind.
async function studyFiles(studies) {
  const folders = new Set(studies
    .map((item) => path.posix.dirname(String(item.entrypoint || "").split("?")[0]))
    .filter((folder) => folder.startsWith("studies/")));
  const found = [];
  async function walk(relative) {
    const entries = await readdir(path.join(sourceRoot, relative), { withFileTypes: true });
    for (const entry of entries) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await walk(child);
      else if (STUDY_FILE.test(entry.name)) found.push(child);
    }
  }
  for (const folder of folders) await walk(folder);
  return found.sort();
}

async function guidePdf() {
  const names = await readdir(path.join(sourceRoot, "guide"));
  const pdf = names.filter((name) => name.toLowerCase().endsWith(".pdf")).sort()[0];
  if (!pdf) throw new Error("The guide folder has no PDF");
  return `guide/${pdf}`;
}

// Smaller previews keep the page quick on a phone. sips ships with macOS;
// anywhere else the page simply falls back to the original images.
async function makeThumb(workDir, source, name, longestSide) {
  const output = path.join(workDir, name);
  try {
    await run("sips", [
      "-s", "format", "jpeg",
      "-s", "formatOptions", "82",
      "-Z", String(longestSide),
      path.join(sourceRoot, source),
      "--out", output,
    ]);
    return output;
  } catch {
    return "";
  }
}

const [references, concepts, ideas, studies, manifest] = await Promise.all([
  readJson("data/references.json"),
  readJson("data/concepts.json"),
  readJson("data/ideas.json"),
  readJson("data/dala-particle-studies.json"),
  readJson("data/asset-manifest.json"),
]);
if (!references.length || !concepts.length) throw new Error("The design library is empty");

const readme = await readText("README.md");
const remote = await git("remote", "get-url", "origin");
const repoUrl = remote
  .replace(/^git@github\.com:/, "https://github.com/")
  .replace(/\.git$/, "");
const safeRepoUrl = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(repoUrl) ? repoUrl : "";

const workDir = await mkdtemp(path.join(os.tmpdir(), "design-library-"));
const tasks = new Map();

function addFile(file, localPath, maxAge = LONG_CACHE) {
  const target = resolveDesignFile(file);
  if (!target) throw new Error(`The website would refuse to serve ${file}`);
  tasks.set(file, { ...target, file, localPath, maxAge });
}

try {
  const expected = new Map(manifest.map((entry) => [entry.path, entry.sha256]));
  const previews = new Set(
    [...references, ...concepts].map((item) => item.preview).filter(Boolean),
  );
  const GUIDE_PDF = await guidePdf();
  for (const file of [...previews, GUIDE_PDF, ...(await studyFiles(studies))]) {
    addFile(file, path.join(sourceRoot, file));
  }

  // The collection records a hash for every preserved original. Refuse to
  // publish a copy that no longer matches its record.
  let verified = 0;
  for (const task of tasks.values()) {
    const recorded = expected.get(task.file);
    if (!recorded) continue;
    const actual = createHash("sha256").update(await readFile(task.localPath)).digest("hex");
    if (actual !== recorded) throw new Error(`${task.file} does not match its recorded hash`);
    verified += 1;
  }

  const thumbs = new Map();
  for (const concept of concepts) {
    if (!concept.preview) continue;
    const name = `${concept.id}.jpg`;
    const made = await makeThumb(workDir, concept.preview, name, 960);
    if (!made) continue;
    thumbs.set(concept.id, `thumbs/${name}`);
    addFile(`thumbs/${name}`, made);
  }
  let guideCover = "";
  const cover = await makeThumb(workDir, GUIDE_PDF, "guide-cover.jpg", 1200);
  if (cover) {
    guideCover = "thumbs/guide-cover.jpg";
    addFile(guideCover, cover);
  }

  const guideBytes = (await readFile(path.join(sourceRoot, GUIDE_PDF))).length;
  const catalog = {
    title: (readme.match(/^# (.+)$/m) || [])[1] || "Design library",
    repoUrl: safeRepoUrl,
    sourceCommit: (await git("rev-parse", "HEAD")).slice(0, 12),
    sourceDate: await git("log", "-1", "--format=%cs"),
    syncedAt: new Date().toISOString(),
    references: references.map((item) => ({
      id: item.id,
      ...displayTitle(item.title),
      group: item.group || "",
      category: item.category || "",
      note: item.note || "",
      url: item.url || "",
      motionUrl: item.motion_url || "",
      preview: item.preview || "",
      capturedOn: item.preview_credit?.captured_on || "",
    })),
    concepts: concepts.map((item) => ({
      id: item.id,
      ...displayTitle(item.title),
      group: item.group || "",
      note: item.note || "",
      url: item.url || "",
      preview: item.preview || "",
      thumb: thumbs.get(item.id) || "",
    })),
    studies: studies.map((item) => ({
      id: item.id,
      name: item.title || "",
      pieces: item.pieces || "",
      motion: item.motion || "",
      open: item.entrypoint || "",
    })),
    ideas: ideas.map((item) => ({
      id: item.id,
      name: item.title || "",
      note: item.note || "",
      why: item.why || "",
      motion: item.motion || "",
      url: item.url || "",
    })),
    guide: { file: GUIDE_PDF, bytes: guideBytes, cover: guideCover },
    documents: {
      guide: resolveLinks(await readText("guide/README.md"), "guide/README.md", safeRepoUrl),
      notes: resolveLinks(
        await readText("notes/PARTICLE-AND-MICROSCOPY.md"),
        "notes/PARTICLE-AND-MICROSCOPY.md",
        safeRepoUrl,
      ),
      provenance: resolveLinks(await readText("PROVENANCE.md"), "PROVENANCE.md", safeRepoUrl),
    },
    collections: originalCollections(readme),
  };

  // The page must never point at something that was not sent.
  const referenced = [
    ...catalog.references.map((item) => item.preview),
    ...catalog.concepts.flatMap((item) => [item.preview, item.thumb]),
    ...catalog.studies.map((item) => item.open.split("?")[0]),
    catalog.guide.file,
    catalog.guide.cover,
  ].filter(Boolean);
  for (const file of referenced) {
    if (!tasks.has(file)) throw new Error(`The catalog points at ${file}, which is not included`);
  }

  const catalogPath = path.join(workDir, "catalog.json");
  await writeFile(catalogPath, JSON.stringify(catalog));
  addFile("catalog.json", catalogPath, SHORT_CACHE);

  const queue = [...tasks.values()];
  const totalBytes = (await Promise.all(queue.map((task) => readFile(task.localPath))))
    .reduce((sum, body) => sum + body.length, 0);
  const summary =
    `${catalog.references.length} references, ${catalog.concepts.length} concepts, ` +
    `${catalog.studies.length} studies, ${catalog.ideas.length} ideas: ` +
    `${queue.length} files, ${(totalBytes / 1048576).toFixed(1)} MB, ` +
    `${verified} checked against recorded hashes, ${thumbs.size} small previews`;

  if (dryRun) {
    for (const task of queue) console.log(task.pathname);
    console.log(`Dry run. ${summary}.`);
  } else if (outDir) {
    for (const task of queue) {
      const destination = path.join(path.resolve(outDir), task.pathname);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, await readFile(task.localPath));
    }
    console.log(`Wrote the private layout to ${path.resolve(outDir)}. ${summary}.`);
  } else {
    const { put } = await import("@vercel/blob");
    const send = async (task) => put(task.pathname, await readFile(task.localPath), {
      access: "private",
      allowOverwrite: true,
      contentType: task.contentType,
      cacheControlMaxAge: task.maxAge,
    });
    // The catalog goes last, so the page never points at a file in flight.
    const files = queue.filter((task) => task.file !== "catalog.json");
    let cursor = 0;
    const workers = Array.from({ length: Math.min(8, files.length) }, async () => {
      while (cursor < files.length) await send(files[cursor++]);
    });
    await Promise.all(workers);
    await send(tasks.get("catalog.json"));
    console.log(`Synced to private storage. ${summary}.`);
  }
} finally {
  await rm(workDir, { recursive: true, force: true });
}
