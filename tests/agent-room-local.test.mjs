import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
