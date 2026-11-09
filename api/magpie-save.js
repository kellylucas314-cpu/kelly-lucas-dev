import {
  backend,
  cleanClip,
  clipToMarkdown,
  fetchPublic,
  mutate,
  readLibrary,
  readPageMeta,
  storePicture,
  upsertClip,
} from "../lib/magpie-store.mjs";
import { sectionFor, sectionTargets } from "../lib/magpie-sections.mjs";
import {
  hasClipKey,
  isAuthenticated,
  isSameOrigin,
  sendJson,
  unauthorized,
} from "./_magpie-auth.js";

/* Saves one clip into the library.
   - The Chrome feather sends the whole page (title, text, picture) with
     "Authorization: Bearer <key>".
   - The library's Add box sends just { url } from a signed-in browser;
     the title, summary and picture are read from the page here. */

function parseBody(request) {
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");
  if (Buffer.isBuffer(request.body)) return JSON.parse(request.body.toString("utf8") || "{}");
  return request.body || {};
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "POST" });
  }
  const viaKey = hasClipKey(request);
  if (!viaKey) {
    if (!isAuthenticated(request)) return unauthorized(response);
    if (!isSameOrigin(request)) return sendJson(response, { error: "Invalid request origin" }, 403);
  }

  let body;
  try {
    body = parseBody(request);
  } catch {
    return sendJson(response, { error: "That clip could not be read" }, 400);
  }

  /* { guess: true, url, title, tags, ... }: where Magpie would file this
     clip. Nothing is saved; the feather shows the answer in its popup. */
  if (body.guess) {
    try {
      const { lib } = await readLibrary();
      const guess = lib.sectionsOn ? sectionFor(cleanClip(body)) : { section: "", why: "" };
      const target = guess.section ? sectionTargets(lib).get(guess.section) : "";
      const entry = target ? lib.collections.find((collection) => collection.id === target) : null;
      return sendJson(response, {
        ok: true,
        on: Boolean(lib.sectionsOn),
        section: entry ? { id: entry.id, name: entry.name, why: guess.why } : null,
      });
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 503;
      return sendJson(response, { error: status === 400 ? error.message : "Magpie couldn't guess just now." }, status);
    }
  }

  try {
    const now = new Date().toISOString();
    let input = body;
    /* Just an address: read the page for its title, summary and picture. */
    if (!body.title && !body.markdown) {
      const page = await fetchPublic(String(body.url || ""), { accept: "text/html,*/*", maxBytes: 1_500_000 });
      const meta = page && /html/i.test(page.type) ? readPageMeta(page.body.toString("utf8"), page.url) : {};
      input = {
        ...meta,
        ...Object.fromEntries(Object.entries(body).filter(([, value]) => value !== "" && value !== undefined)),
        captureSource: body.captureSource || "library",
      };
    }
    const clip = cleanClip(input, now);
    const store = backend();

    /* The note and the picture first (slow, and safe to repeat), then one
       quick change to the library. */
    const { lib: before } = await readLibrary(store);
    const draft = structuredClone(before);
    const { item: preview, file } = upsertClip(draft, clip, now);
    const tags = preview.tags || [];
    await store.write(`magpie/notes/${file.split("/").pop()}`, Buffer.from(clipToMarkdown({ ...clip, ...preview, markdown: clip.markdown, transcript: clip.transcript }, tags)), {
      contentType: "text/markdown; charset=utf-8",
    });
    const thumbLocal = await storePicture(clip, preview, {
      store,
      previewDataUrl: typeof body.previewDataUrl === "string" ? body.previewDataUrl : "",
    }).catch(() => "");

    const { result } = await mutate((lib, stamp) => {
      const saved = upsertClip(lib, clip, stamp);
      if (thumbLocal && !saved.item.thumbLocal) saved.item.thumbLocal = thumbLocal;
      return saved;
    }, store);

    return sendJson(response, {
      ok: true,
      existed: result.existed,
      item: result.item,
      file: result.file,
    });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 503;
    return sendJson(response, {
      error: status === 400 ? error.message : "Magpie couldn't save that just now. Try again in a moment.",
    }, status);
  }
}
