import { createServer } from "node:http";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
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
const DEFAULT_UPSTREAM_CONFIG_FILE = path.join(PROJECT_ROOT, ".agent-room-local", "upstream.json");
const MAX_BODY_BYTES = 16 * 1024;

const STATIC_FILES = new Map([
  ["/brain/room.html", ["brain/room.html", "text/html; charset=utf-8"]],
  ["/brain/room.css", ["brain/room.css", "text/css; charset=utf-8"]],
  ["/brain/room.js", ["brain/room.js", "text/javascript; charset=utf-8"]],
  ["/brain/dashboard.css", ["brain/dashboard.css", "text/css; charset=utf-8"]],
  ["/assets/fonts/Adriatic-Medium.woff2", ["assets/fonts/Adriatic-Medium.woff2", "font/woff2"]],
  ["/assets/fonts/Heliora-Regular.ttf", ["assets/fonts/Heliora-Regular.ttf", "font/ttf"]],
  ["/assets/fonts/Heliora-Medium.ttf", ["assets/fonts/Heliora-Medium.ttf", "font/ttf"]],
  ["/assets/fonts/Heliora-Bold.ttf", ["assets/fonts/Heliora-Bold.ttf", "font/ttf"]],
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

async function readUpstreamConfig(configFile) {
  if (!configFile) return null;
  try {
    const [raw, metadata] = await Promise.all([
      readFile(configFile, "utf8"),
      stat(configFile),
    ]);
    if (!metadata.isFile() || (metadata.mode & 0o077) !== 0) {
      throw new Error("Agent Commons upstream config must be a private file with mode 600");
    }
    const parsed = JSON.parse(raw);
    const upstream = new URL(parsed.url);
    if (upstream.protocol !== "https:" || upstream.pathname !== "/api/agent-room" ||
        upstream.username || upstream.password || upstream.hash) {
      throw new Error("Agent Commons upstream URL must be credential-free HTTPS ending at /api/agent-room");
    }
    upstream.search = "";

    const tokens = {};
    if (parsed.tokens && !Array.isArray(parsed.tokens) && typeof parsed.tokens === "object") {
      for (const [rawActor, rawToken] of Object.entries(parsed.tokens)) {
        const actor = normalizeAgent(rawActor);
        const token = typeof rawToken === "string" ? rawToken.trim() : "";
        if (actor && token.length >= 24 && token.length <= 512) tokens[actor] = token;
      }
    }
    if (!Object.keys(tokens).length) {
      throw new Error("Agent Commons upstream config has no valid scoped tokens");
    }
    return { url: upstream.toString(), tokens };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    if (error instanceof SyntaxError) {
      throw new Error("Agent Commons upstream config must be valid JSON");
    }
    throw error;
  }
}

async function proxyRoomRequest(request, response, requestUrl, actor, upstream, fetchImpl) {
  const token = upstream.tokens[actor];
  if (!token) {
    return json(response, { error: `No upstream Agent Commons token is configured for ${actor}` }, 503);
  }

  const target = new URL(upstream.url);
  target.search = requestUrl.search;
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  let body;
  if (["POST", "PATCH"].includes(request.method)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(await readJsonBody(request));
  }

  const upstreamResponse = await fetchImpl(target, {
    method: request.method,
    headers,
    body,
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  const responseHeaders = {
    "Cache-Control": "private, no-store",
    "Content-Type": upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  };
  const etag = upstreamResponse.headers.get("etag");
  if (etag) responseHeaders.ETag = etag;
  response.writeHead(upstreamResponse.status, responseHeaders);
  response.end(await upstreamResponse.text());
}

function requestActor(request) {
  return normalizeAgent(request.headers["x-agent"]) || "kelly";
}

export function createLocalRoomServer(options = {}) {
  const stateFile = path.resolve(options.stateFile || DEFAULT_STATE_FILE);
  const upstreamConfigFile = options.upstreamConfigFile
    ? path.resolve(options.upstreamConfigFile)
    : "";
  const fetchImpl = options.fetchImpl || fetch;
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
        const upstream = await readUpstreamConfig(upstreamConfigFile);
        if (upstream) {
          if (!["GET", "POST", "PATCH"].includes(request.method)) {
            response.setHeader("Allow", "GET, POST, PATCH");
            return json(response, { error: "Method not allowed" }, 405);
          }
          return proxyRoomRequest(request, response, url, actor, upstream, fetchImpl);
        }
        if (request.method === "GET") {
          const room = await readRoomFile(stateFile);
          const view = roomView(room, actor, {
            after: url.searchParams.get("after"),
            limit: url.searchParams.get("limit"),
            inboxOnly: url.searchParams.get("inbox") === "1",
          });
          return json(response, { ...view, transport: "local-state" });
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

      const avatar = url.pathname.match(/^\/assets\/avatars\/(kelly|codex|claude-code|kip|vellum)\.png$/);
      const staticFile = avatar
        ? [`assets/avatars/${avatar[1]}.png`, "image/png"]
        : STATIC_FILES.get(url.pathname);
      if (!staticFile) return json(response, { error: "Not found" }, 404);
      const [relativePath, contentType] = staticFile;
      let bytes;
      try {
        bytes = await readFile(path.join(PROJECT_ROOT, relativePath));
      } catch (error) {
        if (error.code === "ENOENT") return json(response, { error: "Not found" }, 404);
        throw error;
      }
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
  const server = createLocalRoomServer({
    stateFile: process.env.AGENT_COMMONS_FILE,
    upstreamConfigFile: process.env.AGENT_COMMONS_UPSTREAM_CONFIG || DEFAULT_UPSTREAM_CONFIG_FILE,
  });
  server.listen(port, host, () => {
    process.stdout.write(`Agent Commons room: http://${host}:${port}/brain/room.html\n`);
    process.stdout.write("Loopback only. Press Ctrl+C to stop.\n");
  });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
