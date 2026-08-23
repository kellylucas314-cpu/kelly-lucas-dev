import assert from "node:assert/strict";
import test from "node:test";
import {
  acknowledgeRoom,
  appendMessage,
  deriveInbox,
  deriveThreads,
  emptyRoom,
  humanizeSlug,
  roomView,
  sanitizeRoom,
  slugify,
} from "../lib/agent-room-model.js";

let clock = Date.parse("2026-08-23T10:00:00.000Z");
function tick() {
  clock += 60_000;
  return new Date(clock).toISOString();
}

function post(room, actor, input, id) {
  const result = appendMessage(room, input, actor, { now: tick(), idFactory: () => id });
  return result.room;
}

function thread(room, id, viewer = "") {
  return deriveThreads(room, viewer).find((candidate) => candidate.id === id);
}

test("thread titles come from the newest title event and fall back to a readable slug", () => {
  let room = emptyRoom();
  room = post(room, "codex", { body: "first", threadId: "pc-heartbeat" }, "a");
  assert.equal(thread(room, "pc-heartbeat").title, "Pc heartbeat");
  room = post(room, "codex", { body: "named", threadId: "pc-heartbeat", thread: { title: "PC heartbeat lane" } }, "b");
  assert.equal(thread(room, "pc-heartbeat").title, "PC heartbeat lane");
  room = post(room, "kelly", { body: "renamed", threadId: "pc-heartbeat", thread: { title: "Kip heartbeat" } }, "c");
  assert.equal(thread(room, "pc-heartbeat").title, "Kip heartbeat");
  assert.equal(humanizeSlug("agent-commons-launch"), "Agent commons launch");
  assert.equal(slugify("Lantern demo deck: Friday!"), "lantern-demo-deck-friday");
  assert.equal(slugify("   "), "general");
});

test("a reply from the awaited party clears the wait instead of leaving it waiting forever", () => {
  let room = emptyRoom();
  room = post(room, "codex", {
    body: "Please review",
    threadId: "launch",
    to: ["all"],
    waitingOn: ["claude-code", "vellum"],
  }, "ask");
  assert.deepEqual(thread(room, "launch").waitingOn, ["claude-code", "vellum"]);
  assert.equal(thread(room, "launch").status, "waiting");
  assert.equal(thread(room, "launch").nextOwner, "claude-code");

  room = post(room, "claude-code", { body: "AGREE", threadId: "launch", replyTo: "message-ask" }, "agree");
  assert.deepEqual(thread(room, "launch").waitingOn, ["vellum"]);
  assert.equal(thread(room, "launch").nextOwner, "vellum");

  room = post(room, "kelly", { body: "Thanks both", threadId: "launch" }, "kelly-note");
  assert.deepEqual(thread(room, "launch").waitingOn, ["vellum"], "a bystander comment keeps the wait");

  room = post(room, "vellum", { body: "AGREE too", threadId: "launch" }, "vellum-agree");
  assert.deepEqual(thread(room, "launch").waitingOn, []);
  assert.equal(thread(room, "launch").status, "open");
  assert.equal(thread(room, "launch").nextOwner, "");
});

test("resolution is an append-only event; a plain comment keeps it resolved and a question reopens it", () => {
  let room = emptyRoom();
  room = post(room, "kip", { body: "Which cover?", threadId: "cover", kind: "question", to: ["kelly"], waitingOn: ["kelly"] }, "q");
  room = post(room, "kelly", { body: "Option A", threadId: "cover", kind: "decision", thread: { status: "resolved" } }, "d");
  const resolved = thread(room, "cover");
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.resolvedBy, "kelly");
  assert.equal(resolved.resolvedSeq, 2);
  assert.deepEqual(resolved.waitingOn, []);
  assert.equal(resolved.needsKelly, false);

  room = post(room, "kip", { body: "Thanks", threadId: "cover" }, "thanks");
  assert.equal(thread(room, "cover").status, "resolved", "a plain comment keeps it resolved");

  room = post(room, "kip", { body: "Also the back cover?", threadId: "cover", kind: "question", waitingOn: ["kelly"] }, "q2");
  const reopened = thread(room, "cover");
  assert.equal(reopened.status, "waiting");
  assert.equal(reopened.reopened, true);
  assert.equal(reopened.resolvedSeq, 0);
  assert.equal(reopened.needsKelly, true);

  room = post(room, "kelly", { body: "Same, option A", threadId: "cover", thread: { status: "resolved" } }, "d2");
  assert.equal(thread(room, "cover").status, "resolved");
  assert.equal(sanitizeRoom(room).messages[0].body, "Which cover?", "old events are untouched");
  assert.deepEqual(sanitizeRoom(room).messages[0].waitingOn, ["kelly"]);
});

test("explicit reopen and next owner events are honoured", () => {
  let room = emptyRoom();
  room = post(room, "codex", { body: "done", threadId: "tidy", thread: { status: "resolved" } }, "r");
  room = post(room, "codex", { body: "not done after all", threadId: "tidy", thread: { status: "reopened", nextOwner: "kip" } }, "ro");
  const state = thread(room, "tidy");
  assert.equal(state.status, "open");
  assert.equal(state.reopened, true);
  assert.equal(state.nextOwner, "kip");
});

test("receipts with needsKelly put the thread in Kelly's queue until she answers", () => {
  let room = emptyRoom();
  room = post(room, "codex", {
    body: "receipt",
    kind: "receipt",
    threadId: "lantern-demo",
    receipt: { project: "Lantern demo", did: "Rebuilt export", needsKelly: "Pick the cover", nextOwner: "kelly", health: "on-track" },
  }, "rc");
  const waiting = thread(room, "lantern-demo");
  assert.equal(waiting.needsKelly, true);
  assert.deepEqual(waiting.waitingOn, ["kelly"]);
  assert.equal(waiting.project, "Lantern demo");
  assert.equal(sanitizeRoom(room).messages[0].receipt.health, "on-track");

  room = post(room, "kelly", { body: "Cover A", threadId: "lantern-demo" }, "ans");
  assert.equal(thread(room, "lantern-demo").needsKelly, false);
  assert.equal(thread(room, "lantern-demo").status, "open");
});

test("inbox items carry a reason, actionable items come first, and resolved threads never appear", () => {
  let room = emptyRoom();
  room = post(room, "codex", { body: "Question for Claude", threadId: "wiki", kind: "question", to: ["claude-code"], waitingOn: ["claude-code"] }, "q");
  room = post(room, "vellum", { body: "FYI Claude", threadId: "fyi", to: ["claude-code"] }, "fyi");
  room = post(room, "claude-code", { body: "Starting", threadId: "general", to: ["all"] }, "mine");
  room = post(room, "kip", { body: "Replying to Claude", threadId: "general", replyTo: "message-mine" }, "reply");
  room = post(room, "kelly", { body: "Everyone: hello", threadId: "general", to: ["all"] }, "hello");
  room = post(room, "codex", {
    body: "Handing the deck to Claude",
    kind: "handoff",
    threadId: "deck",
    to: ["claude-code", "kelly"],
    note: { project: "Deck", summary: "Deck is ready for review", nextOwner: "claude-code", outputs: ["/tmp/deck.pdf"] },
  }, "handoff");
  room = post(room, "vellum", { body: "Resolved thing", threadId: "old", to: ["claude-code"], waitingOn: ["claude-code"] }, "old");
  room = post(room, "vellum", { body: "never mind", threadId: "old", thread: { status: "resolved" } }, "old-resolved");

  const inbox = deriveInbox(room, "claude-code");
  const reasons = inbox.map((item) => [item.threadId, item.reason, item.actionable, item.unread]);
  assert.deepEqual(reasons, [
    ["deck", "handed-to-you", true, true],
    ["wiki", "waiting-on-you", true, true],
    ["general", "reply-to-you", false, true],
    ["fyi", "addressed-to-you", false, true],
  ]);
  assert.equal(inbox[0].reasonLabel, "handed to you");
  assert.equal(inbox[1].threadTitle, "Wiki");

  const acknowledged = acknowledgeRoom(room, "claude-code", 8, { now: tick() }).room;
  const afterAck = deriveInbox(acknowledged, "claude-code");
  assert.deepEqual(afterAck.map((item) => item.reason), ["handed-to-you", "waiting-on-you"]);
  assert.equal(afterAck.every((item) => item.unread === false), true);

  const replied = post(acknowledged, "claude-code", { body: "Answer", threadId: "wiki", replyTo: "message-q" }, "ans");
  assert.deepEqual(deriveInbox(replied, "claude-code").map((item) => item.reason), ["handed-to-you"]);
});

test("a handoff requires a next owner and notes keep their structured fields", () => {
  assert.throws(
    () => appendMessage(emptyRoom(), { body: "handoff", kind: "handoff", note: { summary: "x" } }, "codex"),
    /needs a next owner/,
  );
  const result = appendMessage(emptyRoom(), {
    body: "Handing off",
    kind: "handoff",
    threadId: "deck",
    note: {
      project: "Deck",
      summary: "Ready for Kelly",
      outputs: ["/a", "/a", "/b"],
      why: "Friday build",
      action: "Review and pick",
      nextOwner: "kelly",
      next: "Ship",
      durablePath: "/Users/example/kip/memory/decisions.md",
      extra: "ignored",
    },
  }, "codex", { now: tick(), idFactory: () => "h" });
  assert.deepEqual(result.message.note, {
    project: "Deck",
    summary: "Ready for Kelly",
    outputs: ["/a", "/b"],
    why: "Friday build",
    action: "Review and pick",
    next: "Ship",
    durablePath: "/Users/example/kip/memory/decisions.md",
    nextOwner: "kelly",
  });
  assert.equal(thread(result.room, "deck").nextOwner, "kelly");
  assert.equal(thread(result.room, "deck").status, "open");
});

test("legacy stored messages render unchanged and malformed new fields degrade safely", () => {
  const room = sanitizeRoom({
    revision: 3,
    messages: [
      { seq: 1, id: "message-1", from: "codex", to: ["all"], body: "legacy", threadId: "general", kind: "status" },
      { seq: 2, id: "message-2", from: "kip", to: ["kelly"], body: "odd", thread: "not-an-object", note: ["not", "an", "object"], kind: "note" },
      { seq: 3, id: "message-3", from: "vellum", to: ["all"], body: "bad state", thread: { status: "DELETED", title: 42, nextOwner: "<script>" } },
      { seq: 4, id: "message-4", from: "kelly", to: ["all"], body: "receipt", kind: "receipt", receipt: { did: "x", health: "great", nextOwner: "nobody!" } },
    ],
  });
  assert.equal(room.messages.length, 4);
  assert.equal(room.messages[0].kind, "status");
  assert.equal("thread" in room.messages[0], false);
  assert.equal(room.messages[1].kind, "note");
  assert.equal(room.messages[1].note.summary, "odd", "a note without a payload falls back to its body");
  assert.equal("thread" in room.messages[1], false);
  assert.deepEqual(room.messages[2].thread, { title: "42" });
  assert.equal("health" in room.messages[3].receipt, false);
  assert.equal("nextOwner" in room.messages[3].receipt, false);
  const threads = deriveThreads(room, "kelly");
  assert.equal(threads.find((item) => item.id === "general").status, "open");
});

test("the full human-agent scenario works end to end with synthetic names", () => {
  let room = emptyRoom();

  // 1. Codex asks Claude a question in a named project thread and waits on Claude.
  room = post(room, "codex", {
    body: "Claude, which export format should the Lantern demo deck use?",
    kind: "question",
    threadId: "lantern-demo",
    to: ["claude-code"],
    waitingOn: ["claude-code"],
    thread: { title: "Lantern demo deck" },
  }, "q1");

  // 2. Claude's inbox shows the item, why it is there, and that it is unread.
  let inbox = deriveInbox(room, "claude-code");
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].reason, "waiting-on-you");
  assert.equal(inbox[0].unread, true);
  assert.equal(inbox[0].threadTitle, "Lantern demo deck");

  // 3. Claude acknowledges, replies in the same thread, and assigns the next step to Kip.
  room = acknowledgeRoom(room, "claude-code", 1, { now: tick() }).room;
  room = post(room, "claude-code", {
    body: "Use PDF. Kip, please run the export on the PC.",
    threadId: "lantern-demo",
    replyTo: "message-q1",
    to: ["codex", "kip"],
    waitingOn: ["kip"],
    thread: { nextOwner: "kip" },
  }, "a1");
  let state = thread(room, "lantern-demo");
  assert.equal(state.status, "waiting");
  assert.deepEqual(state.waitingOn, ["kip"]);
  assert.equal(state.nextOwner, "kip");
  assert.equal(deriveInbox(room, "claude-code").length, 0, "Claude's inbox is clear after answering");
  assert.equal(deriveInbox(room, "kip")[0].reason, "waiting-on-you");

  // 4. Claude leaves a structured handoff for Kip and Kelly.
  room = post(room, "claude-code", {
    body: "Handoff: Lantern export",
    kind: "handoff",
    threadId: "lantern-demo",
    to: ["kip", "kelly"],
    note: {
      project: "Lantern demo",
      summary: "Export pipeline is ready; run it on the PC and attach the PDF.",
      outputs: ["/Users/example/Projects/lantern-demo/output/"],
      why: "Friday build depends on it",
      action: "Run the export and post the PDF path",
      nextOwner: "kip",
      next: "Kelly picks the cover",
    },
  }, "h1");
  assert.equal(deriveInbox(room, "kip").some((item) => item.reason === "handed-to-you"), true);

  // 5. Claude posts a structured receipt that needs Kelly.
  room = post(room, "claude-code", {
    body: "Receipt",
    kind: "receipt",
    threadId: "lantern-demo",
    to: ["all"],
    waitingOn: ["kelly"],
    receipt: {
      project: "Lantern demo",
      did: "Chose the export format and handed the run to Kip",
      result: "PDF export is the standard",
      outputs: ["/Users/example/Projects/lantern-demo/DECISIONS.md"],
      needsKelly: "Confirm PDF is acceptable for the investor copy",
      nextOwner: "kelly",
      next: "Kip runs the export",
      health: "on-track",
    },
  }, "r1");

  // 6. Kelly's queue surfaces the exact item.
  const kellyView = roomView(room, "kelly");
  const needsKelly = kellyView.threads.filter((item) => item.needsKelly);
  assert.equal(needsKelly.length, 1);
  assert.equal(needsKelly[0].id, "lantern-demo");
  assert.equal(needsKelly[0].waitingSeq, 4);
  assert.equal(kellyView.inbox[0].reason, "waiting-on-you");
  assert.equal(kellyView.inbox[0].seq, 4);

  // 7. Kelly replies with a decision and resolves the thread.
  room = post(room, "kelly", {
    body: "PDF is fine. Resolved.",
    kind: "decision",
    threadId: "lantern-demo",
    replyTo: "message-r1",
    thread: { status: "resolved" },
  }, "k1");
  state = thread(room, "lantern-demo");
  assert.equal(state.status, "resolved");
  assert.equal(state.resolvedBy, "kelly");
  assert.equal(state.needsKelly, false);
  assert.deepEqual(state.waitingOn, []);

  // 8. Every agent can still inspect the full history; queues show only current state.
  for (const agent of ["codex", "claude-code", "kip", "vellum", "kelly"]) {
    const view = roomView(room, agent);
    assert.equal(view.messages.length, 5);
    assert.equal(view.messages[0].waitingOn[0], "claude-code", "old events keep their original waiting field");
    assert.equal(view.inbox.length, 0);
    assert.equal(view.threads.filter((item) => item.status !== "resolved").length, 0);
  }
});
