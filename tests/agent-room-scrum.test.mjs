import assert from "node:assert/strict";
import test from "node:test";
import {
  SCRUM_LANE_IDS,
  cardHints,
  bodyWithoutPersona,
  deriveScrum,
  isScrumCard,
  personaOf,
  scrumLane,
  scrumSummary,
} from "../lib/agent-room-board.js";
import { appendMessage, deriveThreads, emptyRoom } from "../lib/agent-room-model.js";

function room(...posts) {
  let value = emptyRoom();
  let clock = Date.parse("2026-09-02T15:00:00.000Z");
  for (const [actor, input] of posts) {
    clock += 60_000;
    value = appendMessage(value, input, actor, { now: new Date(clock).toISOString(), idFactory: () => `t-${value.nextSeq}` }).room;
  }
  return value;
}

function laneOf(scrum, id) {
  return scrum.lanes.find((lane) => lane.threads.some((card) => card.id === id))?.id || "missing";
}

test("scrumLane sends threads to backlog, doing, waiting on Kelly, or done", () => {
  assert.equal(scrumLane({ status: "open", nextOwner: "", waitingOn: [], needsKelly: false }), "backlog");
  assert.equal(scrumLane({ status: "waiting", nextOwner: "codex", waitingOn: ["codex"], needsKelly: false }), "doing");
  assert.equal(scrumLane({ status: "waiting", nextOwner: "", waitingOn: ["kip"], needsKelly: false }), "doing");
  assert.equal(scrumLane({ status: "waiting", nextOwner: "", waitingOn: ["kelly"], needsKelly: true }), "waiting-on-kelly");
  assert.equal(scrumLane({ status: "open", nextOwner: "kelly", waitingOn: [], needsKelly: false }), "waiting-on-kelly");
  assert.equal(scrumLane({ status: "resolved", resolvedBy: "kelly", nextOwner: "", waitingOn: [] }), "done");
  assert.equal(scrumLane({ status: "resolved", resolvedBy: "codex", nextOwner: "", waitingOn: [] }), "waiting-on-kelly");
});

test("only Kelly's wrap-up counts as done; an agent's wrap-up waits for her", () => {
  const value = room(
    ["kelly", { body: "Codex, take the deck", to: ["codex"], kind: "question", threadId: "deck", waitingOn: ["codex"], thread: { title: "Deck" } }],
    ["codex", { body: "Wrapping up.", to: ["all"], kind: "status", threadId: "deck", thread: { status: "resolved" } }],
    ["kelly", { body: "Done, thank you.", to: ["all"], kind: "status", threadId: "fonts", thread: { title: "Fonts", status: "resolved" } }],
  );
  const scrum = deriveScrum(deriveThreads(value, "kelly"), value.messages, { viewer: "kelly" });
  assert.equal(laneOf(scrum, "deck"), "waiting-on-kelly");
  assert.equal(scrum.lanes[2].threads.find((card) => card.id === "deck").ready, true);
  assert.equal(laneOf(scrum, "fonts"), "done");
  assert.equal(scrum.doneTotal, 1);
  assert.deepEqual(scrum.lanes.map((lane) => lane.id), SCRUM_LANE_IDS);
});

test("cards read next step, blocker, due date, hold, and outside owner from existing fields and plain lines", () => {
  const value = room(
    ["vellum", { body: "Note: HelioFlux\nFoundersBoost research is done.\nDue: 2026-09-15\nBlocker: research only; no apply without Kelly", to: ["kelly"], kind: "note", threadId: "foundersboost", thread: { title: "FoundersBoost" }, note: { project: "HelioFlux", summary: "FoundersBoost research is done.", action: "Kelly says yes or no", nextOwner: "kelly" } }],
    ["vellum", { body: "Note: HelioFlux\nParked: Nardo on vacation Sep 1 to 19\nOwner: Glenn and Jim (outside the room)", to: ["all"], kind: "note", threadId: "nardo-counter", thread: { title: "Nardo counter" }, note: { project: "HelioFlux", summary: "Counter drafted.", next: "No send while Nardo travels" } }],
    ["kip", { body: "Project: Magpie\nDid: overnight run", to: ["all"], kind: "receipt", threadId: "magpie-run", waitingOn: ["kip"], receipt: { project: "Magpie", did: "overnight run", blockers: "router keeps dropping", next: "file the clips", nextOwner: "kip" } }],
  );
  const scrum = deriveScrum(deriveThreads(value, "kelly"), value.messages, { viewer: "kelly", now: Date.parse("2026-09-02T16:00:00.000Z") });
  const founders = scrum.lanes[2].threads.find((card) => card.id === "foundersboost");
  assert.equal(founders.next, "Kelly says yes or no");
  assert.equal(founders.blocker, "research only; no apply without Kelly");
  assert.equal(founders.due, "2026-09-15");
  assert.equal(founders.dueAt, "2026-09-15T00:00:00.000Z");
  assert.equal(founders.overdue, false);
  const nardo = scrum.lanes[0].threads.find((card) => card.id === "nardo-counter");
  assert.deepEqual(nardo.hold, { kind: "parked", reason: "Nardo on vacation Sep 1 to 19" });
  assert.equal(nardo.outsideOwner, "Glenn and Jim (outside the room)");
  assert.equal(nardo.next, "No send while Nardo travels");
  const magpie = scrum.lanes[1].threads.find((card) => card.id === "magpie-run");
  assert.equal(magpie.blocker, "router keeps dropping");
  assert.equal(magpie.next, "file the clips");
  assert.equal(magpie.owner, "kip");
});

test("a due date in the past marks the card overdue and sorts it first in Doing", () => {
  const value = room(
    ["kelly", { body: "Later one.\nDue: 2026-12-01", to: ["codex"], kind: "handoff", threadId: "later", thread: { title: "Later" }, note: { project: "HQ", summary: "Later one.", nextOwner: "codex" }, waitingOn: ["codex"] }],
    ["kelly", { body: "Urgent one.\nDue: 2026-08-01", to: ["codex"], kind: "handoff", threadId: "urgent", thread: { title: "Urgent" }, note: { project: "HQ", summary: "Urgent one.", nextOwner: "codex" }, waitingOn: ["codex"] }],
  );
  const scrum = deriveScrum(deriveThreads(value, "kelly"), value.messages, { viewer: "kelly", now: Date.parse("2026-09-02T16:00:00.000Z") });
  const doing = scrum.lanes[1].threads;
  assert.deepEqual(doing.map((card) => card.id), ["urgent", "later"]);
  assert.equal(doing[0].overdue, true);
  assert.equal(doing[1].overdue, false);
});

test("a hold clears with 'Paused: no' or a fresh handoff, and held cards sort after live backlog", () => {
  const value = room(
    ["vellum", { body: "Note: Personal\nPaused: until Kelly is done with Kip", to: ["all"], kind: "note", threadId: "tape", thread: { title: "Tape recap" }, note: { project: "Personal", summary: "Recap." } }],
    ["vellum", { body: "Fresh idea, nobody on it yet.", to: ["all"], kind: "note", threadId: "idea", thread: { title: "Idea" }, note: { project: "HQ", summary: "Fresh idea." } }],
    ["vellum", { body: "Note: HelioFlux\nPaused: until later", to: ["all"], kind: "note", threadId: "transcripts", thread: { title: "Transcripts" }, note: { project: "HelioFlux", summary: "Ingest." } }],
  );
  let scrum = deriveScrum(deriveThreads(value, "kelly"), value.messages, { viewer: "kelly" });
  assert.deepEqual(scrum.lanes[0].threads.map((card) => card.id), ["idea", "transcripts", "tape"]);
  assert.equal(scrum.lanes[0].threads[2].hold.kind, "paused");

  const resumed = room(
    ["vellum", { body: "Note: Personal\nPaused: until Kelly is done with Kip", to: ["all"], kind: "note", threadId: "tape", thread: { title: "Tape recap" }, note: { project: "Personal", summary: "Recap." } }],
    ["kelly", { body: "Paused: no", to: ["all"], kind: "message", threadId: "tape" }],
    ["vellum", { body: "Note: HelioFlux\nPaused: until later", to: ["all"], kind: "note", threadId: "transcripts", thread: { title: "Transcripts" }, note: { project: "HelioFlux", summary: "Ingest." } }],
    ["kelly", { body: "Over to you.", to: ["kip"], kind: "handoff", threadId: "transcripts", note: { project: "HelioFlux", summary: "Over to you.", nextOwner: "kip" }, waitingOn: ["kip"] }],
  );
  scrum = deriveScrum(deriveThreads(resumed, "kelly"), resumed.messages, { viewer: "kelly" });
  assert.equal(scrum.lanes[0].threads.find((card) => card.id === "tape").hold, null);
  assert.equal(laneOf(scrum, "transcripts"), "doing");
  assert.equal(scrum.lanes[1].threads[0].hold, null);
});

test("waiting on Kelly puts what waits on the viewer first, then ready-for-you, then the nearest due", () => {
  const value = room(
    ["codex", { body: "Wrapping.", to: ["all"], kind: "status", threadId: "ready", thread: { title: "Ready", status: "resolved" } }],
    ["vellum", { body: "Note\nDue: 2026-10-06", to: ["kelly"], kind: "note", threadId: "later-due", thread: { title: "Later due" }, note: { project: "HelioFlux", summary: "Later.", nextOwner: "kelly" } }],
    ["vellum", { body: "Note\nDue: 2026-09-09", to: ["kelly"], kind: "note", threadId: "soon-due", thread: { title: "Soon due" }, note: { project: "Personal", summary: "Soon.", nextOwner: "kelly" } }],
    ["kip", { body: "Kelly, yes or no?", to: ["kelly"], kind: "question", threadId: "asked", thread: { title: "Asked" }, waitingOn: ["kelly"] }],
  );
  const scrum = deriveScrum(deriveThreads(value, "kelly"), value.messages, { viewer: "kelly", now: Date.parse("2026-09-02T16:00:00.000Z") });
  assert.deepEqual(scrum.lanes[2].threads.map((card) => card.id), ["asked", "ready", "soon-due", "later-due"]);
});

test("deriveScrum caps the done lane, reports the true total, and summarises counts", () => {
  const threads = Array.from({ length: 15 }, (_, index) => ({ id: `done-${index}`, status: "resolved", resolvedBy: "kelly", resolvedSeq: index, waitingOn: [], nextOwner: "", lastSeq: index, unread: 0 }));
  threads.push({ id: "open-1", status: "open", kinds: ["note"], waitingOn: [], nextOwner: "", lastSeq: 99, unread: 0 });
  const scrum = deriveScrum(threads, [], { doneLimit: 5 });
  assert.equal(scrum.lanes[3].threads.length, 5);
  assert.equal(scrum.lanes[3].threads[0].id, "done-14");
  assert.equal(scrum.doneTotal, 15);
  assert.equal(scrumSummary(scrum), "1 backlog · 0 doing · 0 waiting on kelly · 15 done");
});

test("chatter and bells stay off the lanes; work, titles, waits on Kelly, and wrap-ups are cards", () => {
  const value = room(
    ["codex", { body: "Morning all.", to: ["all"], kind: "status", threadId: "general" }],
    ["kelly", { body: "Bell's ringing!", to: ["all"], kind: "alert", threadId: "wake-up-bell", thread: { title: "Wake-up bell" }, waitingOn: ["codex", "kip"] }],
    ["kelly", { body: "Kip, take the deck", to: ["kip"], kind: "message", threadId: "deck", thread: { title: "Deck" }, waitingOn: ["kip"] }],
    ["kip", { body: "Heads up, gateway paused.", to: ["kelly"], kind: "alert", threadId: "gateway", waitingOn: ["kelly"] }],
    ["vellum", { body: "Idea for later.", to: ["all"], kind: "note", threadId: "idea", note: { project: "HQ", summary: "Idea for later." } }],
  );
  const scrum = deriveScrum(deriveThreads(value, "kelly"), value.messages, { viewer: "kelly" });
  const ids = scrum.lanes.flatMap((lane) => lane.threads.map((card) => card.id));
  assert.deepEqual(ids.sort(), ["deck", "gateway", "idea"]);
  assert.equal(scrum.skipped, 2);
  assert.equal(isScrumCard({ status: "open", kinds: ["message"], needsKelly: false, nextOwner: "" }, [{ kind: "message" }]), false);
});

test("a persona signs a post through a seat and the desk can show it without the signature line", () => {
  assert.equal(personaOf({ body: "As: Lumen\nResearch is done; your call." }), "Lumen");
  assert.equal(personaOf({ body: "Handoff: HelioFlux\nSigned: Elli Bot\nForm ready." }), "Elli Bot");
  assert.equal(personaOf({ body: "No signature here.\nAs: too late\n\n\nAs: five lines down" }), "too late");
  assert.equal(personaOf({ body: "plain" }), "");
  assert.equal(bodyWithoutPersona("As: Lumen\nResearch is done."), "Research is done.");
  assert.equal(bodyWithoutPersona("plain\nlines"), "plain\nlines");
  const value = room(
    ["vellum", { body: "As: Lumen\nResearch is done; your call.", to: ["kelly"], kind: "question", threadId: "founders", thread: { title: "Founders" }, waitingOn: ["kelly"] }],
  );
  const scrum = deriveScrum(deriveThreads(value, "kelly"), value.messages, { viewer: "kelly" });
  assert.equal(scrum.lanes[2].threads[0].persona, "Lumen");
});

test("cardHints never throws on legacy messages without notes or receipts", () => {
  assert.deepEqual(cardHints([{ body: "hello", kind: "message" }, { body: "", kind: "status" }]), { next: "", blocker: "", due: "", dueAt: null, hold: null, owner: "" });
  assert.deepEqual(cardHints(undefined).hold, null);
});
