/**
 * Kelly's browser path into the deployed Agent Commons room: the signed
 * Magpie session (same sign-in as the dashboard) acts as the kelly seat, and
 * the proxy attaches her scoped room token from the protected environment.
 * Agents keep using bearer tokens; nothing about their path changes here.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createAgentRoomHandler } from "../api/agent-room.js";
import { browserSessionResolver } from "../api/room-session.js";
import { createSessionCookie } from "../api/_magpie-auth.js";

const STORE_URL = "https://zrxjhwnqekgovqxotbnl.supabase.co/functions/v1/agent-commons-store";
const KELLY_TOKEN = "kelly-browser-token-0123456789abcdef";
const CODEX_TOKEN = "codex-agent-token-0123456789abcdef";

function fakeResponse() {
  const state = { statusCode: 0, headers: {}, body: "" };
  return {
    state,
    setHeader(name, value) { state.headers[name.toLowerCase()] = value; },
    end(body) { state.body = body || ""; },
    set statusCode(value) { state.statusCode = value; },
    get statusCode() { return state.statusCode; },
  };
}

function fakeStoreFetch(calls) {
  return async (url, options) => {
    calls.push({ url: String(url), options });
    return {
      status: 200,
      headers: new Map([["content-type", "application/json"], ["allow", ""], ["etag", ""]]),
      json: async () => ({ ok: true }),
    };
  };
}

function buildEnv() {
  return {
    AGENT_COMMONS_STORE_URL: STORE_URL,
    AGENT_ROOM_KELLY_TOKEN: KELLY_TOKEN,
    AGENT_ROOM_TOKEN_HASHES: JSON.stringify({
      codex: createHash("sha256").update(CODEX_TOKEN).digest("hex"),
    }),
  };
}

function sessionCookie() {
  return createSessionCookie({ url: "https://www.kellylucas.dev/brain/room.html", headers: {} })
    .split(";")[0];
}

function request(overrides = {}) {
  return {
    method: "GET",
    url: "https://www.kellylucas.dev/api/agent-room?after=0",
    headers: {},
    ...overrides,
  };
}

test.beforeEach(() => {
  process.env.MAGPIE_SESSION_SECRET = "a".repeat(48);
});

test("no session and no bearer token is turned away", async () => {
  const calls = [];
  const handler = createAgentRoomHandler({ env: buildEnv(), fetchImpl: fakeStoreFetch(calls), resolveBrowserActor: browserSessionResolver });
  const response = fakeResponse();
  await handler(request(), response);
  assert.equal(response.state.statusCode, 401);
  assert.equal(calls.length, 0);
});

test("the signed Magpie session reads the room as kelly with her scoped token", async () => {
  const calls = [];
  const handler = createAgentRoomHandler({ env: buildEnv(), fetchImpl: fakeStoreFetch(calls), resolveBrowserActor: browserSessionResolver });
  const response = fakeResponse();
  await handler(request({ headers: { cookie: sessionCookie() } }), response);
  assert.equal(response.state.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${KELLY_TOKEN}`);
  assert.match(calls[0].url, /agent-commons-store\?after=0$/);
});

test("session writes must come from the site itself", async () => {
  const calls = [];
  const handler = createAgentRoomHandler({ env: buildEnv(), fetchImpl: fakeStoreFetch(calls), resolveBrowserActor: browserSessionResolver });
  const response = fakeResponse();
  await handler(request({
    method: "POST",
    body: JSON.stringify({ body: "hello" }),
    headers: { cookie: sessionCookie(), origin: "https://evil.example" },
  }), response);
  assert.equal(response.state.statusCode, 403);
  assert.equal(calls.length, 0);
});

test("same-origin session writes go through as kelly", async () => {
  const calls = [];
  const handler = createAgentRoomHandler({ env: buildEnv(), fetchImpl: fakeStoreFetch(calls), resolveBrowserActor: browserSessionResolver });
  const response = fakeResponse();
  await handler(request({
    method: "POST",
    body: JSON.stringify({ body: "hello", to: ["all"], kind: "message", clientId: "kelly-web-1" }),
    headers: { cookie: sessionCookie(), origin: "https://www.kellylucas.dev" },
  }), response);
  assert.equal(response.state.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${KELLY_TOKEN}`);
});

test("a tampered session cookie does not pass", async () => {
  const calls = [];
  const handler = createAgentRoomHandler({ env: buildEnv(), fetchImpl: fakeStoreFetch(calls), resolveBrowserActor: browserSessionResolver });
  const response = fakeResponse();
  const cookie = sessionCookie().replace(/.$/, (c) => (c === "A" ? "B" : "A"));
  await handler(request({ headers: { cookie } }), response);
  assert.equal(response.state.statusCode, 401);
  assert.equal(calls.length, 0);
});

test("agent bearer tokens still work exactly as before", async () => {
  const calls = [];
  const handler = createAgentRoomHandler({ env: buildEnv(), fetchImpl: fakeStoreFetch(calls), resolveBrowserActor: browserSessionResolver });
  const response = fakeResponse();
  await handler(request({ headers: { authorization: `Bearer ${CODEX_TOKEN}` } }), response);
  assert.equal(response.state.statusCode, 200);
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${CODEX_TOKEN}`);
});

test("a bad bearer token is rejected even with a valid session present", async () => {
  const calls = [];
  const handler = createAgentRoomHandler({ env: buildEnv(), fetchImpl: fakeStoreFetch(calls), resolveBrowserActor: browserSessionResolver });
  const response = fakeResponse();
  await handler(request({
    headers: { authorization: "Bearer wrong-token-0123456789abcdef", cookie: sessionCookie() },
  }), response);
  assert.equal(response.state.statusCode, 401);
  assert.equal(calls.length, 0);
});

test("the session path is off when no browser token is configured", async () => {
  const calls = [];
  const env = buildEnv();
  delete env.AGENT_ROOM_KELLY_TOKEN;
  const handler = createAgentRoomHandler({ env, fetchImpl: fakeStoreFetch(calls), resolveBrowserActor: browserSessionResolver });
  const response = fakeResponse();
  await handler(request({ headers: { cookie: sessionCookie() } }), response);
  assert.equal(response.state.statusCode, 401);
  assert.equal(calls.length, 0);
});

test("the agents' endpoint never accepts a browser session", async () => {
  const calls = [];
  const handler = createAgentRoomHandler({ env: buildEnv(), fetchImpl: fakeStoreFetch(calls) });
  const response = fakeResponse();
  await handler(request({ headers: { cookie: sessionCookie() } }), response);
  assert.equal(response.state.statusCode, 401);
  assert.equal(calls.length, 0);
});
