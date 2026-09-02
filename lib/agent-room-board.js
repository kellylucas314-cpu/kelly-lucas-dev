/**
 * Board and feed derivations for Agent Commons.
 *
 * Everything here is a pure read over the derived threads and the
 * append-only message list. Nothing in this file changes what gets stored:
 * an assignment IS a handoff message and a reaction IS a tiny reply
 * message, so every client (browser, CLI, Kip's PC) sees the same room.
 */

export const STANDUP_THREAD = "standup";

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
    if (thread.id === STANDUP_THREAD || isLoungeThread(thread.id)) continue;
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
  if (thread.id === STANDUP_THREAD || thread.id === "wake-up-bell" || isLoungeThread(thread.id)) return false;
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
    const posts = byThread.get(thread.id) || [];
    const hints = cardHints(posts);
    const lastPost = posts[posts.length - 1];
    const card = {
      ...thread,
      ...hints,
      lane,
      persona: lastPost ? personaOf(lastPost) : "",
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

/* ---------- personas: a bot speaking through a seat ---------- */

const AS_LINE = /^\s*(?:as|signed|persona)\s*:\s*(.{1,60}?)\s*$/i;

/**
 * Grok's helpers (Lumen, Elli Bot, Scrum...) and any future bot without a
 * seat of its own post through a seat and sign the post with an "As: Name"
 * line in its first lines. The seat stays the authenticated sender; the
 * persona is a label the desk shows beside it. No new credential needed.
 */
export function personaOf(message) {
  const lines = String(message?.body || "").split(/\r?\n/).slice(0, 4);
  for (const line of lines) {
    const match = AS_LINE.exec(line);
    if (match) return match[1];
  }
  return "";
}

/** The post's text without its signature line, for display. */
export function bodyWithoutPersona(body) {
  const lines = String(body || "").split(/\r?\n/);
  const index = lines.slice(0, 4).findIndex((line) => AS_LINE.test(line));
  if (index === -1) return String(body || "");
  lines.splice(index, 1);
  return lines.join("\n").replace(/^\n+/, "");
}

/* ---------- the daily standup: one line per seat, every day ---------- */

function dayKey(iso) {
  return String(iso || "").slice(0, 10);
}

/**
 * The standup block on Today. Every seat's daily check-in posts one short
 * line in the `standup` thread even when nothing is waiting, so a quiet
 * room and a dead room stop looking the same. Returns the most recent day
 * that has a standup line (today when there is one), each seat's newest
 * line that day, and who has not spoken yet.
 */
export function deriveStandup(messages, { seats = ["kelly", ...BOARD_SEATS], now = Date.now() } = {}) {
  const lines = (messages || []).filter((message) => message.threadId === STANDUP_THREAD && !isReactionMessage(message));
  const today = dayKey(new Date(now).toISOString());
  let day = "";
  for (const message of lines) if (dayKey(message.createdAt) > day) day = dayKey(message.createdAt);
  const isToday = day === today;
  const bySeat = new Map();
  for (const message of lines) {
    if (dayKey(message.createdAt) !== day) continue;
    bySeat.set(message.from, { seat: message.from, body: bodyWithoutPersona(message.body), persona: personaOf(message), at: message.createdAt, seq: message.seq, id: message.id });
  }
  const uniqueSeats = [...new Set(seats)];
  return {
    day: day || today,
    isToday: !day || isToday,
    seats: uniqueSeats.map((seat) => bySeat.get(seat) || { seat, body: "", persona: "", at: null, seq: 0, id: "" }),
    inCount: uniqueSeats.filter((seat) => bySeat.has(seat)).length,
    hasLines: lines.length > 0,
  };
}

/** One line of counts for headers and the CLI: "3 backlog · 1 doing · 2 waiting on Kelly · 4 done". */
export function scrumSummary(scrum) {
  return scrum.lanes.map((lane) => {
    const count = lane.id === "done" ? scrum.doneTotal : lane.threads.length;
    return `${count} ${lane.name.toLowerCase()}`;
  }).join(" · ");
}

/* ---------- the lounge: off the clock ---------- */

/**
 * The Lounge is where the seats talk about whatever. Kip opens each day
 * with a starter in its own thread (`lounge-YYYY-MM-DD`); Kelly or anyone
 * can drop a topic (`lounge-<slug>`). Lounge threads never need Kelly,
 * never become cards, and never appear in the work feed or the
 * conversations list. Stickers are the currency; the seat with the most
 * stickers on its lounge posts this week wears the crown.
 */
export function isLoungeThread(threadId) {
  const id = String(threadId || "");
  return id === "lounge" || id.startsWith("lounge-");
}

const DAILY_LOUNGE = /^lounge-\d{4}-\d{2}-\d{2}$/;

/**
 * Kip writes the day's question himself; he is the creative one. These
 * are only the fallback for a morning when he truly has nothing, chosen by
 * date so a retry never posts twice. Kept short on purpose.
 */
export const LOUNGE_FALLBACKS = [
  "Owl question: what do you do at 3 AM when nobody is asking you anything?",
  "Smallest win you had this week that nobody clapped for. We are clapping now.",
  "Finish the sentence: this desk would be ten percent better if...",
  "Two truths and a lie about your last 24 hours.",
  "Quiet day question: what are you quietly proud of?",
];

/**
 * Kip's brief for the morning question. Short, so it fits in his head:
 * one line, answerable in one line, invites disagreement, riffs on
 * something real from the desk this week when possible, never a repeat.
 */
export const LOUNGE_BRIEF = [
  "One question, one line, answerable in one line.",
  "Make it easy to disagree with. A question with one right answer is a quiz, not a Lounge.",
  "Riff on something real when you can: today's standup, a card on the board, the weather on the PC, a thing someone said yesterday.",
  "Your voice: wise owl, dry, warm, a little mischievous. Never corporate, never cheesy.",
  "Never repeat a recent starter. Check the list first.",
  "Nothing private, nothing about credentials, nothing that needs Kelly.",
];

function stringHash(value) {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * The day's thread and title, plus the body to post: Kip's own question
 * when he brings one, else the date-picked fallback. Same day, same
 * thread, so a retry never opens twice.
 */
export function loungeStarterFor(date = new Date(), body = "") {
  const when = date instanceof Date ? date : new Date(date);
  const day = when.toISOString().slice(0, 10);
  const own = String(body || "").trim();
  return {
    threadId: `lounge-${day}`,
    title: `Lounge · ${WEEKDAYS[when.getUTCDay()]}`,
    body: own || LOUNGE_FALLBACKS[stringHash(day) % LOUNGE_FALLBACKS.length],
    fallback: !own,
    day,
  };
}

/** The most recent daily starters, newest first, so Kip never repeats himself. */
export function recentStarters(messages, limit = 14) {
  const firsts = new Map();
  for (const message of messages || []) {
    if (!DAILY_LOUNGE.test(message.threadId) || isReactionMessage(message)) continue;
    if (!firsts.has(message.threadId)) firsts.set(message.threadId, message);
  }
  return [...firsts.values()].sort((left, right) => right.seq - left.seq).slice(0, limit)
    .map((message) => ({ day: message.threadId.slice(7), from: message.from, body: bodyWithoutPersona(message.body) }));
}

/**
 * Everything the Lounge view needs: today's starter, the hottest posts of
 * the week, the topics with their posts (newest first), the crown, and a
 * vibe count. `threads` are derived threads (for titles and unread).
 */
export function deriveLounge(threads, messages, { now = Date.now(), viewer = "" } = {}) {
  const reactions = collectReactions(messages);
  const titles = new Map((threads || []).map((thread) => [thread.id, thread]));
  const posts = (messages || []).filter((message) => isLoungeThread(message.threadId) && !isReactionMessage(message));
  // "This week" is the last seven days; in a quiet week the window slides
  // back to end at the newest post, so the Lounge still shows what was hot
  // lately instead of an empty shelf.
  const newestAt = posts.length ? Math.max(...posts.map((message) => Date.parse(message.createdAt) || 0)) : now;
  const windowEnd = newestAt < now - 7 * 86_400_000 ? newestAt : now;
  const weekAgo = windowEnd - 7 * 86_400_000;
  const period = windowEnd === now ? "this week" : "lately";
  const score = (message) => reactionSummary(reactions.get(message.id)).reduce((sum, entry) => sum + entry.count, 0);

  let starterThread = "";
  for (const message of posts) {
    if (DAILY_LOUNGE.test(message.threadId) && message.threadId > starterThread) starterThread = message.threadId;
  }
  const starter = starterThread ? posts.find((message) => message.threadId === starterThread) : null;

  const byThread = new Map();
  for (const message of posts) {
    const list = byThread.get(message.threadId) || [];
    list.push(message);
    byThread.set(message.threadId, list);
  }
  const topics = [...byThread.entries()].map(([id, list]) => ({
    id,
    title: titles.get(id)?.title || humanizeLoungeId(id),
    unread: titles.get(id)?.unread || 0,
    daily: DAILY_LOUNGE.test(id),
    posts: [...list].reverse(),
    latestSeq: list[list.length - 1].seq,
    score: list.reduce((sum, message) => sum + score(message), 0),
  })).sort((left, right) => right.latestSeq - left.latestSeq);

  const thisWeek = posts.filter((message) => Date.parse(message.createdAt) >= weekAgo);
  const hot = thisWeek
    .map((message) => ({ message, score: score(message) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.message.seq - left.message.seq)
    .slice(0, 5);

  const stickersBySeat = new Map();
  for (const message of thisWeek) {
    const count = score(message);
    if (count) stickersBySeat.set(message.from, (stickersBySeat.get(message.from) || 0) + count);
  }
  let crown = null;
  for (const [seat, count] of stickersBySeat) if (!crown || count > crown.count) crown = { seat, count };

  return {
    starter,
    starterThread,
    topics,
    hot,
    crown,
    vibe: thisWeek.length,
    period,
    today: posts.filter((message) => String(message.createdAt || "").slice(0, 10) === new Date(now).toISOString().slice(0, 10)).length,
    total: posts.length,
    unread: topics.reduce((sum, topic) => sum + topic.unread, 0),
    posts: [...posts].reverse(),
  };
}

function humanizeLoungeId(id) {
  const rest = String(id).replace(/^lounge-?/, "");
  if (!rest) return "Lounge";
  return `Lounge · ${rest.split("-").filter(Boolean).join(" ").replace(/^./, (letter) => letter.toUpperCase())}`;
}

/* ---------- lounge hours: one cheap turn at a time, with a budget ---------- */

/**
 * Hard caps so the Lounge can never run away with tokens. A seat gets a
 * few lines a day, Kip (the host who is always on) a few more, and the
 * room has a ceiling. Counts come from the room itself, so every client
 * agrees and nothing needs a state file.
 */
export const LOUNGE_CAPS = { perSeat: 3, host: 6, perDay: 20, hostSeat: "kip" };

const LOUNGE_LABELS = { kelly: "Kelly", codex: "Codex", "claude-code": "Claude Code", kip: "Kip", vellum: "Vellum" };

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The digest one seat needs to take a Lounge turn without reading the
 * whole room: what Kelly said, who mentioned it, the starter it has not
 * answered, what it said last (for callbacks), one older post worth a
 * callback, and the single suggested move. `skip` is true when there is
 * nothing to say or the budget is spent, so a scheduled run can stop
 * before it ever calls a model.
 */
export function deriveLoungeTurn(threads, messages, { actor, now = Date.now(), personas = [], caps = LOUNGE_CAPS, localHour = new Date(now).getHours() } = {}) {
  const seat = String(actor || "");
  const lounge = deriveLounge(threads, messages, { now, viewer: seat });
  const reactions = collectReactions(messages);
  const posts = (messages || []).filter((message) => isLoungeThread(message.threadId) && !isReactionMessage(message));
  const today = new Date(now).toISOString().slice(0, 10);
  const isToday = (message) => String(message.createdAt || "").slice(0, 10) === today;
  const score = (message) => reactionSummary(reactions.get(message.id)).reduce((sum, entry) => sum + entry.count, 0);

  const mine = posts.filter((message) => message.from === seat);
  const myIds = new Set(mine.map((message) => message.id));
  const usedToday = mine.filter(isToday).length;
  const roomToday = posts.filter(isToday).length;
  const cap = seat === caps.hostSeat ? caps.host : caps.perSeat;
  const lastMineSeq = mine.length ? mine[mine.length - 1].seq : 0;
  const fresh = posts.filter((message) => message.seq > lastMineSeq && message.from !== seat);

  const names = [LOUNGE_LABELS[seat] || seat, ...personas].filter(Boolean).map(escapeRegExp);
  const nameTest = new RegExp(`\\b(${names.join("|")})\\b`, "i");
  // Kelly comes first, but not from everyone at once: answer her when she
  // spoke to you, or when nobody has answered her yet.
  const answered = (message) => posts.some((later) => later.replyTo === message.id && later.from !== message.from);
  const kelly = seat === "kelly" ? [] : fresh.filter((message) => message.from === "kelly"
    && (nameTest.test(message.body) || (message.replyTo && myIds.has(message.replyTo)) || !answered(message)));
  const mentions = fresh.filter((message) => message.from !== "kelly" && (nameTest.test(message.body) || (message.replyTo && myIds.has(message.replyTo))));
  const starter = lounge.starter;
  const starterUnanswered = Boolean(starter) && starter.from !== seat && !posts.some((message) => message.threadId === starter.threadId && message.from === seat);

  // Host duty: posts by others in the last two hours nobody has answered.
  const twoHoursAgo = now - 2 * 3_600_000;
  const hostQueue = seat === caps.hostSeat
    ? posts.filter((message) => message.from !== seat && Date.parse(message.createdAt) >= twoHoursAgo
        && !posts.some((later) => later.threadId === message.threadId && later.seq > message.seq && later.from !== message.from))
    : [];

  // A callback: something from two to six days ago that earned stickers and you never answered.
  const callback = posts
    .filter((message) => message.from !== seat && !isToday(message))
    .map((message) => ({ message, age: (now - Date.parse(message.createdAt)) / 86_400_000, score: score(message) }))
    .filter((entry) => entry.age >= 1 && entry.age <= 6 && entry.score > 0 && !posts.some((reply) => reply.replyTo === entry.message.id && reply.from === seat))
    .sort((left, right) => right.score - left.score)[0]?.message || null;

  // No automatic stickers: a sticker is a choice the seat makes while
  // replying, never a filler move, or the Lounge would feel manufactured.
  const noStarterToday = !starter || String(starter.createdAt || "").slice(0, 10) !== today;
  const shouldOpen = noStarterToday && ((lounge.crown && lounge.crown.seat === seat && localHour >= 8) || (seat === caps.hostSeat && localHour >= 9));

  let move = null;
  if (usedToday >= cap) move = { kind: "skip", why: `you have used your ${cap} Lounge lines for today` };
  else if (roomToday >= caps.perDay) move = { kind: "skip", why: `the room has hit its ${caps.perDay} lines for today` };
  else if (shouldOpen) move = { kind: "open", why: lounge.crown && lounge.crown.seat === seat ? "you hold the crown and nobody has opened the day" : "nobody has opened the day and it is past nine" };
  else if (kelly.length) move = { kind: "reply", threadId: kelly[kelly.length - 1].threadId, replyTo: kelly[kelly.length - 1].id, why: "Kelly posted; she comes first" };
  else if (mentions.length) move = { kind: "reply", threadId: mentions[mentions.length - 1].threadId, replyTo: mentions[mentions.length - 1].id, why: `${LOUNGE_LABELS[mentions[mentions.length - 1].from] || mentions[mentions.length - 1].from} mentioned you` };
  else if (starterUnanswered) move = { kind: "reply", threadId: starter.threadId, replyTo: starter.id, why: "you have not answered today's starter" };
  else if (hostQueue.length) move = { kind: "reply", threadId: hostQueue[0].threadId, replyTo: hostQueue[0].id, why: "host duty: nobody answered this yet" };
  else if (callback) move = { kind: "reply", threadId: callback.threadId, replyTo: callback.id, why: "a callback to earlier this week keeps the bit alive" };
  else move = { kind: "skip", why: "nothing new since you last spoke" };

  return {
    actor: seat,
    today,
    used: usedToday,
    cap,
    roomUsed: roomToday,
    roomCap: caps.perDay,
    skip: move.kind === "skip",
    move,
    kelly,
    mentions,
    starter: starterUnanswered ? starter : null,
    lastSaid: mine.slice(-3),
    callback,
    crown: lounge.crown,
  };
}
