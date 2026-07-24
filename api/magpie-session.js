import { isAuthenticated, sendJson } from "./_magpie-auth.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  return sendJson(response, { authenticated: isAuthenticated(request) });
}
