import {
  createHmac,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const COOKIE_NAME = "magpie_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function header(request, name) {
  if (typeof request.headers?.get === "function") {
    return request.headers.get(name) || "";
  }
  const value = request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function requestProtocol(request) {
  try {
    return new URL(request.url).protocol;
  } catch {
    const forwarded = header(request, "x-forwarded-proto").split(",")[0].trim();
    if (forwarded) return `${forwarded}:`;
    return request.socket?.encrypted ? "https:" : "http:";
  }
}

function requestOrigin(request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return `${requestProtocol(request)}//${header(request, "host")}`;
  }
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(request) {
  const cookieHeader = header(request, "cookie");
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index < 0) return [part, ""];
        return [
          decodeURIComponent(part.slice(0, index)),
          decodeURIComponent(part.slice(index + 1)),
        ];
      }),
  );
}

function sessionSecret() {
  const secret = process.env.MAGPIE_SESSION_SECRET || "";
  if (secret.length < 32) {
    throw new Error("MAGPIE_SESSION_SECRET is not configured");
  }
  return secret;
}

function sign(value) {
  return createHmac("sha256", sessionSecret())
    .update(value)
    .digest("base64url");
}

export function isAuthenticated(request) {
  try {
    const token = parseCookies(request)[COOKIE_NAME] || "";
    const separator = token.lastIndexOf(".");
    if (separator < 1) return false;

    const payload = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    if (!safeEqual(signature, sign(payload))) return false;

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Number.isFinite(parsed.exp) && Date.now() < parsed.exp;
  } catch {
    return false;
  }
}

export function verifyPassword(password) {
  const record = process.env.MAGPIE_PASSWORD_RECORD || "";
  const separator = record.indexOf(".");
  if (separator < 1 || typeof password !== "string") return false;

  try {
    const salt = record.slice(0, separator);
    const expected = Buffer.from(record.slice(separator + 1), "hex");
    const actual = scryptSync(password, salt, expected.length);
    return expected.length > 0 && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createSessionCookie(request) {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const payload = Buffer.from(
    JSON.stringify({ exp: expiresAt }),
  ).toString("base64url");
  const value = encodeURIComponent(`${payload}.${sign(payload)}`);
  const secure = requestProtocol(request) === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; SameSite=Lax${secure}`;
}

export function clearSessionCookie(request) {
  const secure = requestProtocol(request) === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}

export function isSameOrigin(request) {
  const origin = header(request, "origin");
  if (!origin) return true;
  return origin === requestOrigin(request);
}

export function requestUrl(request) {
  try {
    return new URL(request.url);
  } catch {
    return new URL(request.url || "/", requestOrigin(request));
  }
}

export function sendJson(response, body, status = 200, headers = {}) {
  response.statusCode = status;
  response.setHeader("Cache-Control", "private, no-store");
  for (const [name, value] of Object.entries(headers)) {
    response.setHeader(name, value);
  }
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

export function unauthorized(response) {
  return sendJson(response, { error: "Authentication required" }, 401);
}
