import { get } from "@vercel/blob";
import { Readable } from "node:stream";
import {
  isAuthenticated,
  requestUrl,
  sendJson,
  unauthorized,
} from "./_magpie-auth.js";

const SAFE_NOTE = /^[a-z0-9][a-z0-9._-]*\.md$/i;

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  if (!isAuthenticated(request)) return unauthorized(response);

  const file = requestUrl(request).searchParams.get("file") || "";
  const name = file.split("/").pop() || "";
  if (!SAFE_NOTE.test(name)) {
    return sendJson(response, { error: "Invalid note" }, 400);
  }

  try {
    const result = await get(`magpie/notes/${name}`, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return sendJson(response, { error: "Note not found" }, 404);
    }
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/markdown; charset=utf-8");
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    await new Promise((resolve, reject) => {
      const stream = Readable.fromWeb(result.stream);
      stream.once("error", reject);
      response.once("finish", resolve);
      stream.pipe(response);
    });
  } catch {
    if (!response.headersSent) {
      return sendJson(response, { error: "Note is temporarily unavailable" }, 503);
    }
    response.destroy();
  }
}
