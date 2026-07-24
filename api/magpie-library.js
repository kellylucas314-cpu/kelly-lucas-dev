import { get } from "@vercel/blob";
import { Readable } from "node:stream";
import {
  isAuthenticated,
  sendJson,
  unauthorized,
} from "./_magpie-auth.js";

async function pipeBlob(response, result, contentType, cacheControl) {
  response.statusCode = 200;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Cache-Control", cacheControl);
  response.setHeader("X-Content-Type-Options", "nosniff");
  await new Promise((resolve, reject) => {
    const stream = Readable.fromWeb(result.stream);
    stream.once("error", reject);
    response.once("finish", resolve);
    stream.pipe(response);
  });
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  if (!isAuthenticated(request)) return unauthorized(response);

  try {
    const result = await get("magpie/library.json", { access: "private" });
    if (!result || result.statusCode !== 200) {
      return sendJson(response, { error: "Library not found" }, 404);
    }
    return await pipeBlob(
      response,
      result,
      "application/json; charset=utf-8",
      "private, no-store",
    );
  } catch {
    if (!response.headersSent) {
      return sendJson(response, { error: "Library is temporarily unavailable" }, 503);
    }
    response.destroy();
  }
}
