import {
  agentRoomActor,
  requestUrl,
  sendJson,
  unauthorized,
} from "../lib/agent-room-auth.js";

const MAX_BODY_BYTES = 16 * 1024;
const STORE_TIMEOUT_MS = 10_000;
const STORE_HOST = "zrxjhwnqekgovqxotbnl.supabase.co";
const STORE_PATH = "/functions/v1/agent-commons-store";

function header(request, name) {
  if (typeof request.headers?.get === "function") {
    return request.headers.get(name) || "";
  }
  const value = request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export function validatedStoreUrl(rawValue) {
  let url;
  try {
    url = new URL(rawValue || "");
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== STORE_HOST ||
      url.pathname !== STORE_PATH || url.username || url.password ||
      url.search || url.hash) {
    return null;
  }
  return url;
}

function requestBody(request) {
  if (request.body === undefined || request.body === null) return "";
  const raw = typeof request.body === "string"
    ? request.body
    : Buffer.isBuffer(request.body)
      ? request.body.toString("utf8")
      : JSON.stringify(request.body);
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Agent Room request is too large"), { statusCode: 413 });
  }
  return raw;
}

export function proxyErrorSummary(error) {
  let reason = "unknown";
  if (error?.name === "TimeoutError" || error?.name === "AbortError") reason = "store_timeout";
  else if (error?.code === "store_url_invalid") reason = "store_url_invalid";
  else if (error?.code === "store_response_invalid") reason = "store_response_invalid";
  return {
    name: typeof error?.name === "string" ? error.name : "Error",
    code: typeof error?.code === "string" ? error.code : null,
    statusCode: Number.isInteger(error?.statusCode) ? error.statusCode : null,
    reason,
  };
}

function responseHeaders(upstream, methods) {
  const headers = { Allow: upstream.headers.get("allow") || methods };
  const etag = upstream.headers.get("etag");
  if (etag) headers.ETag = etag;
  return headers;
}

export function createAgentRoomHandler(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const env = options.env || process.env;

  return async function handler(request, response) {
    const methods = "GET, POST, PATCH";
    if (!["GET", "POST", "PATCH"].includes(request.method)) {
      return sendJson(response, { error: "Method not allowed" }, 405, { Allow: methods });
    }

    const actor = agentRoomActor(request, env);
    if (!actor) return unauthorized(response);

    try {
      const store = validatedStoreUrl(env.AGENT_COMMONS_STORE_URL);
      if (!store) throw Object.assign(new Error("Invalid Agent Commons store URL"), {
        code: "store_url_invalid",
      });

      const incomingUrl = requestUrl(request);
      store.search = incomingUrl.search;
      const body = request.method === "GET" ? "" : requestBody(request);
      const upstream = await fetchImpl(store, {
        method: request.method,
        redirect: "error",
        signal: AbortSignal.timeout(STORE_TIMEOUT_MS),
        headers: {
          Authorization: header(request, "authorization"),
          ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
        },
        body: body || undefined,
      });

      const contentType = upstream.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("application/json")) {
        throw Object.assign(new Error("Agent Commons store returned an invalid response"), {
          code: "store_response_invalid",
        });
      }

      const payload = await upstream.json().catch(() => {
        throw Object.assign(new Error("Agent Commons store returned invalid JSON"), {
          code: "store_response_invalid",
        });
      });
      return sendJson(
        response,
        payload,
        upstream.status,
        responseHeaders(upstream, methods),
      );
    } catch (error) {
      console.error("Agent Room proxy request failed", proxyErrorSummary(error));
      const status = Number.isInteger(error?.statusCode) ? error.statusCode : 503;
      return sendJson(response, {
        error: status === 503
          ? "The private Agent Room is temporarily unavailable"
          : error.message,
      }, status);
    }
  };
}

export default createAgentRoomHandler();
