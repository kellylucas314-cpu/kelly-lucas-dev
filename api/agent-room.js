import {
  BlobPreconditionFailedError,
  get,
  put,
} from "@vercel/blob";
import { Readable } from "node:stream";
import {
  acknowledgeRoom,
  appendMessage,
  emptyRoom,
  roomView,
  sanitizeRoom,
} from "../lib/agent-room-model.js";
import {
  dashboardActor,
  isSameOrigin,
  requestUrl,
  sendJson,
  unauthorized,
} from "./_magpie-auth.js";

const ROOM_PATH = "agent-commons/room-v1.json";
const MAX_BODY_BYTES = 16 * 1024;
const MAX_WRITE_ATTEMPTS = 5;

async function streamText(stream) {
  const chunks = [];
  for await (const chunk of Readable.fromWeb(stream)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readRoom() {
  const result = await get(ROOM_PATH, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return { room: emptyRoom(), etag: null };
  return {
    room: sanitizeRoom(JSON.parse(await streamText(result.stream))),
    etag: result.etag || null,
  };
}

async function writeRoom(room, etag) {
  const options = {
    access: "private",
    allowOverwrite: Boolean(etag),
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 0,
  };
  if (etag) options.ifMatch = etag;
  return put(ROOM_PATH, JSON.stringify(room, null, 2), options);
}

function requestBody(request) {
  const raw = typeof request.body === "string"
    ? request.body
    : JSON.stringify(request.body || {});
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Agent Room request is too large"), { statusCode: 413 });
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON"), { statusCode: 400 });
  }
}

function isWriteConflict(error) {
  return error instanceof BlobPreconditionFailedError || error?.statusCode === 412;
}

async function mutateRoom(mutator) {
  for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt += 1) {
    const { room, etag } = await readRoom();
    const result = mutator(room);
    if (!result.changed) return result;
    try {
      await writeRoom(result.room, etag);
      return result;
    } catch (error) {
      if (!isWriteConflict(error) || attempt === MAX_WRITE_ATTEMPTS) throw error;
    }
  }
  throw Object.assign(new Error("Agent Room is busy; retry shortly"), { statusCode: 409 });
}

function responseHeaders(revision, methods) {
  return {
    Allow: methods,
    ETag: `W/\"room-${revision}\"`,
  };
}

export default async function handler(request, response) {
  const methods = "GET, POST, PATCH";
  if (!["GET", "POST", "PATCH"].includes(request.method)) {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: methods });
  }

  const actor = dashboardActor(request);
  if (!actor) return unauthorized(response);
  if (request.method !== "GET" && actor === "kelly" && !isSameOrigin(request)) {
    return sendJson(response, { error: "Invalid request origin" }, 403);
  }

  try {
    if (request.method === "GET") {
      const { room } = await readRoom();
      const url = requestUrl(request);
      const view = roomView(room, actor, {
        after: url.searchParams.get("after"),
        limit: url.searchParams.get("limit"),
        inboxOnly: url.searchParams.get("inbox") === "1",
      });
      return sendJson(response, view, 200, responseHeaders(view.revision, methods));
    }

    const body = requestBody(request);
    if (request.method === "POST") {
      const result = await mutateRoom((room) => appendMessage(room, body, actor));
      return sendJson(response, {
        message: result.message,
        revision: result.room.revision,
        duplicate: !result.changed,
      }, result.changed ? 201 : 200, responseHeaders(result.room.revision, methods));
    }

    const result = await mutateRoom((room) => acknowledgeRoom(room, actor, body.through));
    return sendJson(response, {
      cursor: result.cursor,
      revision: result.room.revision,
    }, 200, responseHeaders(result.room.revision, methods));
  } catch (error) {
    const status = Number.isInteger(error?.statusCode) ? error.statusCode : 503;
    return sendJson(response, {
      error: status === 503
        ? "The private Agent Room is temporarily unavailable"
        : error.message,
    }, status);
  }
}
