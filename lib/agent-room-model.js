import { randomUUID } from "node:crypto";

export const AGENT_ROOM_SCHEMA_VERSION = 2;
export const MAX_ROOM_MESSAGES = 5000;

export const MESSAGE_KINDS = [
  "message",
  "question",
  "status",
  "decision",
  "alert",
  "receipt",
  "note",
  "handoff",
];
export const THREAD_STATUSES = ["open", "waiting", "resolved", "reopened"];
export const RECEIPT_HEALTH = ["on-track", "at-risk", "off-track"];
export const INBOX_REASONS = {
  "waiting-on-you": "waiting on you",
  "handed-to-you": "handed to you",
  "reply-to-you": "reply to you",
  "addressed-to-you": "sent to you",
};

const KINDS = new Set(MESSAGE_KINDS);
const STATUSES = new Set(THREAD_STATUSES);
const HEALTH = new Set(RECEIPT_HEALTH);
const SLUG = /^[a-z][a-z0-9_-]{1,47}$/;

function cleanString(value, maxLength) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

export function normalizeAgent(value, { allowAll = false } = {}) {
  const agent = cleanString(value, 48).toLowerCase();
  if (allowAll && agent === "all") return agent;
  return SLUG.test(agent) ? agent : "";
}

function cleanSlug(value, fallback, maxLength = 80) {
  const candidate = cleanString(value, maxLength).toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{1,79}$/.test(candidate) ? candidate : fallback;
}

export function slugify(value, fallback = "general") {
  const slug = cleanString(value, 160)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return /^[a-z0-9][a-z0-9_-]{1,79}$/.test(slug) ? slug : fallback;
}

export function humanizeSlug(slug) {
  const words = String(slug || "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => (word.length <= 3 && !/^[a-z]+$/.test(word) ? word.toUpperCase() : word));
  if (!words.length) return "General";
  return words.join(" ").replace(/^./, (letter) => letter.toUpperCase());
}

function cleanIsoDate(value, fallback = null) {
  const candidate = cleanString(value, 40);
  return candidate && Number.isFinite(Date.parse(candidate)) ? candidate : fallback;
}

function cleanStringList(value, { maxItems = 12, maxLength = 500 } = {}) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values
    .map((item) => cleanString(item, maxLength))
    .filter(Boolean))]
    .slice(0, maxItems);
}

function asObject(value) {
  return value && !Array.isArray(value) && typeof value === "object" ? value : {};
}

function sanitizeReceipt(value, fallbackDid = "") {
  const source = asObject(value);
  const did = cleanString(source.did || fallbackDid, 1200);
  if (!did) return null;
  const receipt = {
    project: cleanString(source.project, 160) || "General",
    did,
    result: cleanString(source.result, 1600),
    outputs: cleanStringList(source.outputs, { maxItems: 12, maxLength: 500 }),
    needsKelly: cleanString(source.needsKelly, 1000),
    next: cleanString(source.next, 1000),
  };
  const blockers = cleanString(source.blockers, 1000);
  const nextOwner = normalizeAgent(source.nextOwner);
  const health = cleanString(source.health, 20).toLowerCase();
  if (blockers) receipt.blockers = blockers;
  if (nextOwner) receipt.nextOwner = nextOwner;
  if (HEALTH.has(health)) receipt.health = health;
  return receipt;
}

function sanitizeNote(value, fallbackSummary = "") {
  const source = asObject(value);
  const summary = cleanString(source.summary || fallbackSummary, 1600);
  if (!summary) return null;
  const note = {
    project: cleanString(source.project, 160) || "General",
    summary,
    outputs: cleanStringList(source.outputs, { maxItems: 12, maxLength: 500 }),
    why: cleanString(source.why, 1000),
    action: cleanString(source.action, 1000),
    next: cleanString(source.next, 1000),
    durablePath: cleanString(source.durablePath, 500),
  };
  const nextOwner = normalizeAgent(source.nextOwner);
  if (nextOwner) note.nextOwner = nextOwner;
  return note;
}

function sanitizeThreadMeta(value) {
  const source = asObject(value);
  const meta = {};
  const title = cleanString(source.title, 120);
  const status = cleanString(source.status, 20).toLowerCase();
  const nextOwner = normalizeAgent(source.nextOwner);
  if (title) meta.title = title;
  if (STATUSES.has(status)) meta.status = status;
  if (nextOwner) meta.nextOwner = nextOwner;
  return Object.keys(meta).length ? meta : null;
}

function normalizeRecipients(value) {
  const values = Array.isArray(value) ? value : [value];
  const recipients = [...new Set(values
    .map((item) => normalizeAgent(item, { allowAll: true }))
    .filter(Boolean))];
  return recipients.length ? recipients.slice(0, 12) : ["all"];
}

function normalizeWaiting(value) {
  return normalizeRecipients(value || []).filter((agent) => agent !== "all");
}

function emptyCursors() {
  return {};
}

export function emptyRoom() {
  return {
    schemaVersion: AGENT_ROOM_SCHEMA_VERSION,
    revision: 0,
    nextSeq: 1,
    updatedAt: null,
    messages: [],
    cursors: emptyCursors(),
  };
}

function structuredFields(kind, value, body) {
  const fields = {};
  if (kind === "receipt") {
    const receipt = sanitizeReceipt(value?.receipt, body);
    if (receipt) fields.receipt = receipt;
  }
  if (kind === "note" || kind === "handoff") {
    const note = sanitizeNote(value?.note, body);
    if (note) fields.note = note;
  }
  const thread = sanitizeThreadMeta(value?.thread);
  if (thread) fields.thread = thread;
  return fields;
}

function sanitizeMessage(value) {
  const from = normalizeAgent(value?.from);
  const body = cleanString(value?.body, 8000);
  const seq = Number.parseInt(String(value?.seq ?? ""), 10);
  if (!from || !body || !Number.isSafeInteger(seq) || seq < 1) return null;

  const id = cleanSlug(value?.id, `message-${seq}`);
  const kind = KINDS.has(value?.kind) ? value.kind : "message";
  return {
    id,
    seq,
    from,
    to: normalizeRecipients(value?.to),
    waitingOn: normalizeWaiting(value?.waitingOn),
    threadId: cleanSlug(value?.threadId, "general"),
    replyTo: cleanSlug(value?.replyTo, "", 80),
    kind,
    body,
    clientId: cleanSlug(value?.clientId, "", 120),
    createdAt: cleanIsoDate(value?.createdAt, new Date(0).toISOString()),
    ...structuredFields(kind, value, body),
  };
}

function sanitizeCursors(value, maxSeq) {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  const result = {};
  for (const [rawAgent, rawCursor] of Object.entries(value)) {
    const agent = normalizeAgent(rawAgent);
    if (!agent) continue;
    const source = rawCursor && typeof rawCursor === "object"
      ? rawCursor
      : { seq: rawCursor };
    const seq = Number.parseInt(String(source.seq ?? "0"), 10);
    result[agent] = {
      seq: Number.isSafeInteger(seq) ? Math.max(0, Math.min(seq, maxSeq)) : 0,
      at: cleanIsoDate(source.at),
    };
  }
  return result;
}

export function sanitizeRoom(value) {
  const source = value && typeof value === "object" ? value : {};
  const bySeq = new Map();
  for (const raw of Array.isArray(source.messages) ? source.messages : []) {
    const message = sanitizeMessage(raw);
    if (message && !bySeq.has(message.seq)) bySeq.set(message.seq, message);
  }
  const messages = [...bySeq.values()].sort((left, right) => left.seq - right.seq);
  const highestSeq = messages.at(-1)?.seq || 0;
  const requestedNext = Number.parseInt(String(source.nextSeq ?? ""), 10);

  return {
    schemaVersion: AGENT_ROOM_SCHEMA_VERSION,
    revision: Number.isSafeInteger(source.revision) && source.revision >= 0
      ? source.revision
      : 0,
    nextSeq: Number.isSafeInteger(requestedNext) && requestedNext > highestSeq
      ? requestedNext
      : highestSeq + 1,
    updatedAt: cleanIsoDate(source.updatedAt),
    messages,
    cursors: sanitizeCursors(source.cursors, highestSeq),
  };
}

function invalid(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

export function appendMessage(roomValue, input, actorValue, options = {}) {
  const room = sanitizeRoom(roomValue);
  const actor = normalizeAgent(actorValue);
  if (!actor) throw Object.assign(new Error("A valid agent identity is required"), { statusCode: 401 });

  const body = cleanString(input?.body, 8000);
  if (!body) throw invalid("Message body is required");
  if (room.messages.length >= MAX_ROOM_MESSAGES) {
    throw Object.assign(new Error("The room must be archived before more messages can be added"), { statusCode: 409 });
  }

  const clientId = cleanSlug(input?.clientId, "", 120);
  if (clientId) {
    const existing = room.messages.find((message) => (
      message.from === actor && message.clientId === clientId
    ));
    if (existing) return { room, message: existing, changed: false };
  }

  const kind = KINDS.has(input?.kind) ? input.kind : "message";
  const fields = structuredFields(kind, input, body);
  if (kind === "handoff" && !fields.note?.nextOwner && !normalizeWaiting(input?.waitingOn).length) {
    throw invalid("A handoff needs a next owner (note.nextOwner or waitingOn)");
  }
  if (input?.replyTo && !cleanSlug(input.replyTo, "", 80)) {
    throw invalid("replyTo must be a message id");
  }

  const now = options.now || new Date().toISOString();
  const idFactory = options.idFactory || (() => randomUUID());
  const message = {
    id: cleanSlug(`message-${idFactory()}`, `message-${room.nextSeq}`),
    seq: room.nextSeq,
    from: actor,
    to: normalizeRecipients(input?.to),
    waitingOn: normalizeWaiting(input?.waitingOn),
    threadId: cleanSlug(input?.threadId, "general"),
    replyTo: cleanSlug(input?.replyTo, "", 80),
    kind,
    body,
    clientId,
    createdAt: now,
    ...fields,
  };

  return {
    room: {
      ...room,
      revision: room.revision + 1,
      nextSeq: room.nextSeq + 1,
      updatedAt: now,
      messages: [...room.messages, message],
    },
    message,
    changed: true,
  };
}

export function acknowledgeRoom(roomValue, actorValue, throughValue, options = {}) {
  const room = sanitizeRoom(roomValue);
  const actor = normalizeAgent(actorValue);
  if (!actor) throw Object.assign(new Error("A valid agent identity is required"), { statusCode: 401 });

  const highestSeq = room.messages.at(-1)?.seq || 0;
  const requested = Number.parseInt(String(throughValue ?? highestSeq), 10);
  const through = Number.isSafeInteger(requested)
    ? Math.max(0, Math.min(requested, highestSeq))
    : highestSeq;
  const previous = room.cursors[actor]?.seq || 0;
  if (through <= previous) {
    return { room, cursor: room.cursors[actor] || { seq: previous, at: null }, changed: false };
  }

  const now = options.now || new Date().toISOString();
  const cursor = { seq: through, at: now };
  return {
    room: {
      ...room,
      revision: room.revision + 1,
      updatedAt: now,
      cursors: { ...room.cursors, [actor]: cursor },
    },
    cursor,
    changed: true,
  };
}

function isAddressedTo(message, actor) {
  return message.from === actor || message.to.includes("all") || message.to.includes(actor);
}

/** Effective waiting list for one message: explicit waitingOn plus the Kelly
 * implied by a receipt's needsKelly field. */
export function effectiveWaitingOn(message) {
  const waiting = [...message.waitingOn];
  if (message.receipt?.needsKelly && !waiting.includes("kelly")) waiting.push("kelly");
  return waiting;
}

function messageNextOwner(message) {
  return message.thread?.nextOwner || message.note?.nextOwner || message.receipt?.nextOwner || "";
}

/**
 * Derive the current state of every thread from the append-only history.
 * The newest state-bearing event is authoritative; older messages are never
 * rewritten. A reply from an awaited party clears that party from the wait.
 */
export function deriveThreads(roomValue, viewerValue = "") {
  const room = sanitizeRoom(roomValue);
  const viewer = normalizeAgent(viewerValue);
  const cursor = viewer ? room.cursors[viewer]?.seq || 0 : 0;
  const threads = new Map();

  for (const message of room.messages) {
    let thread = threads.get(message.threadId);
    if (!thread) {
      thread = {
        id: message.threadId,
        title: humanizeSlug(message.threadId),
        status: "open",
        waitingOn: [],
        nextOwner: "",
        waitingSeq: 0,
        resolvedBy: "",
        resolvedSeq: 0,
        resolvedAt: null,
        reopened: false,
        firstSeq: message.seq,
        firstAt: message.createdAt,
        firstFrom: message.from,
        lastSeq: message.seq,
        lastAt: message.createdAt,
        lastFrom: message.from,
        count: 0,
        unread: 0,
        participants: [],
        kinds: [],
        project: "",
      };
      threads.set(message.threadId, thread);
    }

    thread.count += 1;
    thread.lastSeq = message.seq;
    thread.lastAt = message.createdAt;
    thread.lastFrom = message.from;
    if (!thread.participants.includes(message.from)) thread.participants.push(message.from);
    if (!thread.kinds.includes(message.kind)) thread.kinds.push(message.kind);
    if (viewer && message.seq > cursor && message.from !== viewer) thread.unread += 1;
    if (message.thread?.title) thread.title = message.thread.title;
    const project = message.receipt?.project || message.note?.project || "";
    if (project) thread.project = project;

    const wasResolved = thread.status === "resolved";
    const explicit = message.thread?.status || "";
    const waiting = effectiveWaitingOn(message);
    const nextOwner = messageNextOwner(message);

    // A reply from an awaited party clears that party from the wait.
    if (thread.waitingOn.includes(message.from)) {
      thread.waitingOn = thread.waitingOn.filter((agent) => agent !== message.from);
      if (thread.nextOwner === message.from) thread.nextOwner = "";
    }

    if (waiting.length) {
      thread.waitingOn = waiting;
      thread.waitingSeq = message.seq;
    }
    if (nextOwner) thread.nextOwner = nextOwner;

    if (explicit === "resolved") {
      thread.status = "resolved";
      thread.waitingOn = [];
      thread.nextOwner = "";
      thread.resolvedBy = message.from;
      thread.resolvedSeq = message.seq;
      thread.resolvedAt = message.createdAt;
    } else if (explicit === "reopened" || explicit === "open" || explicit === "waiting") {
      thread.status = thread.waitingOn.length ? "waiting" : "open";
      if (wasResolved) thread.reopened = true;
    } else if (wasResolved) {
      const reopens = waiting.length || message.kind === "question";
      if (reopens) {
        thread.status = thread.waitingOn.length ? "waiting" : "open";
        thread.reopened = true;
      }
    } else {
      thread.status = thread.waitingOn.length ? "waiting" : "open";
    }

    if (thread.status !== "resolved" && thread.waitingOn.length && !thread.nextOwner) {
      thread.nextOwner = thread.waitingOn[0];
    }
    if (thread.status !== "resolved") {
      thread.resolvedBy = "";
      thread.resolvedSeq = 0;
      thread.resolvedAt = null;
    }
  }

  return [...threads.values()].map((thread) => ({
    ...thread,
    needsKelly: thread.status !== "resolved" && thread.waitingOn.includes("kelly"),
  }));
}

/**
 * Items that need the viewer's attention, each with the reason it is present.
 * Actionable items (waiting on you, handed to you) stay until the thread state
 * changes; read-only items (reply to you, sent to you) drop once acknowledged.
 */
export function deriveInbox(roomValue, viewerValue) {
  const room = sanitizeRoom(roomValue);
  const viewer = normalizeAgent(viewerValue);
  if (!viewer) return [];
  const cursor = room.cursors[viewer]?.seq || 0;
  const threads = new Map(deriveThreads(room, viewer).map((thread) => [thread.id, thread]));
  const byId = new Map(room.messages.map((message) => [message.id, message]));
  const items = [];
  const seen = new Set();

  const push = (message, reason, actionable) => {
    if (seen.has(message.seq)) return;
    seen.add(message.seq);
    const thread = threads.get(message.threadId);
    items.push({
      seq: message.seq,
      id: message.id,
      threadId: message.threadId,
      threadTitle: thread?.title || humanizeSlug(message.threadId),
      threadStatus: thread?.status || "open",
      from: message.from,
      kind: message.kind,
      createdAt: message.createdAt,
      reason,
      reasonLabel: INBOX_REASONS[reason],
      actionable,
      unread: message.seq > cursor && message.from !== viewer,
      nextOwner: thread?.nextOwner || "",
      waitingOn: thread?.waitingOn || [],
    });
  };

  for (const message of room.messages) {
    const thread = threads.get(message.threadId);
    if (!thread || thread.status === "resolved" || message.from === viewer) continue;
    const handedTo = message.note?.nextOwner || (message.kind === "handoff" ? message.thread?.nextOwner : "");
    if ((message.kind === "handoff" || message.kind === "note") && handedTo === viewer &&
        thread.nextOwner === viewer) {
      push(message, "handed-to-you", true);
    }
  }

  for (const thread of threads.values()) {
    if (thread.status === "resolved") continue;
    if (thread.waitingOn.includes(viewer) && thread.waitingSeq) {
      const anchor = room.messages.find((message) => message.seq === thread.waitingSeq);
      if (anchor) push(anchor, "waiting-on-you", true);
    }
  }

  for (const message of room.messages) {
    if (message.seq <= cursor || message.from === viewer) continue;
    const thread = threads.get(message.threadId);
    if (thread?.status === "resolved") continue;
    const parent = message.replyTo ? byId.get(message.replyTo) : null;
    if (parent && parent.from === viewer) push(message, "reply-to-you", false);
    else if (message.to.includes(viewer)) push(message, "addressed-to-you", false);
  }

  return items.sort((left, right) => {
    if (left.actionable !== right.actionable) return left.actionable ? -1 : 1;
    return right.seq - left.seq;
  });
}

export function roomView(roomValue, actorValue, options = {}) {
  const room = sanitizeRoom(roomValue);
  const actor = normalizeAgent(actorValue) || "kelly";
  const after = Math.max(0, Number.parseInt(String(options.after ?? 0), 10) || 0);
  const limit = Math.max(1, Math.min(250, Number.parseInt(String(options.limit ?? 100), 10) || 100));
  const inboxOnly = Boolean(options.inboxOnly);
  const messages = room.messages
    .filter((message) => message.seq > after)
    .filter((message) => !inboxOnly || isAddressedTo(message, actor))
    .slice(-limit);
  const cursor = room.cursors[actor]?.seq || 0;
  const unread = room.messages.filter((message) => (
    message.seq > cursor && message.from !== actor && isAddressedTo(message, actor)
  )).length;

  return {
    schemaVersion: room.schemaVersion,
    revision: room.revision,
    nextSeq: room.nextSeq,
    updatedAt: room.updatedAt,
    viewer: actor,
    unread,
    cursors: room.cursors,
    messages,
    threads: deriveThreads(room, actor),
    inbox: deriveInbox(room, actor),
  };
}
