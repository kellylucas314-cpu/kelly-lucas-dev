import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  createAgentRoomHandler,
  proxyErrorSummary,
  validatedStoreUrl,
} from "../api/agent-room.js";

const STORE_URL = "https://zrxjhwnqekgovqxotbnl.supabase.co/functions/v1/agent-commons-store";

function responseCapture() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.value = value; },
  };
}

function request(method, token, body, query = "") {
  return {
    method,
    url: `https://service.example/api/agent-room${query}`,
    headers: { authorization: `Bearer ${token}`, host: "service.example" },
    body,
  };
}

test("the proxy accepts only the approved Supabase Edge Function URL", () => {
  assert.equal(validatedStoreUrl(STORE_URL)?.toString(), STORE_URL);
  for (const invalid of [
    "http://zrxjhwnqekgovqxotbnl.supabase.co/functions/v1/agent-commons-store",
    "https://other.supabase.co/functions/v1/agent-commons-store",
    "https://zrxjhwnqekgovqxotbnl.supabase.co/functions/v1/other",
    `${STORE_URL}?token=nope`,
    "not-a-url",
  ]) {
    assert.equal(validatedStoreUrl(invalid), null);
  }
});

test("the Vercel API re-authenticates then forwards the scoped token and request", async () => {
  const token = "codex-test-token-000000000000000000";
  const calls = [];
  const handler = createAgentRoomHandler({
    env: {
      AGENT_COMMONS_STORE_URL: STORE_URL,
      AGENT_ROOM_TOKEN_HASHES: JSON.stringify({
        codex: createHash("sha256").update(token).digest("hex"),
      }),
    },
    fetchImpl: async (url, options) => {
      calls.push({ url: url.toString(), options });
      return new Response(JSON.stringify({ viewer: "codex", revision: 33 }), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ETag: 'W/"room-33"',
        },
      });
    },
  });
  const output = responseCapture();
  await handler(request("POST", token, { body: "hello" }, "?after=4"), output);

  assert.equal(output.statusCode, 200);
  assert.equal(JSON.parse(output.value).viewer, "codex");
  assert.equal(output.headers.ETag, 'W/"room-33"');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${STORE_URL}?after=4`);
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${token}`);
  assert.deepEqual(JSON.parse(calls[0].options.body), { body: "hello" });
});

test("the Vercel API rejects a bad token before contacting Supabase", async () => {
  let called = false;
  const handler = createAgentRoomHandler({
    env: { AGENT_COMMONS_STORE_URL: STORE_URL, AGENT_ROOM_TOKEN_HASHES: "{}" },
    fetchImpl: async () => { called = true; },
  });
  const output = responseCapture();
  await handler(request("GET", "unknown-token-000000000000000000"), output);
  assert.equal(output.statusCode, 401);
  assert.equal(called, false);
});

test("proxy diagnostics never expose provider messages or tokens", () => {
  const error = Object.assign(new Error("private provider message and token"), {
    code: "store_response_invalid",
    statusCode: 503,
    token: "never-log-this",
  });
  assert.deepEqual(proxyErrorSummary(error), {
    name: "Error",
    code: "store_response_invalid",
    statusCode: 503,
    reason: "store_response_invalid",
  });
});
