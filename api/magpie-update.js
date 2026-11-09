import { applyOps, mutate } from "../lib/magpie-store.mjs";
import {
  isAuthenticated,
  isSameOrigin,
  sendJson,
  unauthorized,
} from "./_magpie-auth.js";

/* Organising the library from the website: file clips into collections,
   edit, trash and restore them, and make, rename, nest and delete
   collections. Body: { ops: [{ op, ... }] }. Signed-in browser only. */
export default async function handler(request, response) {
  if (request.method !== "POST") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "POST" });
  }
  if (!isAuthenticated(request)) return unauthorized(response);
  if (!isSameOrigin(request)) return sendJson(response, { error: "Invalid request origin" }, 403);

  let ops;
  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    ops = body.ops;
  } catch {
    return sendJson(response, { error: "That change could not be read" }, 400);
  }

  try {
    const { lib, result } = await mutate((library, stamp) => applyOps(library, ops, stamp));
    const changed = new Set(result.changed);
    return sendJson(response, {
      ok: true,
      created: result.created,
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
