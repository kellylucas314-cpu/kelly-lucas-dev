import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { emptyRoom } from "../lib/agent-room-model.js";
import { createAgentCommonsStoreHandler } from "../supabase/functions/agent-commons-store/index.js";

const TOKEN = "codex-test-token-000000000000000000";
const TOKEN_HASH = createHash("sha256").update(TOKEN).digest("hex");
const URL = "https://store.example/functions/v1/agent-commons-store";

function request(method = "GET", body, token = TOKEN) {
  return new Request(URL, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function fakeStore({ conflictOnce = false, fail = false } = {}) {
  let room = emptyRoom();
  let conflicts = conflictOnce ? 1 : 0;
  const calls = [];
  return {
    calls,
    room: () => room,
    rpcCall: async (name, body) => {
      calls.push({ name, body });
      if (fail) throw new Error("private database detail");
      if (name === "agent_commons_authenticate") {
        return body.p_token_hash === TOKEN_HASH ? "codex" : null;
      }
      if (name === "agent_commons_load") return structuredClone(room);
      if (name === "agent_commons_compare_and_set") {
        if (conflicts > 0) {
          conflicts -= 1;
          return false;
        }
        if (body.p_expected_revision !== room.revision) return false;
        room = structuredClone(body.p_new_state);
        return true;
      }
      throw new Error(`unexpected RPC ${name}`);
    },
  };
}

test("the Supabase store re-authenticates the actor and preserves room identity", async () => {
  const store = fakeStore();
  const handler = createAgentCommonsStoreHandler({ rpcCall: store.rpcCall });

  const initial = await handler(request());
  assert.equal(initial.status, 200);
  assert.deepEqual(await initial.json(), {
    schemaVersion: 2,
    revision: 0,
    nextSeq: 1,
    updatedAt: null,
    viewer: "codex",
    unread: 0,
    cursors: {},
    messages: [],
    threads: [],
    inbox: [],
    transport: "https-room",
  });

  const sent = await handler(request("POST", {
    from: "kip",
    to: ["all"],
    body: "One authenticated room",
    threadId: "launch-thread",
    clientId: "codex-test-message",
  }));
  assert.equal(sent.status, 201);
  const sentBody = await sent.json();
  assert.equal(sentBody.message.from, "codex");
  assert.equal(sentBody.message.seq, 1);
  assert.equal(store.room().revision, 1);

  const duplicate = await handler(request("POST", {
    from: "kip",
    to: ["all"],
    body: "One authenticated room",
    threadId: "launch-thread",
    clientId: "codex-test-message",
  }));
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).duplicate, true);
  assert.equal(store.room().revision, 1);
});

test("the Supabase store rejects unknown tokens and unsupported methods", async () => {
  const store = fakeStore();
  const handler = createAgentCommonsStoreHandler({ rpcCall: store.rpcCall });
  assert.equal((await handler(request("GET", undefined, "unknown-token-000000000000000000"))).status, 401);
  assert.equal((await handler(request("DELETE"))).status, 405);
  assert.equal(store.room().revision, 0);
});

test("the Supabase store retries one compare-and-set conflict", async () => {
  const store = fakeStore({ conflictOnce: true });
  const handler = createAgentCommonsStoreHandler({ rpcCall: store.rpcCall });
  const response = await handler(request("POST", {
    to: ["all"],
    body: "Retry safely",
    threadId: "concurrency",
    clientId: "codex-conflict-test",
  }));
  assert.equal(response.status, 201);
  assert.equal(store.room().revision, 1);
  assert.equal(store.calls.filter((call) => call.name === "agent_commons_compare_and_set").length, 2);
});

test("the Supabase store returns a generic provider failure", async () => {
  const store = fakeStore({ fail: true });
  const handler = createAgentCommonsStoreHandler({ rpcCall: store.rpcCall });
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await handler(request());
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.equal(result.error, "The private Agent Room is temporarily unavailable");
    assert.doesNotMatch(JSON.stringify(result), /private database detail/);
  } finally {
    console.error = originalError;
  }
});
