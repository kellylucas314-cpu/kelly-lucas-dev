import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  acknowledgeRoom,
  appendMessage,
  emptyRoom,
  normalizeAgent,
  roomView,
  sanitizeRoom,
} from "../lib/agent-room-model.js";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_STATE_FILE = path.join(PROJECT_ROOT, ".agent-room-local", "state.json");
const MAX_BODY_BYTES = 16 * 1024;

const STATIC_FILES = new Map([
  ["/brain/room.html", ["brain/room.html", "text/html; charset=utf-8"]],
  ["/brain/room.css", ["brain/room.css", "text/css; charset=utf-8"]],
  ["/brain/room.js", ["brain/room.js", "text/javascript; charset=utf-8"]],
  ["/brain/dashboard.css", ["brain/dashboard.css", "text/css; charset=utf-8"]],
  ["/assets/fonts/Adriatic-Medium.woff2", ["assets/fonts/Adriatic-Medium.woff2", "font/woff2"]],
]);

function json(response, body, status = 200) {
  response.writeHead(status, {
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw Object.assign(new Error("Agent Room request is too large"), { statusCode: 413 });
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON"), { statusCode: 400 });
  }
}

async function readRoomFile(stateFile) {
  try {
    return sanitizeRoom(JSON.parse(await readFile(stateFile, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return emptyRoom();
    throw error;
  }
}

async function writeRoomFile(stateFile, room) {
  await mkdir(path.dirname(stateFile), { recursive: true });
  const temporary = `${stateFile}.tmp`;
  await writeFile(temporary, `${JSON.stringify(room, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, stateFile);
}

function requestActor(request) {
  return normalizeAgent(request.headers["x-agent"]) || "kelly";
}

export function createLocalRoomServer(options = {}) {
  const stateFile = path.resolve(options.stateFile || DEFAULT_STATE_FILE);
  let mutationTail = Promise.resolve();

  const mutate = (callback) => {
    const pending = mutationTail.then(async () => {
      const room = await readRoomFile(stateFile);
      const result = callback(room);
      if (result.changed) await writeRoomFile(stateFile, result.room);
      return result;
    });
    mutationTail = pending.then(() => undefined, () => undefined);
    return pending;
  };

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (url.pathname === "/") {
        response.writeHead(302, { Location: "/brain/room.html" });
        response.end();
        return;
      }

      if (url.pathname === "/api/agent-room") {
        const actor = requestActor(request);
        if (request.method === "GET") {
          const room = await readRoomFile(stateFile);
          return json(response, roomView(room, actor, {
            after: url.searchParams.get("after"),
            limit: url.searchParams.get("limit"),
            inboxOnly: url.searchParams.get("inbox") === "1",
          }));
        }
        if (request.method === "POST") {
          const body = await readJsonBody(request);
          const result = await mutate((room) => appendMessage(room, body, actor));
          return json(response, {
            message: result.message,
            revision: result.room.revision,
            duplicate: !result.changed,
          }, result.changed ? 201 : 200);
        }
        if (request.method === "PATCH") {
          const body = await readJsonBody(request);
          const result = await mutate((room) => acknowledgeRoom(room, actor, body.through));
          return json(response, { cursor: result.cursor, revision: result.room.revision });
        }
        response.setHeader("Allow", "GET, POST, PATCH");
        return json(response, { error: "Method not allowed" }, 405);
      }

      const staticFile = STATIC_FILES.get(url.pathname);
      if (!staticFile) return json(response, { error: "Not found" }, 404);
      const [relativePath, contentType] = staticFile;
      const bytes = await readFile(path.join(PROJECT_ROOT, relativePath));
      response.writeHead(200, {
        "Cache-Control": "no-cache",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      });
      response.end(bytes);
    } catch (error) {
      return json(response, { error: error.message }, error.statusCode || 500);
    }
  });
}

async function main() {
  const port = Number.parseInt(process.env.AGENT_COMMONS_PORT || "4399", 10);
  const host = "127.0.0.1";
  const server = createLocalRoomServer({ stateFile: process.env.AGENT_COMMONS_FILE });
  server.listen(port, host, () => {
    process.stdout.write(`Agent Commons room: http://${host}:${port}/brain/room.html\n`);
    process.stdout.write("Loopback only. Press Ctrl+C to stop.\n");
  });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
