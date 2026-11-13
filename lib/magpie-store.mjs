/* lib/magpie-store.mjs: the one Magpie library, kept in private Blob storage.

   magpie/library.json holds every clip and every collection. The website,
   the Chrome feather and the Mac all read and write the same file, so this
   module is the only place that changes it:

     - normalize()   gives every clip a stable id and a collection, and the
                     first time it sees an old library, adds Kelly's four
                     starter collections and files the obvious clips.
     - saveClip()    adds or updates a clip (same address = same clip).
     - applyOps()    files, edits, trashes and restores clips, and makes,
                     renames, moves and deletes collections.
     - mergeVault()  folds the Mac vault's library into the cloud one without
                     undoing anything Kelly organised on the website.

   Writes are read, change, write with the blob's ETag, so two saves at once
   retry instead of overwriting each other. The first write of each day
   keeps a copy in magpie/backups/. */

import { createHash, randomUUID } from "node:crypto";
import rules from "./desk-rules.json" with { type: "json" };
import { sortClip } from "./desk-sort.mjs";
import { applySections, fileNewClip, sectionTargets } from "./magpie-sections.mjs";
import { closeLibrary, guardNewClip, openLibrary } from "./magpie-public.mjs";

export const LIBRARY_PATH = "magpie/library.json";
export const COLORS = ["teal", "coral", "honey", "sage", "navy", "deep-teal", "deep-coral"];

export const STARTER = [
  { id: "helioflux", name: "HelioFlux", color: "navy" },
  { id: "design-ideas", name: "Design ideas", color: "coral" },
  { id: "read-watch", name: "Read & watch", color: "teal" },
  { id: "weird", name: "Weird & wonderful", color: "honey" },
];

/* Fields the Mac vault owns: what the page said, and what the Mac saved
   about it (papers, transcripts, pictures, the note file). */
const VAULT_FIELDS = [
  "url", "site", "author", "type", "description", "thumbnail", "thumbLocal",
  "file", "hasTranscript", "captureSource", "doi", "journal", "pdfUrl",
  "pdfLocal", "textLocal", "paperStatus", "paperPages", "textChars",
  "hasFullText", "deskSection",
];
/* Fields Kelly can change on the website. Once she has, the website wins. */
const KELLY_FIELDS = ["title", "note", "tags"];

/* ---------- small helpers ---------- */

export function clean(value, max = 500) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

export function safeHttpUrl(value) {
  const candidate = clean(value, 2048);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

/* Two addresses are the same clip when they differ only by www, a trailing
   slash, a #fragment or tracking parameters. */
export function urlKey(value) {
  const href = safeHttpUrl(value);
  if (!href) return "";
  const url = new URL(href);
  url.hash = "";
  for (const name of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|si$)/i.test(name)) url.searchParams.delete(name);
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const path = url.pathname.replace(/\/+$/, "");
  const query = url.searchParams.toString();
  return `${host}${path}${query ? "?" + query : ""}`;
}

export function itemId(item = {}) {
  const basis = urlKey(item.url) || clean(item.file, 300) || clean(item.title, 300) || randomUUID();
  return "c" + createHash("sha1").update(basis).digest("hex").slice(0, 12);
}

export function slugify(text) {
  return (
    String(text || "clip")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "clip"
  );
}

function cleanTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags || "").split(",");
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const tag = clean(raw, 60).replace(/^#/, "").toLowerCase().replace(/\s+/g, "-");
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= 40) break;
  }
  return out;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* ---------- normalize ---------- */

/* Where an old clip goes the first time collections appear. Kelly's own
   shelf names from the Mac Magpie; anything unclear waits in Unsorted. */
export function starterCollection(item = {}) {
  const tags = (item.tags || []).map((tag) => String(tag).toLowerCase());
  const type = String(item.type || "").toLowerCase();
  let section = item.deskSection || "";
  const deskTag = tags.find((tag) => tag.startsWith("desk:"));
  if (!section && deskTag) section = deskTag.slice(5);
  if (!section) {
    try {
      const verdict = sortClip(item, rules);
      section = verdict.onDesk ? verdict.section : "";
    } catch {
      section = "";
    }
  }
  if (section === "none") section = "";
  if (section === "website" || tags.includes("helioflux")) return "helioflux";
  if (tags.includes("stumbleupon") || tags.includes("weird") || type === "bookmark") return "weird";
  if (section) return "design-ideas";
  if (["video", "article", "paper", "reading"].includes(type)) return "read-watch";
  return "";
}

function cleanCollection(raw = {}, now) {
  const id = clean(raw.id, 60);
  if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(id)) return null;
  return {
    id,
    name: clean(raw.name, 60) || "Untitled",
    parent: clean(raw.parent, 60),
    color: COLORS.includes(raw.color) ? raw.color : "teal",
    createdAt: clean(raw.createdAt, 40) || now,
  };
}

export function normalize(raw, now = new Date().toISOString()) {
  const lib = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const items = Array.isArray(lib.items) ? lib.items : [];
  const fresh = !Array.isArray(lib.collections);
  let collections = (fresh ? STARTER : lib.collections)
    .map((entry) => cleanCollection(entry, now))
    .filter(Boolean);
  const ids = new Set(collections.map((entry) => entry.id));
  /* A parent that no longer exists, or a loop, puts the collection at the top. */
  collections = collections.map((entry) => {
    if (!entry.parent || !ids.has(entry.parent) || entry.parent === entry.id) return { ...entry, parent: "" };
    let cursor = entry.parent;
    for (let depth = 0; cursor && depth < 20; depth += 1) {
      if (cursor === entry.id) return { ...entry, parent: "" };
      cursor = collections.find((other) => other.id === cursor)?.parent || "";
    }
    return entry;
  });

  const seen = new Set();
  const out = [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const id = /^c[a-f0-9]{12}$/.test(entry.id || "") ? entry.id : itemId(entry);
    if (seen.has(id)) continue;
    seen.add(id);
    let collection = entry.collection;
    if (typeof collection !== "string") collection = fresh ? starterCollection(entry) : "";
    if (collection && !ids.has(collection)) collection = "";
    out.push({ ...entry, id, collection });
  }
  const result = { ...lib, version: 2, items: out, collections };
  if (fresh) result.starterOn = now;
  return result;
}

/* ---------- notes ---------- */

export function clipToMarkdown(clip, tags) {
  const date = String(clip.clippedAt || new Date().toISOString()).slice(0, 10);
  const esc = (value) => String(value || "").replace(/"/g, '\\"');
  const lines = [
    "---",
    `title: "${esc(clip.title)}"`,
    `url: "${esc(clip.url)}"`,
    `site: "${esc(clip.site)}"`,
    clip.author ? `author: "${esc(clip.author)}"` : null,
    `type: ${clip.type || "web page"}`,
    clip.captureSource ? `capture_source: "${esc(clip.captureSource)}"` : null,
    `date: ${date}`,
    clip.thumbnail ? `thumbnail: "${esc(clip.thumbnail)}"` : null,
    `tags: [${["magpie", ...tags.filter((tag) => tag !== "magpie")].join(", ")}]`,
    "---",
    "",
    `# ${clip.title || "Untitled clip"}`,
    "",
    clip.note ? `## My notes / description\n\n${String(clip.note).trim()}\n` : null,
    clip.description ? `## Page summary\n\n> ${String(clip.description).trim().replace(/\n/g, "\n> ")}\n` : null,
    `[Open original](${clip.url})`,
    "",
    "## Content",
    "",
    clip.markdown || "*(no text extracted)*",
    clip.transcript ? `\n## Transcript\n\n${clip.transcript}` : null,
    "",
  ].filter((line) => line !== null);
  return lines.join("\n");
}

/* ---------- the store ---------- */

export class ConflictError extends Error {}

/* A backend has read(path) -> { body: Buffer, etag } | null and
   write(path, body, { contentType, ifMatch }) -> void, throwing
   ConflictError when ifMatch no longer matches. */
export function vercelBackend() {
  let blob;
  const load = async () => (blob ||= await import("@vercel/blob"));
  return {
    async read(path) {
      const { get } = await load();
      const result = await get(path, { access: "private" });
      if (!result || result.statusCode !== 200) return null;
      const chunks = [];
      const reader = result.stream.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
      }
      return { body: Buffer.concat(chunks), etag: result.blob?.etag || "" };
    },
    async write(path, body, { contentType, ifMatch } = {}) {
      const { put } = await load();
      try {
        await put(path, body, {
          access: "private",
          allowOverwrite: true,
          addRandomSuffix: false,
          contentType,
          cacheControlMaxAge: 0,
          ...(ifMatch ? { ifMatch } : {}),
        });
      } catch (error) {
        const name = String(error?.name || error?.constructor?.name || "");
        if (/Precondition/i.test(name) || error?.status === 412 || /precondition/i.test(String(error?.message))) {
          throw new ConflictError("The library changed while saving");
        }
        throw error;
      }
    },
  };
}

export function backend() {
  return globalThis.__magpieBackend || (globalThis.__magpieBackend = vercelBackend());
}

export async function readLibrary(store = backend()) {
  const file = await store.read(LIBRARY_PATH);
  if (!file) return { lib: normalize({ items: [] }), etag: "" };
  return { lib: normalize(JSON.parse(file.body.toString("utf8"))), etag: file.etag };
}

/* Read, change, write. change(lib) edits lib in place and returns a result. */
export async function mutate(change, store = backend(), now = () => new Date().toISOString()) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const file = await store.read(LIBRARY_PATH);
    const raw = file ? JSON.parse(file.body.toString("utf8")) : { items: [] };
    const stamp = now();
    const today = stamp.slice(0, 10);
    if (file && raw.backedUpOn !== today) {
      await store.write(`magpie/backups/library-${today}.json`, file.body, {
        contentType: "application/json; charset=utf-8",
      });
    }
    const lib = normalize(raw, stamp);
    const result = await change(lib, stamp);
    lib.backedUpOn = today;
    lib.updatedAt = stamp;
    try {
      await store.write(LIBRARY_PATH, JSON.stringify(lib, null, 1), {
        contentType: "application/json; charset=utf-8",
        ifMatch: file ? file.etag : undefined,
      });
      return { lib, result };
    } catch (error) {
      if (!(error instanceof ConflictError) || attempt === 3) throw error;
    }
  }
  throw new ConflictError("The library is busy; try again");
}

/* ---------- saving a clip ---------- */

/* Turns whatever the feather (or the website's Add box) sent into a clean
   clip. Untrusted input: every field is cut to size. */
export function cleanClip(body = {}, now = new Date().toISOString()) {
  const url = safeHttpUrl(body.url);
  if (!url) throw Object.assign(new Error("A clip needs a web address"), { status: 400 });
  return {
    title: clean(body.title, 300) || hostOf(url) || "Untitled clip",
    url,
    site: clean(body.site, 120) || hostOf(url),
    author: clean(body.author, 160),
    type: clean(body.type, 30).toLowerCase() || "web page",
    description: clean(body.description, 500),
    note: clean(body.note, 20000),
    tags: cleanTags(body.tags).filter((tag) => tag !== "magpie"),
    thumbnail: safeHttpUrl(body.thumbnail),
    markdown: clean(body.markdown, 400000),
    transcript: clean(body.transcript, 400000),
    captureSource: clean(body.captureSource, 60),
    clippedAt: /^\d{4}-\d{2}-\d{2}T/.test(String(body.clippedAt || "")) ? clean(body.clippedAt, 40) : now,
    collection: typeof body.collection === "string" ? clean(body.collection, 60) : undefined,
  };
}

/* Adds the clip, or updates the clip already saved at that address.
   Returns { item, existed, noteName, isNew }. The caller writes the note
   and the picture (so the slow parts happen outside the retry loop). */
export function upsertClip(lib, clip, stamp) {
  const key = urlKey(clip.url);
  const existing = lib.items.find((entry) => urlKey(entry.url) === key);
  let tags = clip.tags;
  if (!tags.some((tag) => tag.startsWith("desk:"))) {
    try {
      const verdict = sortClip({ ...clip, tags }, rules);
      if (verdict.onDesk) tags = [...tags, `desk:${verdict.section}`];
    } catch {
      /* the desk guess is a nicety */
    }
  }
  const date = clip.clippedAt.slice(0, 10);
  const file = existing?.file || `magpie/clips/${date}-${slugify(clip.title)}.md`;
  const collectionIds = new Set(lib.collections.map((entry) => entry.id));
  const wanted = clip.collection && collectionIds.has(clip.collection) ? clip.collection : "";

  if (existing) {
    Object.assign(existing, {
      title: existing.editedAt ? existing.title : clip.title,
      site: clip.site || existing.site,
      author: clip.author || existing.author || "",
      type: clip.type || existing.type,
      description: clip.description || existing.description || "",
      note: existing.editedAt ? existing.note : clip.note || existing.note || "",
      tags: existing.editedAt
        ? existing.tags
        : ["magpie", ...new Set([...(existing.tags || []).filter((tag) => tag !== "magpie"), ...tags])],
      thumbnail: clip.thumbnail || existing.thumbnail || "",
      hasTranscript: Boolean(clip.transcript) || Boolean(existing.hasTranscript),
      file,
      updatedAt: stamp,
      savedVia: existing.savedVia || "cloud",
    });
    if (clip.collection !== undefined && wanted) existing.collection = wanted;
    if (existing.removed) delete existing.removed;
    return { item: existing, existed: true, file };
  }

  const item = {
    id: itemId({ url: clip.url }),
    title: clip.title,
    url: clip.url,
    site: clip.site,
    author: clip.author,
    type: clip.type,
    description: clip.description,
    note: clip.note,
    captureSource: clip.captureSource,
    tags: ["magpie", ...tags],
    thumbnail: clip.thumbnail,
    thumbLocal: "",
    clippedAt: clip.clippedAt,
    file,
    hasTranscript: Boolean(clip.transcript),
    collection: wanted,
    savedVia: "cloud",
  };
  /* No collection picked: Magpie files it into its section, if it knows
     one. "unsorted" is how a clip asks to wait in Unsorted on purpose. */
  if (!clip.collection || clip.collection === "auto") fileNewClip(lib, item);
  /* While the library is open to visitors, a clip that looks personal is
     kept private. Kelly can release it from the card. */
  guardNewClip(lib, item);
  lib.items.push(item);
  return { item, existed: false, file };
}

/* ---------- pictures ---------- */

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|\[?f[cd][0-9a-f]{2}:)/i;

export function isPublicUrl(value) {
  const href = safeHttpUrl(value);
  if (!href) return false;
  const url = new URL(href);
  if (url.username || url.password) return false;
  if (url.port && !["80", "443"].includes(url.port)) return false;
  return !PRIVATE_HOST.test(url.hostname);
}

/* Fetches a public page or picture, following at most three redirects and
   checking each hop, with a time and size limit. */
export async function fetchPublic(value, { accept = "*/*", maxBytes = 2_000_000, timeoutMs = 6000 } = {}) {
  let href = value;
  for (let hop = 0; hop < 4; hop += 1) {
    if (!isPublicUrl(href)) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(href, {
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: accept, "User-Agent": "Mozilla/5.0 (compatible; MagpieLibrary/1.0)" },
      });
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        href = new URL(response.headers.get("location"), href).href;
        continue;
      }
      if (!response.ok) return null;
      const length = Number(response.headers.get("content-length") || 0);
      if (length > maxBytes) return null;
      const reader = response.body.getReader();
      const chunks = [];
      let total = 0;
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        total += chunk.length;
        if (total > maxBytes) {
          controller.abort();
          return null;
        }
        chunks.push(Buffer.from(chunk));
      }
      return { body: Buffer.concat(chunks), type: response.headers.get("content-type") || "", url: href };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/* ---------- site icons ----------

   A card's small pill shows the site's own icon. The page may not load
   pictures from other sites (its security policy says pictures come from
   here only), so the server fetches each site's icon once, checks that it
   really is a picture, and keeps it in the private store. No icon found:
   a dated "none" note, so it is not asked for again for a month. */

const ICON_HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
const ICON_RETRY_DAYS = 30;

export function iconHost(value) {
  const host = String(value || "").trim().toLowerCase().replace(/^www\./, "");
  return ICON_HOST.test(host) && !PRIVATE_HOST.test(host) ? host : "";
}

/* Reads the first bytes, never the label on the tin. SVG is refused: it
   can carry script. */
export function sniffIcon(body) {
  if (!body || body.length < 16) return "";
  if (body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) return "image/png";
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "image/jpeg";
  if (body.subarray(0, 4).toString("latin1") === "GIF8") return "image/gif";
  if (body.subarray(0, 4).toString("latin1") === "RIFF" && body.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (body[0] === 0 && body[1] === 0 && body[2] === 1 && body[3] === 0) return "image/x-icon";
  return "";
}

export function iconLinks(html, base) {
  const found = [];
  for (const tag of String(html || "").slice(0, 400_000).match(/<link\b[^>]*>/gi) || []) {
    const rel = (/\brel\s*=\s*["']?([^"'>]+)/i.exec(tag)?.[1] || "").toLowerCase();
    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const link = href && (href[1] || href[2] || href[3]);
    if (!link || !/\bicon\b/.test(rel) || /mask-icon/.test(rel)) continue;
    let url;
    try {
      url = new URL(link.replace(/&amp;/g, "&"), base).href;
    } catch {
      continue;
    }
    if (!/^https?:/.test(url) || /\.svg(?:$|[?#])/i.test(url)) continue;
    found.push({ url, touch: rel.includes("apple-touch-icon") });
  }
  /* The home-screen icon is the big, crisp one. */
  return [...found.filter((entry) => entry.touch), ...found.filter((entry) => !entry.touch)].map((entry) => entry.url);
}

export async function siteIcon(value, { store = backend(), fetcher = fetchPublic, now = () => new Date(), storedOnly = false } = {}) {
  const host = iconHost(value);
  if (!host) return null;
  const path = `magpie/icons/${host}`;
  const saved = await store.read(path).catch(() => null);
  if (saved) {
    const type = sniffIcon(saved.body);
    if (type) return { body: saved.body, type };
    const day = Date.parse(saved.body.toString("utf8").replace(/^none\s+/, ""));
    if (Number.isFinite(day) && now().getTime() - day < ICON_RETRY_DAYS * 86_400_000) return null;
  }
  /* A visitor's page only gets what is already kept. */
  if (storedOnly) return null;
  const home = `https://${host}/`;
  const page = await fetcher(home, { accept: "text/html,*/*", maxBytes: 600_000, timeoutMs: 3000 });
  const links = page && /html/i.test(page.type) ? iconLinks(page.body.toString("utf8"), page.url || home) : [];
  const candidates = [...new Set([...links.slice(0, 1), `https://${host}/favicon.ico`])];
  for (const url of candidates) {
    const file = await fetcher(url, { accept: "image/*", maxBytes: 300_000, timeoutMs: 2500 });
    const type = file && sniffIcon(file.body);
    if (!type) continue;
    await store.write(path, file.body, { contentType: type }).catch(() => {});
    return { body: file.body, type };
  }
  await store.write(path, Buffer.from("none " + now().toISOString().slice(0, 10)), { contentType: "text/plain" }).catch(() => {});
  return null;
}

const IMAGE_TYPES = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp" };

export function imageFromDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([a-z0-9+/=\s]+)$/i.exec(String(dataUrl || ""));
  if (!match) return null;
  const body = Buffer.from(match[2], "base64");
  if (!body.length || body.length > 1_500_000) return null;
  return { body, ext: IMAGE_TYPES[match[1].toLowerCase()] };
}

export async function storePicture(clip, item, { store = backend(), previewDataUrl = "", fetcher = fetchPublic } = {}) {
  if (item.thumbLocal) return item.thumbLocal;
  let picture = null;
  if (clip.thumbnail) {
    const fetched = await fetcher(clip.thumbnail, { accept: "image/*", maxBytes: 3_000_000 });
    const type = String(fetched?.type || "").split(";")[0].trim().toLowerCase();
    if (fetched && IMAGE_TYPES[type]) picture = { body: fetched.body, ext: IMAGE_TYPES[type] };
  }
  if (!picture && previewDataUrl) picture = imageFromDataUrl(previewDataUrl);
  if (!picture) return "";
  const name = `${String(item.clippedAt).slice(0, 10)}-${slugify(item.title)}-${item.id.slice(1, 7)}.${picture.ext}`;
  await store.write(`magpie/thumbs/${name}`, picture.body, {
    contentType: picture.ext === "jpg" ? "image/jpeg" : `image/${picture.ext}`,
  });
  return `thumbs/${name}`;
}

/* ---------- reading a page the website was handed ---------- */

function decodeEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

export function readPageMeta(html, pageUrl) {
  const head = String(html || "").slice(0, 300_000);
  const meta = (name) => {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i"),
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(head);
      if (match) return decodeEntities(match[1]);
    }
    return "";
  };
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head);
  const image = meta("og:image") || meta("twitter:image");
  let thumbnail = "";
  try {
    thumbnail = image ? new URL(image, pageUrl).href : "";
  } catch {
    thumbnail = "";
  }
  const host = hostOf(pageUrl);
  let type = "web page";
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) type = "video";
  else if (host === "github.com") type = "github";
  else if (meta("og:type") === "article") type = "article";
  return {
    title: meta("og:title") || decodeEntities(titleTag?.[1]) || host,
    description: meta("og:description") || meta("description"),
    site: meta("og:site_name") || host,
    author: meta("author"),
    thumbnail: safeHttpUrl(thumbnail),
    type,
  };
}

/* ---------- organising ---------- */

function collectionId(lib, name) {
  const base = slugify(name).slice(0, 40) || "collection";
  const taken = new Set(lib.collections.map((entry) => entry.id));
  let id = base;
  for (let n = 2; taken.has(id) || ["all", "unsorted", "trash", "auto"].includes(id); n += 1) id = `${base}-${n}`;
  return id;
}

function descendants(lib, id) {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const entry of lib.collections) {
      if (entry.parent && out.has(entry.parent) && !out.has(entry.id)) {
        out.add(entry.id);
        grew = true;
      }
    }
  }
  return out;
}

const fail = (message) => Object.assign(new Error(message), { status: 400 });

/* ops: [{ op, ... }]. Returns ids of the clips that changed. */
export function applyOps(lib, ops, stamp = new Date().toISOString()) {
  if (!Array.isArray(ops) || !ops.length || ops.length > 50) throw fail("Send between 1 and 50 changes");
  const changed = new Set();
  const created = [];
  const extra = {};
  const byId = new Map(lib.items.map((entry) => [entry.id, entry]));
  const pick = (ids) => {
    const list = (Array.isArray(ids) ? ids : [ids]).slice(0, 2000).map((id) => byId.get(String(id))).filter(Boolean);
    if (!list.length) throw fail("Those clips were not found");
    return list;
  };
  const collectionOf = (id) => lib.collections.find((entry) => entry.id === id);

  for (const op of ops) {
    switch (op?.op) {
      case "move": {
        const target = clean(op.collection, 60);
        if (target && !collectionOf(target)) throw fail("That collection was not found");
        for (const entry of pick(op.ids)) {
          entry.collection = target;
          delete entry.removed;
          /* Kelly put it here herself (or took a sort back). */
          delete entry.filedBy;
          delete entry.filedWhy;
          changed.add(entry.id);
        }
        break;
      }
      case "sections.sort": {
        const sortedNow = applySections(lib, stamp);
        sortedNow.changed.forEach((id) => changed.add(id));
        extra.sorted = sortedNow.sorted;
        extra.undo = sortedNow.undo;
        extra.first = sortedNow.first;
        break;
      }
      case "sections.reset": {
        delete lib.sectionsOn;
        break;
      }
      case "edit": {
        const [entry] = pick(op.id);
        if (op.title !== undefined) entry.title = clean(op.title, 300) || entry.title;
        if (op.note !== undefined) entry.note = clean(op.note, 20000);
        if (op.tags !== undefined) {
          const desk = (entry.tags || []).filter((tag) => tag === "magpie" || String(tag).startsWith("desk:"));
          entry.tags = [...new Set([...desk, ...cleanTags(op.tags)])];
        }
        entry.editedAt = stamp;
        changed.add(entry.id);
        break;
      }
      case "trash": {
        for (const entry of pick(op.ids)) {
          entry.removed = stamp;
          changed.add(entry.id);
        }
        break;
      }
      case "restore": {
        for (const entry of pick(op.ids)) {
          delete entry.removed;
          changed.add(entry.id);
        }
        break;
      }
      case "purge": {
        const ids = new Set(pick(op.ids).filter((entry) => entry.removed).map((entry) => entry.id));
        lib.items = lib.items.filter((entry) => !ids.has(entry.id));
        ids.forEach((id) => changed.add(id));
        break;
      }
      /* Open the library to visitors, or close it again. Opening marks
         clips that look personal as private and says which. */
      case "public.open": {
        const opened = openLibrary(lib, stamp);
        opened.marked.forEach((id) => changed.add(id));
        extra.marked = opened.marked;
        break;
      }
      case "public.close": {
        closeLibrary(lib);
        /* Undoing an open also takes back the marks it made. */
        if (Array.isArray(op.unmark)) {
          for (const id of op.unmark.slice(0, 2000)) {
            const entry = byId.get(String(id));
            if (entry && entry.private && !entry.privateBy) {
              delete entry.private;
              delete entry.privateWhy;
              changed.add(entry.id);
            }
          }
        }
        break;
      }
      /* One collection, opened to visitors or kept in. HelioFlux never opens. */
      case "public.collection": {
        const entry = collectionOf(clean(op.id, 60));
        if (!entry) throw fail("That collection was not found");
        const list = new Set(Array.isArray(lib.publicCollections) ? lib.publicCollections : []);
        if (op.on) {
          const never = sectionTargets(lib).get("helioflux") || "helioflux";
          if (entry.id === never || /helioflux/i.test(entry.name)) throw fail("HelioFlux stays private");
          list.add(entry.id);
          lib.items.filter((item) => item.collection === entry.id).forEach((item) => changed.add(item.id));
        } else {
          list.delete(entry.id);
        }
        lib.publicCollections = [...list];
        break;
      }
      /* Clips Kelly keeps to herself, or lets visitors see after all. */
      case "private": {
        for (const entry of pick(op.ids)) {
          if (op.on) {
            entry.private = true;
            entry.privateBy = "kelly";
            delete entry.privateWhy;
            delete entry.released;
          } else {
            delete entry.private;
            delete entry.privateBy;
            delete entry.privateWhy;
            entry.released = true;
          }
          changed.add(entry.id);
        }
        break;
      }
      case "collection.create": {
        const name = clean(op.name, 60);
        if (!name) throw fail("A collection needs a name");
        if (lib.collections.length >= 200) throw fail("That is a lot of collections");
        const parent = clean(op.parent, 60);
        if (parent && !collectionOf(parent)) throw fail("That parent collection was not found");
        /* Undoing a sort brings a collection back under its old id. */
        const wantedId = clean(op.id, 60);
        const freeId = /^[a-z0-9][a-z0-9-]{0,59}$/.test(wantedId) && !collectionOf(wantedId) && !["all", "unsorted", "trash", "auto"].includes(wantedId);
        const entry = {
          id: freeId ? wantedId : collectionId(lib, name),
          name,
          parent,
          color: COLORS.includes(op.color) ? op.color : COLORS[lib.collections.length % COLORS.length],
          createdAt: stamp,
        };
        lib.collections.push(entry);
        created.push(entry.id);
        break;
      }
      case "collection.update": {
        const entry = collectionOf(clean(op.id, 60));
        if (!entry) throw fail("That collection was not found");
        if (op.name !== undefined) entry.name = clean(op.name, 60) || entry.name;
        if (op.color !== undefined && COLORS.includes(op.color)) entry.color = op.color;
        if (op.parent !== undefined) {
          const parent = clean(op.parent, 60);
          if (parent && (!collectionOf(parent) || descendants(lib, entry.id).has(parent))) {
            throw fail("A collection can't go inside itself");
          }
          entry.parent = parent;
        }
        break;
      }
      case "collection.delete": {
        const entry = collectionOf(clean(op.id, 60));
        if (!entry) throw fail("That collection was not found");
        /* Its sub-collections move up a level; its clips go back to Unsorted. */
        for (const child of lib.collections) if (child.parent === entry.id) child.parent = entry.parent;
        for (const item of lib.items) {
          if (item.collection === entry.id) {
            item.collection = "";
            changed.add(item.id);
          }
        }
        lib.collections = lib.collections.filter((other) => other.id !== entry.id);
        if (Array.isArray(lib.publicCollections)) lib.publicCollections = lib.publicCollections.filter((id) => id !== entry.id);
        break;
      }
      default:
        throw fail("Unknown change");
    }
  }
  /* While the library is open, anything these changes touched is looked at
     again: a clip that now sits in an open collection and looks personal is
     kept in (unless Kelly already let it out). */
  if (lib.publicOn) {
    const held = [];
    for (const id of changed) {
      const entry = lib.items.find((item) => item.id === id);
      if (entry && !entry.removed && entry.collection && guardNewClip(lib, entry)) held.push(entry.id);
    }
    if (held.length) extra.held = held;
  }
  return { changed: [...changed], created, ...extra };
}

/* ---------- the Mac vault ---------- */

/* Folds the vault's items into the cloud library. The vault fills in what
   the page said and what the Mac saved; the website keeps collections,
   trash, and anything Kelly edited there. Vault-only clips are filed into
   their section when sections are on, or land in Unsorted. Returns counts. */
export function mergeVault(lib, vaultItems = [], stamp = new Date().toISOString()) {
  const byKey = new Map();
  for (const entry of lib.items) {
    const key = urlKey(entry.url) || entry.id;
    if (!byKey.has(key)) byKey.set(key, entry);
  }
  let added = 0;
  let updated = 0;
  for (const source of vaultItems) {
    if (!source || typeof source !== "object") continue;
    const key = urlKey(source.url) || itemId(source);
    const existing = byKey.get(key);
    if (existing) {
      for (const field of VAULT_FIELDS) {
        if (source[field] !== undefined && source[field] !== "" && source[field] !== null) existing[field] = source[field];
      }
      if (!existing.editedAt) {
        for (const field of KELLY_FIELDS) if (source[field] !== undefined) existing[field] = source[field];
      }
      if (!existing.clippedAt) existing.clippedAt = source.clippedAt;
      updated += 1;
    } else {
      /* The first sync after the starter collections appeared files the
         vault's extra clips the same way; later ones wait in Unsorted. */
      const collection = !lib.sectionsOn && lib.starterOn && !lib.vaultSyncedAt ? starterCollection(source) : "";
      const entry = { ...source, id: itemId(source), collection, savedVia: source.savedVia || "vault" };
      /* Once sections are on, Mac clips are filed like any new clip. */
      fileNewClip(lib, entry);
      guardNewClip(lib, entry);
      lib.items.push(entry);
      byKey.set(key, entry);
      added += 1;
    }
  }
  lib.vaultSyncedAt = stamp;
  return { added, updated };
}
