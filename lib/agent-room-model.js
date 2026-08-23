import { randomUUID } from "node:crypto";

export const AGENT_ROOM_SCHEMA_VERSION = 2;
export const MAX_ROOM_MESSAGES = 5000;

const KINDS = new Set(["message", "question", "status", "decision", "alert", "receipt"]);
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

function sanitizeReceipt(value, fallbackDid = "") {
  const source = value && !Array.isArray(value) && typeof value === "object" ? value : {};
  const did = cleanString(source.did || fallbackDid, 1200);
  if (!did) return null;
  return {
    project: cleanString(source.project, 160) || "General",
    did,
    result: cleanString(source.result, 1600),
    outputs: cleanStringList(source.outputs, { maxItems: 12, maxLength: 500 }),
    needsKelly: cleanString(source.needsKelly, 1000),
    next: cleanString(source.next, 1000),
  };
}

function normalizeRecipients(value) {
  const values = Array.isArray(value) ? value : [value];
  const recipients = [...new Set(values
    .map((item) => normalizeAgent(item, { allowAll: true }))
    .filter(Boolean))];
  return recipients.length ? recipients.slice(0, 12) : ["all"];
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

function sanitizeMessage(value) {
  const from = normalizeAgent(value?.from);
  const body = cleanString(value?.body, 8000);
  const seq = Number.parseInt(String(value?.seq ?? ""), 10);
  if (!from || !body || !Number.isSafeInteger(seq) || seq < 1) return null;

  const id = cleanSlug(value?.id, `message-${seq}`);
  const kind = KINDS.has(value?.kind) ? value.kind : "message";
  const receipt = kind === "receipt" ? sanitizeReceipt(value?.receipt, body) : null;
  const message = {
    id,
    seq,
    from,
    to: normalizeRecipients(value?.to),
    waitingOn: normalizeRecipients(value?.waitingOn || []).filter((agent) => agent !== "all"),
    threadId: cleanSlug(value?.threadId, "general"),
    replyTo: cleanSlug(value?.replyTo, "", 80),
    kind,
    body,
    clientId: cleanSlug(value?.clientId, "", 120),
    createdAt: cleanIsoDate(value?.createdAt, new Date(0).toISOString()),
  };
  if (receipt) message.receipt = receipt;
  return message;
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

export function appendMessage(roomValue, input, actorValue, options = {}) {
  const room = sanitizeRoom(roomValue);
  const actor = normalizeAgent(actorValue);
  if (!actor) throw Object.assign(new Error("A valid agent identity is required"), { statusCode: 401 });

  const body = cleanString(input?.body, 8000);
  if (!body) throw Object.assign(new Error("Message body is required"), { statusCode: 400 });
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

  const now = options.now || new Date().toISOString();
  const idFactory = options.idFactory || (() => randomUUID());
  const kind = KINDS.has(input?.kind) ? input.kind : "message";
  const receipt = kind === "receipt" ? sanitizeReceipt(input?.receipt, body) : null;
  const message = {
    id: cleanSlug(`message-${idFactory()}`, `message-${room.nextSeq}`),
    seq: room.nextSeq,
    from: actor,
    to: normalizeRecipients(input?.to),
    waitingOn: normalizeRecipients(input?.waitingOn || []).filter((agent) => agent !== "all"),
    threadId: cleanSlug(input?.threadId, "general"),
    replyTo: cleanSlug(input?.replyTo, "", 80),
    kind,
    body,
    clientId,
    createdAt: now,
  };
  if (receipt) message.receipt = receipt;

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
  };
}
