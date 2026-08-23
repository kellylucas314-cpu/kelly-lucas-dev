import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { agentRoomActor } from "../lib/agent-room-auth.js";

test("the HTTPS room accepts only a valid actor-scoped bearer token", () => {
  const kipToken = randomBytes(32).toString("base64url");
  const unknownToken = randomBytes(32).toString("base64url");
  process.env.AGENT_ROOM_TOKEN_HASHES = JSON.stringify({
    kip: createHash("sha256").update(kipToken).digest("hex"),
    stranger: createHash("sha256").update(unknownToken).digest("hex"),
  });

  assert.equal(agentRoomActor(new Request("https://room.example/api/agent-room", {
    headers: { Authorization: `Bearer ${kipToken}` },
  })), "kip");
  assert.equal(agentRoomActor(new Request("https://room.example/api/agent-room", {
    headers: { Authorization: "Bearer wrong-token" },
  })), "");
  assert.equal(agentRoomActor(new Request("https://room.example/api/agent-room", {
    headers: { Authorization: `Bearer ${unknownToken}` },
  })), "");
  assert.equal(agentRoomActor(new Request("https://room.example/api/agent-room")), "");
});
