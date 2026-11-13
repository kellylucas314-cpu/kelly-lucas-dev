import { applyOps, mutate, readLibrary } from "../lib/magpie-store.mjs";
import { planSections } from "../lib/magpie-sections.mjs";
import { planPublic } from "../lib/magpie-public.mjs";
import {
  isAuthenticated,
  isSameOrigin,
  sendJson,
  unauthorized,
} from "./_magpie-auth.js";

/* Organising the library from the website: file clips into collections,
   edit, trash and restore them, and make, rename, nest and delete
   collections. Body: { ops: [{ op, ... }] }. { ops: [{ op: "sections.sort" }] }
   files clips into their sections and answers with the changes that undo
   it. Signed-in browser only. */
export default async function handler(request, response) {
  if (request.method !== "POST") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "POST" });
  }
  if (!isAuthenticated(request)) return unauthorized(response);
  if (!isSameOrigin(request)) return sendJson(response, { error: "Invalid request origin" }, 403);

  let ops;
  let body;
  try {
    body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    ops = body.ops;
  } catch {
    return sendJson(response, { error: "That change could not be read" }, 400);
  }

  /* { plan: "sections" }: what the Sort button would do. Changes nothing. */
  if (body.plan === "sections") {
    try {
      const { lib } = await readLibrary();
      const plan = planSections(lib);
      return sendJson(response, {
        ok: true,
        on: Boolean(lib.sectionsOn),
        first: plan.first,
        total: plan.total,
        fromUnsorted: plan.fromUnsorted,
        unsorted: plan.unsorted,
        counts: plan.counts,
      });
    } catch {
      return sendJson(response, { error: "Magpie couldn't read the library just now." }, 503);
    }
  }

  /* { plan: "public" }: what opening the library to visitors would show
     and what it would keep in. Changes nothing. */
  if (body.plan === "public") {
    try {
      const { lib } = await readLibrary();
      return sendJson(response, { ok: true, ...planPublic(lib) });
    } catch {
      return sendJson(response, { error: "Magpie couldn't read the library just now." }, 503);
    }
  }

  try {
    const { lib, result } = await mutate((library, stamp) => applyOps(library, ops, stamp));
    const changed = new Set(result.changed);
    return sendJson(response, {
      ok: true,
      created: result.created,
      sorted: result.sorted,
      undo: result.undo,
      sectionsOn: Boolean(lib.sectionsOn),
      publicOn: lib.publicOn || "",
      publicCollections: Array.isArray(lib.publicCollections) ? lib.publicCollections : [],
      marked: result.marked,
      collections: lib.collections,
      items: lib.items.filter((item) => changed.has(item.id)),
      removedIds: result.changed.filter((id) => !lib.items.some((item) => item.id === id)),
    });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 503;
    return sendJson(response, {
      error: status === 400 ? error.message : "Magpie couldn't save that change. Try again in a moment.",
    }, status);
  }
}
