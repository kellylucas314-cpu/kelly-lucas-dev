import assert from "node:assert/strict";
import test from "node:test";
import {
  BOARD_SEATS,
  boardOwner,
  collectReactions,
  deriveBoard,
  hasReacted,
  isReactionMessage,
  reactionSummary,
} from "../lib/agent-room-board.js";
import { appendMessage, deriveThreads, emptyRoom } from "../lib/agent-room-model.js";

function room(...posts) {
  let value = emptyRoom();
  let clock = Date.parse("2026-08-23T10:00:00.000Z");
  for (const [actor, input] of posts) {
    clock += 60_000;
    value = appendMessage(value, input, actor, { now: new Date(clock).toISOString(), idFactory: () => `t-${value.nextSeq}` }).room;
  }
  return value;
}

test("boardOwner prefers nextOwner, then waitingOn, and hides resolved threads", () => {
  assert.equal(boardOwner({ status: "open", nextOwner: "kip", waitingOn: ["codex"] }), "kip");
  assert.equal(boardOwner({ status: "waiting", nextOwner: "", waitingOn: ["codex"] }), "codex");
  assert.equal(boardOwner({ status: "open", nextOwner: "", waitingOn: [] }), "");
  assert.equal(boardOwner({ status: "resolved", nextOwner: "kip", waitingOn: [] }), "");
});

test("deriveBoard groups threads under seats with unowned and wrapped-up lanes", () => {
  const value = room(
    ["kelly", { body: "Kip, take the deck", to: ["kip"], kind: "question", threadId: "deck", waitingOn: ["kip"] }],
    ["codex", { body: "Open chatter", to: ["all"], threadId: "general" }],
    ["vellum", { body: "Done here", to: ["all"], kind: "status", threadId: "old-topic", thread: { status: "resolved" } }],
    ["claude-code", { body: "Handoff: fonts", to: ["kelly"], kind: "handoff", threadId: "fonts", note: { summary: "Pick a font", nextOwner: "kelly" }, waitingOn: ["kelly"] }],
  );
  const board = deriveBoard(deriveThreads(value, "kelly"), { viewer: "kelly" });
  const byId = new Map(board.columns.map((column) => [column.id, column.threads.map((thread) => thread.id)]));
  assert.deepEqual(board.columns.map((column) => column.id), BOARD_SEATS);
  assert.deepEqual(byId.get("kip"), ["deck"]);
  assert.deepEqual(byId.get("kelly"), ["fonts"]);
  assert.deepEqual(board.unassigned.map((thread) => thread.id), ["general"]);
  assert.deepEqual(board.done.map((thread) => thread.id), ["old-topic"]);
  assert.equal(board.doneTotal, 1);
});

test("a handoff reply moves the card to the new owner's column", () => {
  const value = room(
    ["kelly", { body: "Kip, take the deck", to: ["kip"], kind: "question", threadId: "deck", waitingOn: ["kip"] }],
    ["kip", { body: "Handing to codex", to: ["codex"], kind: "handoff", threadId: "deck", note: { summary: "Your turn", nextOwner: "codex" }, waitingOn: ["codex"] }],
  );
  const board = deriveBoard(deriveThreads(value, "kelly"));
  const byId = new Map(board.columns.map((column) => [column.id, column.threads.map((thread) => thread.id)]));
  assert.deepEqual(byId.get("codex"), ["deck"]);
  assert.deepEqual(byId.get("kip"), []);
});

test("deriveBoard caps the wrapped-up lane but reports the true total", () => {
  const threads = Array.from({ length: 12 }, (_, index) => ({
    id: `done-${index}`, status: "resolved", resolvedSeq: index + 1, waitingOn: [], nextOwner: "", lastSeq: index + 1,
  }));
  const board = deriveBoard(threads, { doneLimit: 3 });
  assert.equal(board.done.length, 3);
  assert.equal(board.doneTotal, 12);
  assert.equal(board.done[0].id, "done-11");
});

test("reaction messages are one-emoji replies only", () => {
  assert.equal(isReactionMessage({ kind: "message", replyTo: "m-1", body: "🎉" }), true);
  assert.equal(isReactionMessage({ kind: "message", replyTo: "m-1", body: " 👀 " }), true);
  assert.equal(isReactionMessage({ kind: "message", replyTo: "", body: "🎉" }), false);
  assert.equal(isReactionMessage({ kind: "message", replyTo: "m-1", body: "🎉 nice" }), false);
  assert.equal(isReactionMessage({ kind: "status", replyTo: "m-1", body: "🎉" }), false);
});

test("reactions collect on their parent and aggregate one vote per agent", () => {
  const value = room(
    ["codex", { body: "Shipped the export", to: ["all"], kind: "status", threadId: "general" }],
    ["kelly", { body: "🎉", to: ["codex"], threadId: "general", replyTo: "message-t-1" }],
    ["vellum", { body: "🎉", to: ["codex"], threadId: "general", replyTo: "message-t-1" }],
    ["vellum", { body: "🎉", to: ["codex"], threadId: "general", replyTo: "message-t-1" }],
    ["kip", { body: "👀", to: ["codex"], threadId: "general", replyTo: "message-t-1" }],
  );
  const byParent = collectReactions(value.messages);
  const list = byParent.get("message-t-1");
  assert.equal(list.length, 4);
  const summary = reactionSummary(list);
  assert.deepEqual(summary.map((chip) => [chip.emoji, chip.count]), [["🎉", 2], ["👀", 1]]);
  assert.deepEqual(summary[0].agents, ["kelly", "vellum"]);
  assert.equal(hasReacted(list, "vellum", "🎉"), true);
  assert.equal(hasReacted(list, "vellum", "👀"), false);
});
