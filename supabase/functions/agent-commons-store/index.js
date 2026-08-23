import {
  acknowledgeRoom,
  appendMessage,
  emptyRoom,
  roomView,
  sanitizeRoom,
} from "../../../lib/agent-room-model.js";

const MAX_BODY_BYTES = 16 * 1024;
const MAX_WRITE_ATTEMPTS = 5;
const RPC_TIMEOUT_MS = 10_000;
const ALLOWED_ACTORS = new Set(["kelly", "codex", "claude-code", "kip", "vellum"]);

class StoreError extends Error {
  constructor(code, statusCode = 503) {
    super(code);
    this.name = "StoreError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function responseHeaders(revision, methods) {
  return {
    Allow: methods,
    ETag: `W/\"room-${revision}\"`,
  };
}

function secretKey(env) {
  const modern = env.get("SUPABASE_SECRET_KEYS") || "";
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      const candidate = parsed?.default || Object.values(parsed || {}).find((value) => (
        typeof value === "string" && value.length >= 24
      ));
      if (typeof candidate === "string" && candidate.length >= 24) return candidate;
    } catch {
      throw new StoreError("store_secret_invalid");
    }
  }

  const legacy = env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (legacy.length >= 24) return legacy;
  throw new StoreError("store_secret_missing");
}

function createRpc({ env, fetchImpl }) {
  const baseUrl = env.get("SUPABASE_URL") || "";
  if (!/^https:\/\/[^/]+\.supabase\.co\/?$/i.test(baseUrl)) {
    throw new StoreError("store_url_invalid");
  }
  const key = secretKey(env);

  return async (name, body) => {
    const target = new URL(`/rest/v1/rpc/${name}`, baseUrl);
    let response;
    try {
      response = await fetchImpl(target, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(body || {}),
      });
    } catch {
      throw new StoreError("store_rpc_unreachable");
    }

    if (!response.ok) throw new StoreError("store_rpc_failed");
    try {
      return await response.json();
    } catch {
      throw new StoreError("store_rpc_invalid_json");
    }
  };
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function authenticate(request, rpc) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return "";
  const token = authorization.slice(7).trim();
  if (token.length < 24 || token.length > 512) return "";

  const actor = await rpc("agent_commons_authenticate", {
    p_token_hash: await sha256(token),
  });
  return typeof actor === "string" && ALLOWED_ACTORS.has(actor) ? actor : "";
}

async function requestBody(request) {
  const statedLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
  if (Number.isFinite(statedLength) && statedLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Agent Room request is too large"), { statusCode: 413 });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Agent Room request is too large"), { statusCode: 413 });
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes) || "{}");
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON"), { statusCode: 400 });
  }
}

function safeErrorSummary(error) {
  return {
    name: typeof error?.name === "string" ? error.name : "Error",
    code: typeof error?.code === "string" ? error.code : null,
    statusCode: Number.isInteger(error?.statusCode) ? error.statusCode : null,
  };
}

export function createAgentCommonsStoreHandler(options = {}) {
  const env = options.env || globalThis.Deno?.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const rpc = options.rpcCall || createRpc({ env, fetchImpl });

  async function loadRoom() {
    const stored = await rpc("agent_commons_load", {});
    return stored ? sanitizeRoom(stored) : emptyRoom();
  }

  async function mutateRoom(mutator) {
    for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt += 1) {
      const room = await loadRoom();
      const result = mutator(room);
      if (!result.changed) return result;
      const changed = await rpc("agent_commons_compare_and_set", {
        p_expected_revision: room.revision,
        p_new_state: result.room,
      });
      if (changed === true) return result;
    }
    throw Object.assign(new Error("Agent Room is busy; retry shortly"), { statusCode: 409 });
  }

  return async function handler(request) {
    const methods = "GET, POST, PATCH";
    if (!["GET", "POST", "PATCH"].includes(request.method)) {
      return json({ error: "Method not allowed" }, 405, { Allow: methods });
    }

    try {
      const actor = await authenticate(request, rpc);
      if (!actor) return json({ error: "Authentication required" }, 401);

      if (request.method === "GET") {
        const room = await loadRoom();
        const url = new URL(request.url);
        const view = roomView(room, actor, {
          after: url.searchParams.get("after"),
          limit: url.searchParams.get("limit"),
          inboxOnly: url.searchParams.get("inbox") === "1",
        });
        return json(
          { ...view, transport: "https-room" },
          200,
          responseHeaders(view.revision, methods),
        );
      }

      const body = await requestBody(request);
      if (request.method === "POST") {
        const result = await mutateRoom((room) => appendMessage(room, body, actor));
        return json({
          message: result.message,
          revision: result.room.revision,
          duplicate: !result.changed,
        }, result.changed ? 201 : 200, responseHeaders(result.room.revision, methods));
      }

      const result = await mutateRoom((room) => acknowledgeRoom(room, actor, body.through));
      return json({
        cursor: result.cursor,
        revision: result.room.revision,
      }, 200, responseHeaders(result.room.revision, methods));
    } catch (error) {
      console.error("Agent Commons store request failed", safeErrorSummary(error));
      const status = Number.isInteger(error?.statusCode) ? error.statusCode : 503;
      return json({
        error: status === 503
          ? "The private Agent Room is temporarily unavailable"
          : error.message,
      }, status);
    }
  };
}

if (globalThis.Deno?.serve) {
  globalThis.Deno.serve(createAgentCommonsStoreHandler());
}
