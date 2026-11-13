import { get } from "@vercel/blob";
import { Readable } from "node:stream";
import { readLibrary, siteIcon } from "../lib/magpie-store.mjs";
import { isPublicThumb } from "../lib/magpie-public.mjs";
import {
  canUseLibrary,
  requestUrl,
  sendJson,
  unauthorized,
} from "./_magpie-auth.js";

const SAFE_IMAGE = /^[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)$/i;
const DAY = 86_400;

/* ?icon=<host>: the site's own small icon, fetched once and kept. The
   browser keeps the answer too (a week for an icon, a day for "none"), so a
   page of cards asks once. */
async function sendIcon(response, host, owner) {
  /* A visitor only gets icons the library already holds: the server never
     goes out to fetch one on a stranger's say-so. */
  const icon = await siteIcon(host, { storedOnly: !owner }).catch(() => null);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  if (!icon) {
    /* Nothing to show is not an error: the pill keeps the site's letter. */
    response.statusCode = 204;
    response.setHeader("Cache-Control", owner ? `private, max-age=${DAY}` : "private, max-age=600");
    return response.end();
  }
  response.statusCode = 200;
  response.setHeader("Content-Type", icon.type);
  response.setHeader("Cache-Control", `private, max-age=${7 * DAY}`);
  return response.end(icon.body);
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  const owner = canUseLibrary(request);
  const query = requestUrl(request).searchParams;
  const name = query.get("name") || "";
  if (!owner) {
    /* Visitors: nothing unless the library is open, and then only the
       pictures of clips they can see. */
    let lib;
    try {
      ({ lib } = await readLibrary());
    } catch {
      return sendJson(response, { error: "Image is temporarily unavailable" }, 503);
    }
    if (!lib.publicOn) return unauthorized(response);
    if (!query.has("icon") && !(SAFE_IMAGE.test(name) && isPublicThumb(lib, name))) {
      return sendJson(response, { error: "Image not found" }, 404);
    }
  }
  if (query.has("icon")) return sendIcon(response, query.get("icon") || "", owner);
  if (!SAFE_IMAGE.test(name)) {
    return sendJson(response, { error: "Invalid image" }, 400);
  }

  try {
    const result = await get(`magpie/thumbs/${name}`, {
      access: "private",
      ifNoneMatch: request.headers?.["if-none-match"] || undefined,
    });
    if (!result) return sendJson(response, { error: "Image not found" }, 404);
    if (result.statusCode === 304) {
      response.statusCode = 304;
      response.setHeader("ETag", result.blob.etag);
      response.setHeader("Cache-Control", `private, max-age=${DAY}, stale-while-revalidate=${7 * DAY}`);
      return response.end();
    }
    if (result.statusCode !== 200) {
      return sendJson(response, { error: "Image not found" }, 404);
    }
    response.statusCode = 200;
    response.setHeader(
      "Content-Type",
      result.blob.contentType || "application/octet-stream",
    );
    response.setHeader("Cache-Control", `private, max-age=${DAY}, stale-while-revalidate=${7 * DAY}`);
    response.setHeader("ETag", result.blob.etag);
    response.setHeader("X-Content-Type-Options", "nosniff");
    await new Promise((resolve, reject) => {
      const stream = Readable.fromWeb(result.stream);
      stream.once("error", reject);
      response.once("finish", resolve);
      stream.pipe(response);
    });
  } catch {
    if (!response.headersSent) {
      return sendJson(response, { error: "Image is temporarily unavailable" }, 503);
    }
    response.destroy();
  }
}
