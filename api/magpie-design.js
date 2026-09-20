import { get } from "@vercel/blob";
import { Readable } from "node:stream";
import {
  isAuthenticated,
  requestUrl,
  sendJson,
  unauthorized,
} from "./_magpie-auth.js";

// The private design library. Nothing it serves lives in this public
// repository: scripts/sync-design-library.mjs copies the collection into the
// private Blob store under this prefix, and only a signed-in Magpie session
// can read it back out.
const BLOB_PREFIX = "design-library/";
const MAX_LENGTH = 200;
const MAX_DEPTH = 6;
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// The content type always comes from this table, never from stored metadata,
// so an unexpected upload can never be served as something it is not.
const TYPES = {
  json: { type: "application/json; charset=utf-8", cache: "private, no-cache" },
  md: { type: "text/markdown; charset=utf-8", cache: "private, no-cache" },
  txt: { type: "text/plain; charset=utf-8", cache: "private, no-cache" },
  png: { type: "image/png", cache: "private, max-age=86400" },
  webp: { type: "image/webp", cache: "private, max-age=86400" },
  jpg: { type: "image/jpeg", cache: "private, max-age=86400" },
  jpeg: { type: "image/jpeg", cache: "private, max-age=86400" },
  pdf: { type: "application/pdf", cache: "private, max-age=86400" },
  ttf: { type: "font/ttf", cache: "private, max-age=86400" },
  html: { type: "text/html; charset=utf-8", cache: "private, no-cache", active: true },
  css: { type: "text/css; charset=utf-8", cache: "private, no-cache", active: true },
  js: { type: "text/javascript; charset=utf-8", cache: "private, no-cache", active: true },
};

// Pages and scripts only run from the bundled studies, and they get a policy
// that cannot call any API or load anything from another site.
const ACTIVE_PREFIX = "studies/";
const STUDY_POLICY = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export function resolveDesignFile(value) {
  const file = typeof value === "string" ? value : "";
  if (!file || file.length > MAX_LENGTH || file.includes("..")) return null;

  const segments = file.split("/");
  if (segments.length > MAX_DEPTH) return null;
  if (!segments.every((segment) => SAFE_SEGMENT.test(segment))) return null;

  const name = segments[segments.length - 1];
  const dot = name.lastIndexOf(".");
  if (dot < 1) return null;
  const kind = TYPES[name.slice(dot + 1).toLowerCase()];
  if (!kind) return null;
  if (kind.active && !file.startsWith(ACTIVE_PREFIX)) return null;

  return {
    pathname: `${BLOB_PREFIX}${file}`,
    name,
    contentType: kind.type,
    cacheControl: kind.cache,
    policy: kind.type.startsWith("text/html") ? STUDY_POLICY : "",
  };
}

// The rewrite hands the path over as `file`, and the platform also passes the
// matched part along as `path`. Either can arrive whole or in pieces, so take
// the first one that names a real library file.
function requestedFile(request) {
  const params = requestUrl(request).searchParams;
  for (const key of ["file", "path"]) {
    const target = resolveDesignFile(params.getAll(key).filter(Boolean).join("/"));
    if (target) return target;
  }
  return null;
}

export function createDesignHandler({ getBlob }) {
  return async function handler(request, response) {
    if (request.method !== "GET") {
      return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "GET" });
    }
    if (!isAuthenticated(request)) return unauthorized(response);

    const target = requestedFile(request);
    if (!target) return sendJson(response, { error: "Invalid file" }, 400);

    try {
      const result = await getBlob(target.pathname, {
        access: "private",
        ifNoneMatch: request.headers?.["if-none-match"] || undefined,
      });
      if (!result) return sendJson(response, { error: "File not found" }, 404);

      response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
      if (result.statusCode === 304) {
        response.statusCode = 304;
        response.setHeader("ETag", result.blob.etag);
        response.setHeader("Cache-Control", target.cacheControl);
        return response.end();
      }
      if (result.statusCode !== 200) {
        return sendJson(response, { error: "File not found" }, 404);
      }

      response.statusCode = 200;
      response.setHeader("Content-Type", target.contentType);
      response.setHeader("Cache-Control", target.cacheControl);
      response.setHeader("ETag", result.blob.etag);
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Content-Disposition", `inline; filename="${target.name}"`);
      if (target.policy) {
        response.setHeader("Content-Security-Policy", target.policy);
      }

      // Streamed, so the seven-page guide is not held to the body size cap.
      await new Promise((resolve, reject) => {
        const stream = Readable.fromWeb(result.stream);
        stream.once("error", reject);
        response.once("finish", resolve);
        stream.pipe(response);
      });
    } catch {
      if (!response.headersSent) {
        return sendJson(response, { error: "File is temporarily unavailable" }, 503);
      }
      response.destroy();
    }
  };
}

export default createDesignHandler({ getBlob: get });
