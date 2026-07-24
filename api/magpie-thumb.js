import { get } from "@vercel/blob";
import { Readable } from "node:stream";
import {
  isAuthenticated,
  requestUrl,
  sendJson,
  unauthorized,
} from "./_magpie-auth.js";

const SAFE_IMAGE = /^[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)$/i;

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  if (!isAuthenticated(request)) return unauthorized(response);

  const name = requestUrl(request).searchParams.get("name") || "";
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
      response.setHeader("Cache-Control", "private, no-cache");
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
    response.setHeader("Cache-Control", "private, no-cache");
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
