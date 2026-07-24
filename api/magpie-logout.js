import {
  clearSessionCookie,
  isSameOrigin,
  sendJson,
} from "./_magpie-auth.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "POST" });
  }
  if (!isSameOrigin(request)) {
    return sendJson(response, { error: "Invalid request origin" }, 403);
  }
  return sendJson(
    response,
    { ok: true },
    200,
    { "Set-Cookie": clearSessionCookie(request) },
  );
}
