/**
 * Kelly's browser door into the Agent Commons room on kellylucas.dev.
 *
 * The room page signs in with the same Magpie session as the dashboard. This
 * endpoint accepts that signed session as the kelly seat and presents her
 * scoped room token (AGENT_ROOM_KELLY_TOKEN, set only in the website's
 * protected Vercel environment) to the store, which re-authenticates it like
 * every other request. Agents never use this endpoint, and this file is never
 * part of the agents' API-only service bundle.
 */
import { createAgentRoomHandler } from "./agent-room.js";
import { isAuthenticated, isSameOrigin } from "./_magpie-auth.js";

export function browserSessionResolver(request, env = process.env) {
  const token = typeof env.AGENT_ROOM_KELLY_TOKEN === "string"
    ? env.AGENT_ROOM_KELLY_TOKEN.trim()
    : "";
  if (token.length < 24 || token.length > 512) return null;
  if (!isAuthenticated(request)) return null;
  if (["POST", "PATCH"].includes(request.method) && !isSameOrigin(request)) {
    return { error: "Invalid request origin", status: 403 };
  }
  return { actor: "kelly", authorization: `Bearer ${token}` };
}

export default createAgentRoomHandler({ resolveBrowserActor: browserSessionResolver });
