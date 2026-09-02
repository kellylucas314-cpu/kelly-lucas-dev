/**
 * Board and feed derivations for Agent Commons.
 *
 * Everything here is a pure read over the derived threads and the
 * append-only message list. Nothing in this file changes what gets stored:
 * an assignment IS a handoff message and a reaction IS a tiny reply
 * message, so every client (browser, CLI, Kip's PC) sees the same room.
 */

export const BOARD_SEATS = ["kelly", "codex", "claude-code", "kip", "vellum"];
export const UNASSIGNED_COLUMN = "up-for-grabs";
export const DONE_COLUMN = "wrapped-up";

/** Emoji a client may offer as one-tap reactions. A reaction is posted as a
 * normal reply whose whole body is one of these, so it stays readable in
 * every view and every CLI. */
export const REACTION_EMOJI = ["👍", "❤️", "🎉", "😂", "👀"];
const REACTION_SET = new Set(REACTION_EMOJI);

/** The seat a thread's card sits under: the thread's next owner first,
 * otherwise the first person it is waiting on, otherwise nobody. */
export function boardOwner(thread) {
  if (!thread || thread.status === "resolved") return "";
  return thread.nextOwner || thread.waitingOn?.[0] || "";
}

function cardScore(thread, viewer) {
  return (viewer && thread.waitingOn?.includes(viewer) ? 4 : 0)
    + (thread.unread ? 2 : 0)
    + (thread.status === "waiting" ? 1 : 0);
}

/**
 * Group derived threads into board columns: one per seat, one for open
 * threads nobody owns yet, and one for recently wrapped-up threads.
 */
export function deriveBoard(threads, { seats = BOARD_SEATS, viewer = "", doneLimit = 8 } = {}) {
  const bySeat = new Map(seats.map((seat) => [seat, []]));
  const unassigned = [];
  const resolved = [];
  for (const thread of threads || []) {
    if (thread.status === "resolved") {
      resolved.push(thread);
      continue;
    }
    const owner = boardOwner(thread);
    if (bySeat.has(owner)) bySeat.get(owner).push(thread);
    else unassigned.push(thread);
  }
  const sortCards = (list) => [...list].sort((left, right) => {
    const scores = cardScore(right, viewer) - cardScore(left, viewer);
    return scores !== 0 ? scores : right.lastSeq - left.lastSeq;
  });
  resolved.sort((left, right) => right.resolvedSeq - left.resolvedSeq);
  return {
    columns: seats.map((seat) => ({ id: seat, threads: sortCards(bySeat.get(seat)) })),
    unassigned: sortCards(unassigned),
    done: resolved.slice(0, doneLimit),
    doneTotal: resolved.length,
  };
}

/** True when a message is a one-emoji reply, meant to render as a reaction
 * chip on its parent instead of as a message of its own. */
export function isReactionMessage(message) {
  return Boolean(message
    && message.kind === "message"
    && message.replyTo
    && REACTION_SET.has(String(message.body || "").trim()));
}

/** Map of parent message id -> [{ emoji, from, seq }], oldest first. */
export function collectReactions(messages) {
  const byParent = new Map();
  for (const message of messages || []) {
    if (!isReactionMessage(message)) continue;
    const list = byParent.get(message.replyTo) || [];
    list.push({ emoji: String(message.body).trim(), from: message.from, seq: message.seq });
    byParent.set(message.replyTo, list);
  }
  return byParent;
}

/** Aggregate one parent's reactions into chips, in REACTION_EMOJI order:
 * [{ emoji, count, agents }]. Each agent counts once per emoji. */
export function reactionSummary(reactions) {
  const byEmoji = new Map();
  for (const reaction of reactions || []) {
    const entry = byEmoji.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, agents: [] };
    if (!entry.agents.includes(reaction.from)) {
      entry.agents.push(reaction.from);
      entry.count += 1;
    }
    byEmoji.set(reaction.emoji, entry);
  }
  return REACTION_EMOJI.filter((emoji) => byEmoji.has(emoji)).map((emoji) => byEmoji.get(emoji));
}

/** True when this viewer already left this emoji on this parent. */
export function hasReacted(reactions, viewer, emoji) {
  return (reactions || []).some((reaction) => reaction.from === viewer && reaction.emoji === emoji);
}

/* ---------- the scrum lanes: the same threads, four columns ---------- */

/**
 * Scrum lanes group every conversation by what happens next, not by seat:
 *
 *   Backlog           nobody's plate yet (or on hold)
 *   Doing             an agent owes the next move
 *   Waiting on Kelly  needs Kelly's answer, send, or OK; an agent wrapped it
 *                     and Kelly has not marked it done yet
 *   Done              Kelly marked it done
 *
 * Nothing new is stored. Only Kelly's own wrap-up counts as Done; an agent
 * wrapping a thread parks it in Waiting on Kelly as "ready for you" until
 * she closes it. Card details (next step, blocker, due date, a hold) are
 * read from the fields notes and receipts already carry, plus plain
 * "Due:", "Blocker:", "Paused:", "Parked:" and "Owner:" lines in any post,
 * so every client can set them today.
 */
export const SCRUM_LANES = [
  { id: "backlog", name: "Backlog", meaning: "Not started. Nobody's plate yet." },
  { id: "doing", name: "Doing", meaning: "An agent owes the next move." },
  { id: "waiting-on-kelly", name: "Waiting on Kelly", meaning: "Needs Kelly's answer, send, or OK." },
  { id: "done", name: "Done", meaning: "Kelly marked it done." },
];
export const SCRUM_LANE_IDS = SCRUM_LANES.map((lane) => lane.id);

/** Which lane a derived thread sits in. */
export function scrumLane(thread, { seats = BOARD_SEATS } = {}) {
  if (!thread) return "backlog";
  if (thread.status === "resolved") return thread.resolvedBy === "kelly" ? "done" : "waiting-on-kelly";
  if (thread.needsKelly || thread.nextOwner === "kelly" || (thread.waitingOn || []).includes("kelly")) return "waiting-on-kelly";
  const owner = boardOwner(thread);
  if (owner && owner !== "kelly" && seats.includes(owner)) return "doing";
  return "backlog";
}

const HINT_LINE = /^\s*(due|by|blocker|blockers|paused|parked|owner)\s*:\s*(.+?)\s*$/i;
const HINT_CLEAR = new Set(["none", "no", "cleared", "clear", "-", "nothing", "resumed", "unpaused"]);

function hintLines(message) {
  const sources = [
    message.body,
    message.note?.summary,
    message.note?.why,
    message.note?.action,
    message.note?.next,
    message.receipt?.next,
    message.receipt?.needsKelly,
  ];
  const lines = [];
  for (const source of sources) {
    if (!source) continue;
    for (const line of String(source).split(/\r?\n/)) {
      const match = HINT_LINE.exec(line);
      if (match) lines.push([match[1].toLowerCase(), match[2]]);
    }
  }
  return lines;
}

/**
 * Card details for one thread, read newest-wins from its messages (seq
 * order). Returns { next, blocker, due, dueAt, hold, owner }:
 *   next     the next step (note.action, note.next, receipt.next)
 *   blocker  receipt.blockers or a "Blocker:" line
 *   due      the due text as written; dueAt is its ISO form when parseable
 *   hold     { kind: "paused" | "parked", reason } from a "Paused:" or
 *            "Parked:" line; "Paused: no" or a fresh handoff clears it
 *   owner    an "Owner:" line naming who holds it outside the five seats
 */
export function cardHints(messages) {
  const hints = { next: "", blocker: "", due: "", dueAt: null, hold: null, owner: "" };
  for (const message of messages || []) {
    if (message.receipt?.blockers) hints.blocker = message.receipt.blockers;
    const next = message.note?.action || message.note?.next || message.receipt?.next || "";
    if (next) hints.next = next;
    if (message.kind === "handoff") hints.hold = null;
    for (const [key, rawValue] of hintLines(message)) {
      const value = rawValue.trim();
      const clears = HINT_CLEAR.has(value.toLowerCase());
      if (key === "due" || key === "by") {
        hints.due = clears ? "" : value;
        const parsed = Date.parse(value);
        hints.dueAt = !clears && Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
      } else if (key === "blocker" || key === "blockers") {
        hints.blocker = clears ? "" : value;
      } else if (key === "paused" || key === "parked") {
        hints.hold = clears ? null : { kind: key, reason: value };
      } else if (key === "owner") {
        hints.owner = clears ? "" : value;
      }
    }
  }
  return hints;
}

const CARD_KINDS = new Set(["note", "handoff", "receipt", "question", "decision"]);

/**
 * Not every conversation is a card. Chatter (the general thread, a bell, a
 * heads-up with no title) stays out of the lanes unless it carries work: a
 * note, handoff, receipt, question, or decision; a title someone gave it;
 * a wait on Kelly; or a wrap-up.
 */
export function isScrumCard(thread, messages) {
  if (!thread) return false;
  if (thread.status === "resolved" || thread.needsKelly || thread.nextOwner === "kelly") return true;
  if ((thread.kinds || []).some((kind) => CARD_KINDS.has(kind))) return true;
  return (messages || []).some((message) => message.thread?.title && message.kind !== "alert");
}

function laneScore(card, lane, viewer) {
  if (lane === "waiting-on-kelly") {
    return (viewer && card.waitingOn?.includes(viewer) ? 8 : 0)
      + (card.ready ? 4 : 0)
      + (card.overdue ? 2 : 0)
      + (card.unread ? 1 : 0);
  }
  if (lane === "doing") return (card.unread ? 2 : 0) + (card.overdue ? 1 : 0);
  if (lane === "backlog") return card.hold ? 0 : 2;
  return 0;
}

/**
 * Group derived threads into the four scrum lanes, each card carrying its
 * hints. `messages` is the whole room's message list (reactions ignored).
 */
export function deriveScrum(threads, messages, { viewer = "", seats = BOARD_SEATS, doneLimit = 12, now = Date.now() } = {}) {
  const byThread = new Map();
  for (const message of messages || []) {
    if (isReactionMessage(message)) continue;
    const list = byThread.get(message.threadId) || [];
    list.push(message);
    byThread.set(message.threadId, list);
  }
  const lanes = new Map(SCRUM_LANE_IDS.map((id) => [id, []]));
  let skipped = 0;
  for (const thread of threads || []) {
    if (!isScrumCard(thread, byThread.get(thread.id))) {
      skipped += 1;
      continue;
    }
    const lane = scrumLane(thread, { seats });
    const hints = cardHints(byThread.get(thread.id));
    const card = {
      ...thread,
      ...hints,
      lane,
      owner: boardOwner(thread),
      outsideOwner: hints.owner,
      ready: thread.status === "resolved" && thread.resolvedBy !== "kelly",
      overdue: Boolean(hints.dueAt) && lane !== "done" && Date.parse(hints.dueAt) < now,
    };
    lanes.get(lane).push(card);
  }
  const sortLane = (lane, list) => [...list].sort((left, right) => {
    if (lane === "done") return right.resolvedSeq - left.resolvedSeq;
    const scores = laneScore(right, lane, viewer) - laneScore(left, lane, viewer);
    if (scores !== 0) return scores;
    if (left.dueAt && right.dueAt && left.dueAt !== right.dueAt) return left.dueAt < right.dueAt ? -1 : 1;
    if (Boolean(left.dueAt) !== Boolean(right.dueAt)) return left.dueAt ? -1 : 1;
    return right.lastSeq - left.lastSeq;
  });
  const done = sortLane("done", lanes.get("done"));
  return {
    lanes: SCRUM_LANES.map((lane) => ({
      ...lane,
      threads: lane.id === "done" ? done.slice(0, doneLimit) : sortLane(lane.id, lanes.get(lane.id)),
    })),
    doneTotal: done.length,
    skipped,
  };
}

/** One line of counts for headers and the CLI: "3 backlog · 1 doing · 2 waiting on Kelly · 4 done". */
export function scrumSummary(scrum) {
  return scrum.lanes.map((lane) => {
    const count = lane.id === "done" ? scrum.doneTotal : lane.threads.length;
    return `${count} ${lane.name.toLowerCase()}`;
  }).join(" · ");
}
