import assert from "node:assert/strict";
import test from "node:test";
import {
  acknowledgeRoom,
  appendMessage,
  emptyRoom,
  roomView,
  sanitizeRoom,
} from "../lib/agent-room-model.js";

test("messages are append-only and the authenticated actor owns the sender field", () => {
  const first = appendMessage(emptyRoom(), {
    from: "kip",
    body: "  Codex checking in  ",
    to: ["claude-code"],
    waitingOn: ["claude-code"],
    clientId: "codex-checkin-001",
  }, "codex", {
    now: "2026-08-22T20:00:00.000Z",
    idFactory: () => "first",
  });

  assert.equal(first.message.seq, 1);
  assert.equal(first.message.from, "codex");
  assert.equal(first.message.body, "Codex checking in");
  assert.deepEqual(first.message.to, ["claude-code"]);
  assert.deepEqual(first.message.waitingOn, ["claude-code"]);
  assert.equal(first.room.messages.length, 1);

  const duplicate = appendMessage(first.room, {
    body: "This retry must not duplicate",
    clientId: "codex-checkin-001",
  }, "codex");
  assert.equal(duplicate.changed, false);
  assert.equal(duplicate.room.messages.length, 1);
  assert.equal(duplicate.message.body, "Codex checking in");
});

test("acknowledgements only move forward and inbox views preserve shared messages", () => {
  const first = appendMessage(emptyRoom(), { body: "Everyone sees this", to: ["all"] }, "kelly", {
    now: "2026-08-22T20:01:00.000Z",
    idFactory: () => "one",
  });
  const second = appendMessage(first.room, { body: "Kip only", to: ["kip"] }, "codex", {
    now: "2026-08-22T20:02:00.000Z",
    idFactory: () => "two",
  });
  const acknowledged = acknowledgeRoom(second.room, "kip", 2, {
    now: "2026-08-22T20:03:00.000Z",
  });
  const backwards = acknowledgeRoom(acknowledged.room, "kip", 1);

  assert.equal(backwards.changed, false);
  assert.equal(backwards.cursor.seq, 2);
  assert.equal(roomView(acknowledged.room, "kip", { inboxOnly: true }).messages.length, 2);
  assert.equal(roomView(acknowledged.room, "claude-code", { inboxOnly: true }).messages.length, 1);
  assert.equal(roomView(acknowledged.room, "kip").unread, 0);
});

test("stored room data is sanitized without executing or trusting message content", () => {
  const room = sanitizeRoom({
    revision: 4,
    messages: [
      { seq: 1, id: "message-safe", from: "codex", to: ["all"], body: "<script>data only</script>" },
      { seq: 2, id: "message-bad", from: "", body: "missing sender" },
    ],
    cursors: { codex: { seq: 99, at: "2026-08-22T20:00:00.000Z" } },
  });

  assert.equal(room.messages.length, 1);
  assert.equal(room.messages[0].body, "<script>data only</script>");
  assert.equal(room.cursors.codex.seq, 1);
  assert.equal(room.nextSeq, 2);
});
