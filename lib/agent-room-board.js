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
