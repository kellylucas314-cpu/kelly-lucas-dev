import { createHash, timingSafeEqual } from "node:crypto";

const ALLOWED_ACTORS = new Set(["kelly", "codex", "claude-code", "kip", "vellum"]);

function header(request, name) {
  if (typeof request.headers?.get === "function") {
    return request.headers.get(name) || "";
  }
  const value = request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

function tokenHashes(env = process.env) {
  try {
    const parsed = JSON.parse(env.AGENT_ROOM_TOKEN_HASHES || "{}");
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function agentRoomActor(request, env = process.env) {
  const authorization = header(request, "authorization");
  if (!authorization.startsWith("Bearer ")) return "";
  const token = authorization.slice(7).trim();
  if (token.length < 24 || token.length > 512) return "";

  const actual = createHash("sha256").update(token).digest("hex");
  for (const [actor, expected] of Object.entries(tokenHashes(env))) {
    if (!/^[a-z][a-z0-9_-]{1,31}$/i.test(actor)) continue;
    if (!ALLOWED_ACTORS.has(actor.toLowerCase())) continue;
    if (typeof expected !== "string" || !/^[a-f0-9]{64}$/i.test(expected)) continue;
    if (safeEqual(actual.toLowerCase(), expected.toLowerCase())) return actor.toLowerCase();
  }
  return "";
}

export function requestUrl(request) {
  try {
    return new URL(request.url);
  } catch {
    return new URL(request.url || "/", `https://${header(request, "host") || "agent-commons.invalid"}`);
  }
}

export function sendJson(response, body, status = 200, headers = {}) {
  response.statusCode = status;
  response.setHeader("Cache-Control", "private, no-store");
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

export function unauthorized(response) {
  return sendJson(response, { error: "Authentication required" }, 401);
}
