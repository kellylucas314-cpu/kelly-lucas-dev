import { clipKey, isAuthenticated, requestUrl, sendJson } from "./_magpie-auth.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  const authenticated = isAuthenticated(request);
  const body = { authenticated };
  /* The feather's key, only for a signed-in browser that asks for it. */
  if (authenticated && requestUrl(request).searchParams.get("key") === "1") {
    try {
      body.clipKey = clipKey();
    } catch {
      body.clipKey = "";
    }
  }
  return sendJson(response, body);
}
