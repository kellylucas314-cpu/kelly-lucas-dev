#!/usr/bin/env node
/* Takes a picture of every desk card that has none.

   The desk shows a Magpie preview when the vault has one. For everything
   else (hand-written links, clips with no preview) this script opens the
   page in a headless Chrome, shoots it at 1280 by 800, and shrinks the
   shot with sips into a small JPEG at assets/design/thumbs/<card id>.jpg.
   The sync picks those up by name, so run it afterwards:

           npm run shots:design                       (cards with no picture)
           npm run shots:design -- --force            (retake every card)
           npm run shots:design -- linear.app dub.co  (just these card ids)
           npm run sync:design

   Videos are skipped: the desk already shows their YouTube frame.
   Needs macOS (sips) and a Chrome. It looks in Playwright's browser cache
   first, then /Applications; CHROME_BIN=/path/to/chrome overrides both.
   No npm dependency. */

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = new Set(args.filter((arg) => !arg.startsWith("--")));

const worktree = path.resolve(import.meta.dirname, "..");
const thumbDir = path.join(worktree, "assets", "design", "thumbs");

const PAGE = { width: 1280, height: 800 };
const SHRINK_STEPS = [[800, 70], [720, 60], [640, 50]]; /* [width, jpeg quality] */
const MAX_BYTES = 190 * 1024;
const BLANK_BYTES = 10 * 1024; /* a white page shrinks to almost nothing */
const CONCURRENCY = 4;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

/* Same rule as the sync, so the two agree on a card's file name. */
function shotName(id) {
  const stem = String(id || "").replace(/[^a-z0-9.-]+/gi, "-").replace(/^-+|-+$/g, "");
  return stem ? `${stem}.jpg` : "";
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const cache = path.join(homedir(), "Library", "Caches", "ms-playwright");
  const inside = [
    "chrome-headless-shell-mac-arm64/chrome-headless-shell",
    "chrome-headless-shell-mac/chrome-headless-shell",
    "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  ];
  try {
    const builds = (await readdir(cache))
      .filter((name) => name.startsWith("chromium_headless_shell-") || name.startsWith("chromium-"))
      .sort()
      .reverse();
    for (const build of builds) {
      for (const rel of inside) {
        const file = path.join(cache, build, rel);
        if (await exists(file)) return file;
      }
    }
  } catch {
    /* no Playwright cache; fall through */
  }
  const installed = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (await exists(installed)) return installed;
  throw new Error(
    "No Chrome found. Set CHROME_BIN=/path/to/chrome, or run: npx playwright install chromium",
  );
}

async function loadLibrary() {
  const text = await readFile(path.join(worktree, "design-library.js"), "utf8");
  const match = text.match(/window\.DESIGN_LIBRARY\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) throw new Error("design-library.js has an unexpected shape");
  return JSON.parse(match[1]);
}

async function shoot(chrome, url, png) {
  await run(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--window-size=${PAGE.width},${PAGE.height}`,
      "--virtual-time-budget=12000",
      "--timeout=30000",
      `--user-agent=${USER_AGENT}`,
      `--screenshot=${png}`,
      url,
    ],
    { timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
  );
}

async function shrink(png, jpg) {
  let size = Infinity;
  for (const [width, quality] of SHRINK_STEPS) {
    await run("sips", [
      "-s", "format", "jpeg",
      "-s", "formatOptions", String(quality),
      "--resampleWidth", String(width),
      png, "--out", jpg,
    ]);
    size = (await stat(jpg)).size;
    if (size <= MAX_BYTES) break;
  }
  return size;
}

async function main() {
  const chrome = await findChrome();
  const library = await loadLibrary();
  await mkdir(thumbDir, { recursive: true });
  const scratch = await mkdtemp(path.join(tmpdir(), "desk-shots-"));

  const todo = [];
  for (const item of library.items) {
    if (item.kind === "video") continue;
    if (only.size && !only.has(item.id)) continue;
    const name = shotName(item.id);
    if (!name) continue;
    const dest = path.join(thumbDir, name);
    if (!force && (item.thumb || (await exists(dest)))) continue;
    todo.push({ item, dest, name });
  }
  console.log(`Taking ${todo.length} picture${todo.length === 1 ? "" : "s"} with ${path.basename(chrome)}`);

  const results = { taken: [], blank: [], failed: [] };
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const job = todo[next++];
      const label = job.item.title || job.item.url;
      const png = path.join(scratch, job.name.replace(/\.jpg$/, ".png"));
      try {
        await shoot(chrome, job.item.url, png);
        const size = await shrink(png, job.dest);
        if (size < BLANK_BYTES) {
          await rm(job.dest, { force: true });
          results.blank.push(label);
          console.log(`  blank   ${label}`);
        } else {
          results.taken.push(label);
          console.log(`  ok      ${label}  ${Math.round(size / 1024)} KB`);
        }
      } catch (error) {
        await rm(job.dest, { force: true });
        const reason = String(error.message || error).split("\n")[0].slice(0, 90);
        results.failed.push(`${label}: ${reason}`);
        console.log(`  failed  ${label}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  await rm(scratch, { recursive: true, force: true });

  console.log(`\n${results.taken.length} taken, ${results.blank.length} blank, ${results.failed.length} failed.`);
  for (const line of results.failed) console.log(`  - ${line}`);
  if (results.blank.length) console.log(`Blank (a wall, or nothing painted in time): ${results.blank.join(", ")}`);
  if (results.taken.length) console.log("\nNow run: npm run sync:design");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
