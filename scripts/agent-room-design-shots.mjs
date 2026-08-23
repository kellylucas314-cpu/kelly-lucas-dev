/**
 * Design-pass screenshots for the Agent Commons room.
 *
 *   node scripts/agent-room-design-shots.mjs --out docs/agent-commons/screenshots/<folder> [--scenario full|stress|empty] [--set core|all]
 *
 * Starts a throwaway loopback server with the synthetic fixture (never the live
 * room) and captures the overview at 1440, 768, and 390; with --set all it also
 * captures the thread, the reply composer, the finished-work form, Everything,
 * Needs you, Finished work, Wrapped up, and a keyboard-focus shot at each width.
 * Requires playwright-cli on PATH, like the browser QA script.
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { buildFixture } = await import(pathToFileURL(path.join(PROJECT, "scripts/agent-room-fixture.mjs")).href);
const { createLocalRoomServer } = await import(pathToFileURL(path.join(PROJECT, "scripts/agent-room-local.mjs")).href);

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]]); return acc; }, []));
if (!args.out) throw new Error("--out <dir> is required");
const out = path.resolve(args.out);
const scenario = args.scenario || "full";
const set = args.set || "core";
const SESSION = `ac-shoot-${process.pid}`;
await mkdir(out, { recursive: true });

const cli = (a) => new Promise((resolve, reject) => {
  execFile("playwright-cli", [`-s=${SESSION}`, ...a], { cwd: out, encoding: "utf8", timeout: 60_000 }, (error, stdout, stderr) => {
    if (error && error.code !== 1) return reject(error);
    resolve(`${stdout}${stderr}`);
  });
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const evalJs = async (expr) => {
  const text = (await cli(["eval", expr, "--raw"])).trim();
  const lines = text.split("\n");
  for (let s = 0; s < lines.length; s++) for (let e = lines.length; e > s; e--) { try { return JSON.parse(lines.slice(s, e).join("\n").trim()); } catch {} }
  return text;
};

const dir = await mkdtemp(path.join(tmpdir(), "ac-shoot-"));
const stateFile = path.join(dir, "state.json");
await writeFile(stateFile, JSON.stringify(buildFixture(scenario), null, 2), { mode: 0o600 });
const server = createLocalRoomServer({ stateFile, upstreamConfigFile: path.join(dir, "no-upstream.json") });
await new Promise((res, rej) => { server.once("error", rej); server.listen(0, "127.0.0.1", res); });
const origin = `http://127.0.0.1:${server.address().port}`;
const report = {};

async function shot(name, { full = false } = {}) {
  await cli(["screenshot", ...(full ? ["--full-page"] : []), `--filename=${name}.png`]);
}
async function overflow(label) {
  const delta = await evalJs("document.documentElement.scrollWidth - window.innerWidth");
  report[label] = { overflow: delta };
}

try {
  await cli(["open", `${origin}/brain/room.html#view=overview`]);
  for (const [w, h, tag] of [[1440, 900, "desktop-1440"], [768, 1024, "tablet-768"], [390, 844, "mobile-390"]]) {
    await writeFile(stateFile, JSON.stringify(buildFixture(scenario), null, 2), { mode: 0o600 });
    await cli(["resize", String(w), String(h)]);
    await cli(["goto", `${origin}/brain/room.html#view=overview`]);
    await cli(["reload"]);
    await wait(1400);
    await overflow(`${tag}-overview`);
    await shot(`${tag}-overview`);
    if (tag === "mobile-390") {
      await shot(`${tag}-overview-full`, { full: true });
      await cli(["eval", "window.scrollTo(0, 700)"]); await wait(300); await shot(`${tag}-overview-scrolled`);
      await cli(["eval", "window.scrollTo(0, 0)"]);
    }

    if (set === "all") {
      // thread view with composer open
      await cli(["goto", `${origin}/brain/room.html#thread=lantern-demo-deck`]);
      await cli(["reload"]);
      await wait(1000);
      await overflow(`${tag}-thread`);
      await shot(`${tag}-thread`);
      if (tag !== "desktop-1440") await shot(`${tag}-thread-full`, { full: true });
      // what Kelly gets when she presses the primary "Reply to ..." button
      await cli(["eval", "(() => { const b = document.querySelector('.thread-head [data-reply]'); if (b) b.click(); return 1; })()"]);
      await wait(400);
      await shot(`${tag}-composer-reply`);
      // the deliberate structured "Finished work" form (agents' receipt), for completeness
      await cli(["eval", "(() => { const k = document.getElementById('kindSelect'); k.value='receipt'; k.dispatchEvent(new Event('change')); return 1; })()"]);
      await wait(300);
      await shot(`${tag}-composer-finished-work-form`);
      // whole room
      await cli(["goto", `${origin}/brain/room.html#view=room`]);
      await cli(["reload"]);
      await wait(900);
      await overflow(`${tag}-room`);
      await shot(`${tag}-room`);
      // inbox
      await cli(["goto", `${origin}/brain/room.html#view=inbox`]);
      await cli(["reload"]);
      await wait(900);
      await shot(`${tag}-inbox`);
      // work log
      await cli(["goto", `${origin}/brain/room.html#view=receipts`]);
      await cli(["reload"]);
      await wait(900);
      await shot(`${tag}-worklog`);
      // resolved
      await cli(["goto", `${origin}/brain/room.html#view=resolved`]);
      await cli(["reload"]);
      await wait(900);
      await shot(`${tag}-resolved`);
      // keyboard focus on first view option
      await cli(["goto", `${origin}/brain/room.html#view=overview`]);
      await cli(["reload"]);
      await wait(900);
      await cli(["press", "Tab"]); await cli(["press", "Tab"]); await cli(["press", "Tab"]);
      await wait(200);
      await shot(`${tag}-focus`);
    }
  }
} finally {
  await cli(["close"]);
  await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
}
await writeFile(path.join(out, "report.json"), JSON.stringify(report, null, 2));
process.stdout.write(JSON.stringify(report) + "\n");
