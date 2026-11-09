// A local preview of the site with a stand-in Magpie library, for testing
// the private pages without the password or the real vault.
//
//   node tests/magpie-preview.mjs          -> http://127.0.0.1:4410
//   PORT=4411 node tests/magpie-preview.mjs
//
// The stand-in library is built from the design desk's public clips
// (design-library.js), so nothing private is ever read or served. Sign in
// with any password except "wrong". /brain/gallery.html?empty=1 serves an
// empty library and ?fail=1 a broken one, to test those states. Saving,
// filing and collections use the real API code against a temp folder;
// GET /api/magpie-preview-key gives the feather key for testing a clip.

import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 4410);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

async function sampleLibrary() {
  const source = await readFile(path.join(root, "design-library.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox);
  const desk = sandbox.window.DESIGN_LIBRARY?.items || [];
  const kindToType = { video: "video", reading: "article", repo: "github", gallery: "web page", tool: "web page", site: "web page" };
  const origins = ["browser clipper", "browser clipper", "collector", "", "stumbleupon"];
  const items = desk.map((clip, index) => {
    const day = String(1 + (index % 27)).padStart(2, "0");
    const month = String(2 + (index % 9)).padStart(2, "0");
    const origin = origins[index % origins.length];
    const tags = [...(clip.tags || [])];
    if (origin === "stumbleupon") tags.push("stumbleupon", index % 3 ? "weird" : "fun");
    if (clip.section && clip.section !== "resources") tags.push(clip.section);
    return {
      title: clip.title,
      url: clip.url,
      site: clip.domain,
      type: kindToType[clip.kind] || "web page",
      tags,
      description: clip.why || "",
      note: index % 4 === 0 ? "Sample note: " + (clip.why || "worth a second look").slice(0, 90) : "",
      clippedAt: `2026-${month}-${day}T10:${String(index % 60).padStart(2, "0")}:00Z`,
      thumbLocal: clip.thumb ? "thumbs/" + clip.thumb.split("/").pop() : "",
      file: index % 5 === 3 ? "" : `clips/sample-${index}.md`,
      hasTranscript: clip.kind === "video" && index % 2 === 0,
      captureSource: origin === "stumbleupon" ? "" : origin,
      deskSection: clip.section || "",
      /* Like the real library: newer clips are still waiting in Unsorted. */
      ...(index % 5 === 1 ? { collection: "" } : {}),
    };
  });
  items.push({
    title: "A clip with no picture, no tags and a very long title that keeps going to test how the card wraps on a phone",
    url: "https://example.com/a/very/long/path",
    site: "example.com",
    type: "article",
    tags: [],
    description: "",
    clippedAt: "2026-08-19T09:00:00Z",
  });
  return { items };
}

/* The real API handlers run here against a throwaway folder instead of
   private Blob storage, so saving, filing and collections behave exactly as
   they will on the site. Nothing is written outside the temp folder. */
process.env.MAGPIE_SESSION_SECRET ||= randomBytes(32).toString("base64url");
const { clearSessionCookie, createSessionCookie, clipKey } = await import("../api/_magpie-auth.js");
const { ConflictError, LIBRARY_PATH } = await import("../lib/magpie-store.mjs");
const handlers = {
  "magpie-session": (await import("../api/magpie-session.js")).default,
  "magpie-library": (await import("../api/magpie-library.js")).default,
  "magpie-save": (await import("../api/magpie-save.js")).default,
  "magpie-update": (await import("../api/magpie-update.js")).default,
};

const dataDir = await mkdtemp(path.join(tmpdir(), "magpie-preview-"));
function fileBackend(dir) {
  const full = (name) => path.join(dir, name);
  const tag = (info) => `${info.mtimeMs}-${info.size}`;
  return {
    async read(name) {
      try {
        const [body, info] = await Promise.all([readFile(full(name)), stat(full(name))]);
        return { body, etag: tag(info) };
      } catch {
        return null;
      }
    },
    async write(name, body, { ifMatch } = {}) {
      if (ifMatch) {
        const info = await stat(full(name)).catch(() => null);
        if (info && tag(info) !== ifMatch) throw new ConflictError("changed");
      }
      await mkdir(path.dirname(full(name)), { recursive: true });
      await writeFile(full(name), body);
    },
  };
}
globalThis.__magpieBackend = fileBackend(dataDir);
const sample = await sampleLibrary();
await mkdir(path.join(dataDir, "magpie"), { recursive: true });
await writeFile(path.join(dataDir, LIBRARY_PATH), JSON.stringify(sample));

function json(response, body, status = 200, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let data = "";
  for await (const chunk of request) data += chunk;
  return data;
}

async function currentLibrary() {
  return JSON.parse(await readFile(path.join(dataDir, LIBRARY_PATH), "utf8"));
}

async function api(request, response, url) {
  const name = url.pathname.replace("/api/", "");
  const referer = request.headers.referer || "";
  const variant = referer.includes("empty=1") ? "empty" : referer.includes("fail=1") ? "fail" : "";
  if (name === "magpie-login") {
    const body = JSON.parse((await readBody(request)) || "{}");
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (body.password === "wrong" || !body.password) return json(response, { error: "That password did not work." }, 401);
    return json(response, { ok: true }, 200, { "Set-Cookie": createSessionCookie(request) });
  }
  if (name === "magpie-logout") return json(response, { ok: true }, 200, { "Set-Cookie": clearSessionCookie(request) });
  if (name === "magpie-preview-key") return json(response, { key: clipKey() });
  if (name === "magpie-library" && variant) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (variant === "fail") return json(response, { error: "Library is temporarily unavailable" }, 503);
    return json(response, { items: [], collections: [] });
  }
  if (handlers[name]) {
    const raw = await readBody(request);
    request.body = raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : undefined;
    if (name === "magpie-library") await new Promise((resolve) => setTimeout(resolve, 200));
    return handlers[name](request, response);
  }
  const { canUseLibrary } = await import("../api/_magpie-auth.js");
  if (!canUseLibrary(request)) return json(response, { error: "Sign in required" }, 401);
  if (name === "magpie-thumb" && url.searchParams.has("icon")) {
    /* No open web here, so every site shows its letter: the honest fallback. */
    response.writeHead(204, { "Cache-Control": "no-store" });
    return response.end();
  }
  if (name === "magpie-thumb") {
    const thumb = path.basename(url.searchParams.get("name") || "");
    const saved = path.join(dataDir, "magpie/thumbs", thumb);
    const exists = await stat(saved).then(() => true, () => false);
    return serveFile(response, exists ? saved : path.join(root, "assets/design/thumbs", thumb));
  }
  if (name === "magpie-note") {
    const file = url.searchParams.get("file") || "";
    const saved = path.join(dataDir, "magpie/notes", path.basename(file));
    if (await stat(saved).then(() => true, () => false)) {
      response.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
      return response.end(await readFile(saved));
    }
    const item = (await currentLibrary()).items.find((entry) => entry.file === file);
    if (!item) return json(response, { error: "Note not found" }, 404);
    response.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
    return response.end(
      `---\ntitle: "${item.title}"\nurl: ${item.url}\ntags: [${(item.tags || []).join(", ")}]\nclipped: ${item.clippedAt}\n---\n\n# ${item.title}\n\n` +
      `${item.description || "No description saved."}\n\n## Notes\n\n- This is a stand-in note from the local preview.\n- The real notes live in the vault on the Mac.\n\n## Excerpt\n\n> ${"Saved text from the page goes here. ".repeat(12)}\n`,
    );
  }
  return json(response, { error: "Not found" }, 404);
}

async function serveFile(response, file) {
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, "index.html");
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await readFile(path.join(root, "404.html")).catch(() => "Not found"));
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname.startsWith("/api/")) return api(request, response, url);
  const file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) return serveFile(response, "");
  return serveFile(response, url.pathname === "/" ? path.join(root, "index.html") : file);
}).listen(port, "127.0.0.1", () => {
  console.log(`Magpie preview on http://127.0.0.1:${port} (${sample.items.length} sample clips, data in ${dataDir})`);
});
