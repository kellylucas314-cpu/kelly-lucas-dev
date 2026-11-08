import { get } from "@vercel/blob";
import { Readable } from "node:stream";
import {
  canUseLibrary,
  requestUrl,
  sendJson,
  unauthorized,
} from "./_magpie-auth.js";
import { REPO_PART, backend, fetchRepoCard, repoThumbPath } from "../lib/magpie-store.mjs";

const SAFE_IMAGE = /^[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)$/i;

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  if (!canUseLibrary(request)) return unauthorized(response);

  const params = requestUrl(request).searchParams;
  const repo = (params.get("repo") || "").split("/");
  const isRepo = repo.length === 2 && REPO_PART.test(repo[0]) && REPO_PART.test(repo[1]);
  const name = params.get("name") || "";
  if (!isRepo && !SAFE_IMAGE.test(name)) {
    return sendJson(response, { error: "Invalid image" }, 400);
  }
  const blobPath = isRepo ? repoThumbPath(repo[0], repo[1]) : `magpie/thumbs/${name}`;

  try {
    const result = await get(blobPath, {
      access: "private",
      ifNoneMatch: request.headers?.["if-none-match"] || undefined,
    });
    if (!result && isRepo) {
      /* First look at this repo: fetch GitHub's own preview card once and keep it. */
      const card = await fetchRepoCard(repo[0], repo[1]);
      if (!card) return sendJson(response, { error: "Image not found" }, 404);
      await backend().write(blobPath, card.body, { contentType: card.type });
      response.statusCode = 200;
      response.setHeader("Content-Type", card.type);
      response.setHeader("Cache-Control", "private, no-cache");
      response.setHeader("X-Content-Type-Options", "nosniff");
      return response.end(card.body);
    }
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
