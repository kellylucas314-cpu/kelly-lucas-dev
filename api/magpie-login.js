import {
  createSessionCookie,
  isSameOrigin,
  sendJson,
  verifyPassword,
} from "./_magpie-auth.js";

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function clientKey(request) {
  const forwarded = request.headers?.["x-forwarded-for"] || "unknown";
  return String(forwarded)
    .split(",")[0]
    .trim();
}

function isRateLimited(request) {
  const key = clientKey(request);
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  attempts.set(key, recent);
  return recent.length >= MAX_ATTEMPTS;
}

function recordFailure(request) {
  const key = clientKey(request);
  attempts.set(key, [...(attempts.get(key) || []), Date.now()]);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "POST" });
  }
  if (!isSameOrigin(request)) {
    return sendJson(response, { error: "Invalid request origin" }, 403);
  }
  if (isRateLimited(request)) {
    return sendJson(
      response,
      { error: "Too many attempts. Please wait a few minutes." },
      429,
    );
  }

  let password = "";
  try {
    const body = typeof request.body === "string"
      ? JSON.parse(request.body)
      : request.body || {};
    password = String(body.password || "").slice(0, 256);
  } catch {
    return sendJson(response, { error: "Invalid request" }, 400);
  }

  if (!verifyPassword(password)) {
    recordFailure(request);
    await new Promise((resolve) => setTimeout(resolve, 400));
    return sendJson(response, { error: "That password did not work." }, 401);
  }

  attempts.delete(clientKey(request));
  return sendJson(
    response,
    { ok: true },
    200,
    { "Set-Cookie": createSessionCookie(request) },
  );
}
