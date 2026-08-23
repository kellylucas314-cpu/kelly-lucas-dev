import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createLocalRoomServer } from "../scripts/agent-room-local.mjs";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return `http://127.0.0.1:${address.port}/api/agent-room`;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test("the loopback server supports visible room messages and acknowledgements", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-room-test-"));
  const stateFile = path.join(directory, "state.json");
  const server = createLocalRoomServer({ stateFile });
  const url = await listen(server);

  try {
    const sent = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Agent": "codex" },
      body: JSON.stringify({
        from: "kip",
        to: ["all"],
        body: "Codex is live in Agent Commons",
        clientId: "integration-001",
      }),
    });
    assert.equal(sent.status, 201);
    const sentBody = await sent.json();
    assert.equal(sentBody.message.from, "codex");
    assert.equal(sentBody.message.seq, 1);

    const listed = await fetch(`${url}?inbox=1`, { headers: { "X-Agent": "kip" } });
    const room = await listed.json();
    assert.equal(room.viewer, "kip");
    assert.equal(room.transport, "local-state");
    assert.equal(room.unread, 1);
    assert.equal(room.messages[0].body, "Codex is live in Agent Commons");

    const ack = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Agent": "kip" },
      body: JSON.stringify({ through: 1 }),
    });
    assert.equal(ack.status, 200);
    assert.equal((await ack.json()).cursor.seq, 1);

    const stored = JSON.parse(await readFile(stateFile, "utf8"));
    assert.equal(stored.messages.length, 1);
    assert.equal(stored.cursors.kip.seq, 1);
  } finally {
    await close(server);
    await rm(directory, { recursive: true, force: true });
  }
});

test("the loopback server proxies every Mac identity to one HTTPS room with scoped tokens", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-room-proxy-test-"));
  const stateFile = path.join(directory, "state.json");
  const configFile = path.join(directory, "upstream.json");
  await writeFile(configFile, JSON.stringify({
    url: "https://agent-commons.example/api/agent-room",
    tokens: {
      kelly: "kelly-test-token-0000000000000000",
      codex: "codex-test-token-0000000000000000",
    },
  }), { mode: 0o600 });

  const upstreamCalls = [];
  const fetchImpl = async (url, options) => {
    upstreamCalls.push({ url: url.toString(), options });
    const viewer = options.headers.Authorization.includes("kelly-test") ? "kelly" : "codex";
    return new Response(JSON.stringify({
      schemaVersion: 2,
      revision: 9,
      viewer,
      transport: "https-room",
      messages: [],
      cursors: {},
      unread: 0,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", ETag: "room-9" },
    });
  };
  const server = createLocalRoomServer({ stateFile, upstreamConfigFile: configFile, fetchImpl });
  const url = await listen(server);

  try {
    const kellyResponse = await fetch(`${url}?after=3&limit=1`);
    assert.equal(kellyResponse.status, 200);
    assert.equal((await kellyResponse.json()).viewer, "kelly");

    const codexResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Agent": "codex" },
      body: JSON.stringify({ body: "One remote room", to: ["all"] }),
    });
    assert.equal(codexResponse.status, 200);
    assert.equal((await codexResponse.json()).viewer, "codex");
    assert.equal(upstreamCalls.length, 2);
    assert.equal(upstreamCalls[0].url, "https://agent-commons.example/api/agent-room?after=3&limit=1");
    assert.equal(upstreamCalls[0].options.headers.Authorization, "Bearer kelly-test-token-0000000000000000");
    assert.equal(upstreamCalls[1].options.headers.Authorization, "Bearer codex-test-token-0000000000000000");
    assert.equal(JSON.parse(upstreamCalls[1].options.body).body, "One remote room");
    await assert.rejects(readFile(stateFile, "utf8"), { code: "ENOENT" });
  } finally {
    await close(server);
    await rm(directory, { recursive: true, force: true });
  }
});

test("the loopback server rejects an upstream credential file with broad permissions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-room-proxy-permissions-test-"));
  const configFile = path.join(directory, "upstream.json");
  await writeFile(configFile, JSON.stringify({
    url: "https://agent-commons.example/api/agent-room",
    tokens: { kelly: "kelly-test-token-0000000000000000" },
  }), { mode: 0o644 });
  const server = createLocalRoomServer({ upstreamConfigFile: configFile });
  const url = await listen(server);

  try {
    const response = await fetch(url);
    assert.equal(response.status, 500);
    const result = await response.json();
    assert.match(result.error, /private file with mode 600/);
    assert.doesNotMatch(JSON.stringify(result), /kelly-test-token/);
  } finally {
    await close(server);
    await rm(directory, { recursive: true, force: true });
  }
});
