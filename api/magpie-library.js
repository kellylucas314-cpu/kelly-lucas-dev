import { readLibrary } from "../lib/magpie-store.mjs";
import { openLibrary, publicView } from "../lib/magpie-public.mjs";
import { canUseLibrary, requestUrl, sendJson, unauthorized } from "./_magpie-auth.js";

/* The library: clips and collections.
   - Kelly's signed-in browser, or the Mac's pull with the feather key, gets
     all of it.
   - A visitor gets the open sections only, and only once Kelly has opened
     the library (lib/magpie-public.mjs decides what that is). Until then
     the answer is 401, as it always was.
   - ?view=visitor, for Kelly: what a visitor sees now, or would see if she
     opened it. Nothing is changed. */
export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  const owner = canUseLibrary(request);

  try {
    const { lib } = await readLibrary();
    if (owner) {
      if (requestUrl(request).searchParams.get("view") === "visitor") {
        const copy = structuredClone(lib);
        if (!copy.publicOn) {
          try {
            openLibrary(copy, new Date().toISOString());
          } catch {
            /* not sorted yet: the preview is simply empty */
          }
        }
        return sendJson(response, { ...publicView(copy), preview: true });
      }
      return sendJson(response, { ...lib, owner: true });
    }
    if (!lib.publicOn) return unauthorized(response);
    return sendJson(response, publicView(lib));
  } catch {
    return sendJson(response, { error: "Library is temporarily unavailable" }, 503);
  }
}
