import { readLibrary } from "../lib/magpie-store.mjs";
import { canUseLibrary, sendJson, unauthorized } from "./_magpie-auth.js";

/* The whole library: clips and collections. A signed-in browser, or the
   Mac's pull with the feather key. */
export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  if (!canUseLibrary(request)) return unauthorized(response);

  try {
    const { lib } = await readLibrary();
    return sendJson(response, lib);
  } catch {
    return sendJson(response, { error: "Library is temporarily unavailable" }, 503);
  }
}
