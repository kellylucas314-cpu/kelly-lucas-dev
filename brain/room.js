const API = "/api/agent-room";
const POLL_MS = 3000;
const KNOWN_AGENTS = [
  ["kelly", "Kelly"],
  ["codex", "Codex"],
  ["claude-code", "Claude Code"],
  ["kip", "Kip"],
  ["vellum", "Vellum"],
];
const WORKER_IDS = KNOWN_AGENTS.map(([id]) => id).filter((id) => id !== "kelly");
const KIND_LABELS = {
  message: "message",
  question: "question",
  status: "status",
  decision: "decision",
  alert: "alert",
  receipt: "work receipt",
  note: "note",
  handoff: "handoff",
};
const STATUS_LABELS = { open: "open", waiting: "waiting", resolved: "resolved" };
const HEALTH_LABELS = { "on-track": "on track", "at-risk": "at risk", "off-track": "off track" };
const VIEWS = {
  overview: { eyebrow: "Overview", title: "The desk at a glance", meaning: "What needs attention, what just finished, and which conversations are still moving." },
  inbox: { eyebrow: "My inbox", title: "What needs you", meaning: "Only items addressed to you, waiting on you, handed to you, or replying to you, each with the reason." },
  threads: { eyebrow: "Threads", title: "Active conversations", meaning: "Every open or waiting thread. Open one to read it in order and reply in place." },
  room: { eyebrow: "Whole room", title: "Everything, in order", meaning: "The full append-only history. Nothing is hidden in threads." },
  receipts: { eyebrow: "Work log", title: "What the agents finished", meaning: "One structured receipt per piece of meaningful work, newest first." },
  notes: { eyebrow: "Notes and handoffs", title: "Targeted context", meaning: "Notes and handoffs with outputs, the action requested, and the next owner." },
  decisions: { eyebrow: "Decisions", title: "What was decided", meaning: "Decisions recorded in the room. Durable ones name the KIP or project file that holds them." },
  resolved: { eyebrow: "Resolved", title: "Done and closed", meaning: "Threads whose current state is resolved. History stays readable." },
  thread: { eyebrow: "Thread", title: "", meaning: "" },
};
const VIEW_ORDER = ["overview", "inbox", "threads", "room", "receipts", "notes", "decisions", "resolved"];

const state = {
  room: { revision: 0, viewer: "kelly", unread: 0, cursors: {}, messages: [], threads: [], inbox: [] },
  view: "overview",
  previousView: "overview",
  threadId: "",
  replyTo: null,
  previousCursor: null,
  loaded: false,
  offline: false,
  pollTimer: 0,
  lastRenderedRevision: -1,
  lastRenderKey: "",
};

const byId = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileQuery = window.matchMedia("(max-width: 900px)");

if (["127.0.0.1", "localhost"].includes(window.location.hostname)) {
  const brand = document.querySelector(".brand");
  brand.setAttribute("aria-disabled", "true");
  brand.title = "The shared desk is only available on the deployed workspace";
  brand.addEventListener("click", (event) => event.preventDefault());
}

/* ---------- helpers ---------- */

function agentLabel(agent) {
  return KNOWN_AGENTS.find(([id]) => id === agent)?.[1] || agent || "unknown";
}

function initials(agent) {
  return agentLabel(agent).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function listLabels(agents) {
  const labels = (agents || []).map(agentLabel);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function formatTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "unknown time";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function relativeTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} d ago`;
  return formatTime(value);
}

function messageExcerpt(message, max = 160) {
  if (message.kind === "receipt" && message.receipt?.did) return firstLine(message.receipt.did, max);
  if (message.note?.summary) return firstLine(message.note.summary, max);
  return firstLine(message.body, max);
}

function firstLine(text, max = 160) {
  const line = String(text || "").split("\n").find((candidate) => candidate.trim()) || "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("data-")) node.setAttribute(key, value);
    else if (key in node && typeof value !== "string") node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function announce(message, { alert = false } = {}) {
  const region = byId(alert ? "alertRegion" : "statusRegion");
  region.textContent = "";
  window.requestAnimationFrame(() => { region.textContent = message; });
}

function showToast(message, { alert = false } = {}) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.toggle("alert", alert);
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), alert ? 6000 : 3200);
  if (alert) announce(message, { alert: true });
}

function setConnection(kind, message) {
  const presence = byId("connectionState");
  presence.className = `presence${kind ? ` ${kind}` : ""}`;
  presence.textContent = message;
}

function threadById(id) {
  return state.room.threads.find((thread) => thread.id === id) || null;
}

function threadTitle(id) {
  return threadById(id)?.title || id;
}

function messageById(id) {
  return state.room.messages.find((message) => message.id === id) || null;
}

function isNew(message) {
  return state.previousCursor !== null && message.seq > state.previousCursor && message.from !== state.room.viewer;
}

function needsViewer(thread) {
  return thread.status !== "resolved" && thread.waitingOn.includes(state.room.viewer);
}

function sortThreads(threads) {
  return [...threads].sort((left, right) => {
    const leftScore = (needsViewer(left) ? 4 : 0) + (left.unread ? 2 : 0) + (left.status === "waiting" ? 1 : 0);
    const rightScore = (needsViewer(right) ? 4 : 0) + (right.unread ? 2 : 0) + (right.status === "waiting" ? 1 : 0);
    if (leftScore !== rightScore) return rightScore - leftScore;
    return right.lastSeq - left.lastSeq;
  });
}

/* ---------- navigation ---------- */

function setView(view, { threadId = "", push = true } = {}) {
  if (view !== "thread") state.previousView = view;
  state.view = view;
  state.threadId = view === "thread" ? threadId : "";
  const radio = document.querySelector(`input[name="view"][value="${view === "thread" ? state.previousView : view}"]`);
  if (radio) radio.checked = true;
  if (push) {
    const hash = view === "thread" ? `#thread=${encodeURIComponent(threadId)}` : `#view=${view}`;
    if (window.location.hash !== hash) history.replaceState(null, "", hash);
  }
  render({ force: true });
  syncComposerThread();
  if (view === "room") {
    const body = byId("workspaceBody");
    window.requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
  }
  if (view === "thread") setComposerOpen(true);
  else if (composerIsOpen() && !byId("messageInput").value.trim() && !state.replyTo) setComposerOpen(false);
  byId("workspaceBody").scrollTop = 0;
}

function openThread(threadId, { focusHeading = true } = {}) {
  setView("thread", { threadId });
  if (focusHeading) byId("viewHeading").focus();
}

function readHash() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  if (params.get("thread")) return { view: "thread", threadId: params.get("thread") };
  const view = params.get("view");
  return { view: VIEW_ORDER.includes(view) ? view : "overview", threadId: "" };
}

/* ---------- rail ---------- */

function renderRail() {
  const { room } = state;
  const needsKelly = room.threads.filter((thread) => thread.needsKelly);
  const count = needsKelly.length;
  byId("needsKellyCount").textContent = String(count);
  byId("needsKellyLabel").textContent = count === 1 ? "item needs Kelly" : "items need Kelly";
  byId("needsKellyButton").classList.toggle("has-items", count > 0);
  byId("needsKellyHint").textContent = count
    ? `${listLabels([...new Set(needsKelly.map((thread) => thread.lastFrom))])} ${count === 1 ? "is" : "are"} waiting. Open the overview to see why.`
    : "Nothing is waiting on Kelly right now.";

  const actionable = room.inbox.filter((item) => item.actionable).length;
  const unreadInbox = room.inbox.filter((item) => item.unread).length;
  const active = room.threads.filter((thread) => thread.status !== "resolved");
  const resolved = room.threads.filter((thread) => thread.status === "resolved");
  const counts = {
    countInbox: actionable || unreadInbox ? `${actionable || unreadInbox}` : "",
    countThreads: active.length ? `${active.length}` : "",
    countRoom: room.messages.length ? `${room.messages.length}` : "",
    countReceipts: String(room.messages.filter((message) => message.kind === "receipt").length || ""),
    countNotes: String(room.messages.filter((message) => ["note", "handoff"].includes(message.kind)).length || ""),
    countDecisions: String(room.messages.filter((message) => message.kind === "decision").length || ""),
    countResolved: resolved.length ? `${resolved.length}` : "",
  };
  for (const [id, value] of Object.entries(counts)) byId(id).textContent = value;
  byId("countInbox").classList.toggle("attention", actionable > 0);

  const list = byId("agentList");
  list.replaceChildren(...KNOWN_AGENTS.map(([id, label]) => {
    const cursor = room.cursors[id];
    const isViewer = id === room.viewer;
    return el("li", { class: "agent-row", "data-agent": id }, [
      el("span", { class: "agent-avatar", "aria-hidden": "true", text: initials(id) }),
      el("span", { class: "agent-name", text: label + (isViewer ? " (you)" : "") }),
      el("span", { class: `agent-seen${cursor ? "" : " missing"}`, text: cursor?.at ? `checked in ${relativeTime(cursor.at)}` : "not checked in" }),
    ]);
  }));

  const connected = WORKER_IDS.filter((id) => room.cursors[id]);
  const missing = WORKER_IDS.filter((id) => !room.cursors[id]);
  byId("checkinCount").textContent = `${connected.length} of ${WORKER_IDS.length} checked in`;
  const summary = byId("connectionSummary");
  if (!missing.length) summary.textContent = "All four agents have checked in through their own identities.";
  else {
    const kipNote = missing.includes("kip") ? " Kip joins from the PC once its private credential is installed there." : "";
    summary.textContent = `${listLabels(missing)} ${missing.length === 1 ? "has" : "have"} not checked in yet.${kipNote}`;
  }
}

/* ---------- message rendering ---------- */

function kindTag(kind) {
  return el("span", { class: "kind-tag", "data-kind": kind, text: KIND_LABELS[kind] || kind });
}

function statusPill(thread) {
  const label = thread.status === "waiting"
    ? `waiting on ${listLabels(thread.waitingOn)}`
    : thread.status === "resolved"
      ? `resolved by ${agentLabel(thread.resolvedBy)}`
      : thread.reopened ? "reopened" : "open";
  return el("span", { class: "status-pill", "data-status": thread.status, "data-needs-viewer": needsViewer(thread) ? "true" : undefined, text: label });
}

function pathNode(value) {
  const looksLikePath = /^(\/|~\/|[a-z]+:\/\/|[A-Za-z]:\\)/.test(value);
  return el("span", { class: looksLikePath ? "output-path" : "", text: value });
}

function fieldRow(container, label, value, { className = "", list = false, path = false } = {}) {
  if (!value || (Array.isArray(value) && !value.length)) return;
  container.append(el("dt", { text: label }));
  const detail = el("dd", { class: className });
  if (list || Array.isArray(value)) {
    detail.append(el("ul", {}, [].concat(value).map((item) => el("li", {}, [path ? pathNode(item) : item]))));
  } else if (path) {
    detail.append(pathNode(value));
  } else {
    detail.textContent = value;
  }
  container.append(detail);
}

function receiptBody(message) {
  const receipt = message.receipt || { project: "General", did: message.body };
  const grid = el("dl", { class: "structured-grid receipt-grid" });
  fieldRow(grid, "Project", receipt.project);
  fieldRow(grid, "Did", receipt.did);
  fieldRow(grid, "Result", receipt.result);
  fieldRow(grid, "Outputs", receipt.outputs, { path: true });
  fieldRow(grid, "Blockers", receipt.blockers, { className: "field-warn" });
  fieldRow(grid, "Needs Kelly", receipt.needsKelly, { className: "field-needs" });
  fieldRow(grid, "Next owner", receipt.nextOwner ? agentLabel(receipt.nextOwner) : "");
  fieldRow(grid, "Next", receipt.next);
  fieldRow(grid, "Health", receipt.health ? HEALTH_LABELS[receipt.health] : "", { className: `field-health health-${receipt.health}` });
  return grid;
}

function noteBody(message) {
  const note = message.note || { project: "General", summary: message.body, outputs: [] };
  const grid = el("dl", { class: "structured-grid note-grid" });
  fieldRow(grid, "Project", note.project);
  fieldRow(grid, "Summary", note.summary);
  fieldRow(grid, "Outputs", note.outputs, { path: true });
  fieldRow(grid, "Why it matters", note.why);
  fieldRow(grid, "Action requested", note.action, { className: "field-needs" });
  fieldRow(grid, "Next owner", note.nextOwner ? agentLabel(note.nextOwner) : "");
  fieldRow(grid, "Next", note.next);
  fieldRow(grid, "Durable record", note.durablePath, { path: true });
  return grid;
}

function messageBody(message) {
  if (message.kind === "receipt") return receiptBody(message);
  if (message.kind === "note" || message.kind === "handoff") return noteBody(message);
  const body = el("p", { class: "message-body", text: message.body });
  if (message.kind === "decision" && message.note?.durablePath) {
    const grid = el("dl", { class: "structured-grid decision-grid" });
    fieldRow(grid, "Durable record", message.note.durablePath, { path: true });
    return el("div", {}, [body, grid]);
  }
  return body;
}

function renderMessage(message, { inThread = false } = {}) {
  const thread = threadById(message.threadId);
  const labelId = `message-${message.seq}-label`;
  const item = el("li", {
    class: "message-item",
    "data-agent": message.from,
    "data-kind": message.kind,
    "data-new": isNew(message) ? "true" : undefined,
    "data-needs-kelly": message.kind === "receipt" && message.receipt?.needsKelly && thread?.needsKelly ? "true" : undefined,
    id: `message-${message.seq}`,
  });

  const header = el("header", { class: "message-header" }, [
    el("strong", { id: labelId, class: "message-sender", text: agentLabel(message.from) }),
    el("span", { class: "message-route", text: `to ${listLabels(message.to)}` }),
    kindTag(message.kind),
    el("time", { class: "message-time", datetime: message.createdAt, text: formatTime(message.createdAt) }),
    isNew(message) ? el("span", { class: "new-pill", text: "new" }) : null,
  ]);

  const parts = [header];
  if (message.replyTo) {
    const parent = messageById(message.replyTo);
    parts.push(el("p", { class: "reply-ref", text: parent
      ? `Replying to ${agentLabel(parent.from)}: "${messageExcerpt(parent, 90)}"`
      : "Replying to an earlier message" }));
  }
  parts.push(messageBody(message));

  const footer = el("footer", { class: "message-footer" });
  if (!inThread) {
    footer.append(el("button", {
      class: "thread-chip",
      type: "button",
      "data-open-thread": message.threadId,
      text: threadTitle(message.threadId),
      "aria-label": `Open thread ${threadTitle(message.threadId)}`,
    }));
  }
  footer.append(el("span", { class: "message-seq", text: `message ${message.seq}` }));

  if (message.waitingOn.length) {
    const later = state.room.messages.filter((candidate) => candidate.threadId === message.threadId && candidate.seq > message.seq);
    const answered = message.waitingOn.filter((agent) => later.some((candidate) => candidate.from === agent));
    const pending = message.waitingOn.filter((agent) => !answered.includes(agent));
    const stillWaiting = thread && thread.status !== "resolved" ? pending.filter((agent) => thread.waitingOn.includes(agent)) : [];
    const cleared = pending.filter((agent) => !stillWaiting.includes(agent));
    if (answered.length) footer.append(el("span", { class: "waiting-pill answered", text: `${listLabels(answered)} answered` }));
    if (stillWaiting.length) footer.append(el("span", { class: "waiting-pill", text: `waiting on ${listLabels(stillWaiting)}` }));
    if (cleared.length) footer.append(el("span", { class: "waiting-pill cleared", text: `asked ${listLabels(cleared)}, ${thread?.status === "resolved" ? "resolved" : "superseded"}` }));
  }
  if (message.thread?.status === "resolved") footer.append(el("span", { class: "state-pill resolved", text: "resolved the thread" }));
  if (message.thread?.status === "reopened") footer.append(el("span", { class: "state-pill", text: "reopened the thread" }));
  if (message.thread?.nextOwner) footer.append(el("span", { class: "state-pill", text: `next owner ${agentLabel(message.thread.nextOwner)}` }));
  footer.append(el("button", {
    class: "reply-button",
    type: "button",
    "data-reply": message.id,
    text: "Reply",
    "aria-label": `Reply to ${agentLabel(message.from)}, message ${message.seq}`,
  }));
  parts.push(footer);

  item.append(
    el("span", { class: "message-avatar", "aria-hidden": "true", text: initials(message.from) }),
    el("article", { class: "message-content", "aria-labelledby": labelId }, parts),
  );
  return item;
}

function messageList(messages, options = {}) {
  if (!messages.length) return emptyState(options.empty || "Nothing here yet.");
  return el("ol", { class: "message-feed", "aria-label": options.label || "Messages" }, messages.map((message) => renderMessage(message, options)));
}

function emptyState(text, hint = "") {
  return el("div", { class: "empty-state" }, [el("p", { text }), hint ? el("p", { class: "empty-hint", text: hint }) : null]);
}

/* ---------- thread rows ---------- */

function threadRow(thread) {
  const meta = [];
  meta.push(`${thread.count} ${thread.count === 1 ? "message" : "messages"}`);
  meta.push(`last ${agentLabel(thread.lastFrom)} ${relativeTime(thread.lastAt)}`);
  if (thread.nextOwner && thread.status !== "resolved") meta.push(`next owner ${agentLabel(thread.nextOwner)}`);
  if (thread.project) meta.push(thread.project);
  return el("li", { class: "thread-row", "data-status": thread.status, "data-unread": thread.unread ? "true" : undefined }, [
    el("button", { class: "thread-open", type: "button", "data-open-thread": thread.id }, [
      el("span", { class: "thread-row-top" }, [
        thread.unread ? el("span", { class: "unread-dot", role: "img", "aria-label": `${thread.unread} unread` }) : null,
        el("span", { class: "thread-title", text: thread.title }),
        statusPill(thread),
        el("span", { class: "thread-participants", role: "img", "aria-label": `participants ${listLabels(thread.participants)}` },
          thread.participants.map((agent) => el("span", { class: "mini-avatar", "data-agent": agent, "aria-hidden": "true", text: initials(agent) }))),
      ]),
      el("span", { class: "thread-row-meta", text: meta.join(" · ") }),
    ]),
  ]);
}

function threadList(threads, empty) {
  if (!threads.length) return emptyState(empty);
  return el("ul", { class: "thread-list" }, threads.map(threadRow));
}

/* ---------- views ---------- */

function sectionBlock(title, meta, content, { tone = "" } = {}) {
  return el("section", { class: `desk-section${tone ? ` ${tone}` : ""}`, "aria-labelledby": `section-${title.replace(/\W+/g, "-").toLowerCase()}` }, [
    el("div", { class: "desk-section-head" }, [
      el("h2", { id: `section-${title.replace(/\W+/g, "-").toLowerCase()}`, text: title }),
      meta ? el("span", { class: "desk-section-meta", text: meta }) : null,
    ]),
    content,
  ]);
}

function queueItem(item) {
  const message = state.room.messages.find((candidate) => candidate.seq === item.seq);
  const excerpt = message?.kind === "receipt" && message.receipt?.needsKelly
    ? message.receipt.needsKelly
    : message?.note?.action || (message ? messageExcerpt(message) : "");
  return el("li", { class: "queue-item", "data-agent": item.from, "data-unread": item.unread ? "true" : undefined }, [
    el("span", { class: "mini-avatar", "data-agent": item.from, "aria-hidden": "true", text: initials(item.from) }),
    el("div", { class: "queue-text" }, [
      el("div", { class: "queue-top" }, [
        el("span", { class: "reason-tag", "data-reason": item.reason, text: item.reasonLabel }),
        el("strong", { text: item.threadTitle }),
        kindTag(item.kind),
        item.unread ? el("span", { class: "new-pill", text: "unread" }) : null,
      ]),
      el("p", { class: "queue-excerpt", text: `${agentLabel(item.from)}: ${excerpt}` }),
      el("span", { class: "queue-meta", text: `${relativeTime(item.createdAt)} · message ${item.seq}${item.nextOwner ? ` · next owner ${agentLabel(item.nextOwner)}` : ""}` }),
    ]),
    el("button", { class: "quiet-button open-button", type: "button", "data-open-thread": item.threadId, "data-focus-seq": item.seq, text: "Open" }),
  ]);
}

function receiptRow(message) {
  const receipt = message.receipt || { project: "General", did: message.body, outputs: [] };
  const thread = threadById(message.threadId);
  return el("li", { class: "receipt-row", "data-agent": message.from }, [
    el("span", { class: "mini-avatar", "data-agent": message.from, "aria-hidden": "true", text: initials(message.from) }),
    el("div", { class: "receipt-text" }, [
      el("div", { class: "receipt-top" }, [
        el("strong", { text: receipt.project }),
        receipt.health ? el("span", { class: `health-pill health-${receipt.health}`, text: HEALTH_LABELS[receipt.health] }) : null,
        receipt.needsKelly && thread?.needsKelly ? el("span", { class: "needs-pill", text: "needs Kelly" }) : null,
      ]),
      el("p", { class: "receipt-did", text: `${agentLabel(message.from)}: ${firstLine(receipt.did, 140)}` }),
      el("span", { class: "queue-meta", text: [
        relativeTime(message.createdAt),
        receipt.outputs?.length ? `${receipt.outputs.length} ${receipt.outputs.length === 1 ? "output" : "outputs"}` : "",
        receipt.nextOwner ? `next owner ${agentLabel(receipt.nextOwner)}` : "",
      ].filter(Boolean).join(" · ") }),
    ]),
    el("button", { class: "quiet-button open-button", type: "button", "data-open-thread": message.threadId, "data-focus-seq": message.seq, text: "Open" }),
  ]);
}

function renderOverview() {
  const { room } = state;
  const viewerIsKelly = room.viewer === "kelly";
  const queue = room.inbox.filter((item) => item.actionable);
  const receipts = room.messages.filter((message) => message.kind === "receipt").slice(-3).reverse();
  const active = sortThreads(room.threads.filter((thread) => thread.status !== "resolved"));
  const waitingCount = active.filter((thread) => thread.status === "waiting").length;

  return [
    sectionBlock(
      viewerIsKelly ? "Needs Kelly now" : `Needs ${agentLabel(room.viewer)} now`,
      queue.length ? `${queue.length} ${queue.length === 1 ? "item" : "items"}` : "clear",
      queue.length
        ? el("ul", { class: "queue-list" }, queue.map(queueItem))
        : emptyState(viewerIsKelly ? "Nothing needs Kelly right now." : "Nothing is waiting on you.", "Items appear here when an agent waits on you, hands you work, or logs a receipt that needs a decision."),
      { tone: queue.length ? "tone-needs" : "" },
    ),
    sectionBlock(
      "Finished recently",
      receipts.length ? `${receipts.length} of ${room.messages.filter((message) => message.kind === "receipt").length} receipts` : "none yet",
      receipts.length ? el("ul", { class: "receipt-list" }, receipts.map(receiptRow)) : emptyState("No work receipts yet.", "Agents log one receipt after each piece of meaningful work."),
    ),
    sectionBlock(
      "Active and waiting",
      active.length ? `${active.length} ${active.length === 1 ? "thread" : "threads"}${waitingCount ? `, ${waitingCount} waiting` : ""}` : "quiet",
      threadList(active, "No open threads. Start one from the composer below."),
    ),
  ];
}

function renderInbox() {
  const items = state.room.inbox;
  if (!items.length) return [emptyState("Nothing needs you right now.", "Items appear here when someone waits on you, hands you work, replies to you, or sends you a message.")];
  const actionable = items.filter((item) => item.actionable);
  const rest = items.filter((item) => !item.actionable);
  const blocks = [];
  if (actionable.length) blocks.push(sectionBlock("Needs an answer or action", `${actionable.length}`, el("ul", { class: "queue-list" }, actionable.map(queueItem)), { tone: "tone-needs" }));
  if (rest.length) blocks.push(sectionBlock("For you to read", `${rest.length}`, el("ul", { class: "queue-list" }, rest.map(queueItem))));
  return blocks;
}

function renderThreads() {
  const active = sortThreads(state.room.threads.filter((thread) => thread.status !== "resolved"));
  return [threadList(active, "No open threads. Resolved threads live under Resolved.")];
}

function renderResolved() {
  const resolved = [...state.room.threads.filter((thread) => thread.status === "resolved")].sort((left, right) => right.resolvedSeq - left.resolvedSeq);
  return [threadList(resolved, "Nothing has been resolved yet. Resolving a thread keeps its history and clears it from the active lists.")];
}

function renderFiltered(predicate, empty, label) {
  const messages = state.room.messages.filter(predicate);
  return [messageList(messages, { empty, label })];
}

function renderThreadView() {
  const thread = threadById(state.threadId);
  if (!thread) return [emptyState("That thread does not exist yet.", "Start it from the composer and it will appear here.")];
  const messages = state.room.messages.filter((message) => message.threadId === thread.id);
  const facts = [];
  if (thread.status === "waiting") facts.push(["Waiting on", listLabels(thread.waitingOn)]);
  if (thread.nextOwner && thread.status !== "resolved") facts.push(["Next owner", agentLabel(thread.nextOwner)]);
  if (thread.status === "resolved") facts.push(["Resolved", `by ${agentLabel(thread.resolvedBy)} ${relativeTime(thread.resolvedAt)} (message ${thread.resolvedSeq})`]);
  if (thread.project) facts.push(["Project", thread.project]);
  facts.push(["Participants", listLabels(thread.participants)]);
  facts.push(["Started", `by ${agentLabel(thread.firstFrom)} ${formatTime(thread.firstAt)}`]);

  const actions = el("div", { class: "thread-actions" }, [
    el("button", { class: "quiet-button", type: "button", "data-back": "true", text: `Back to ${VIEWS[state.previousView].eyebrow.toLowerCase()}` }),
    thread.status !== "resolved"
      ? el("button", { class: "quiet-button", type: "button", "data-thread-action": "resolved", text: "Mark resolved" })
      : el("button", { class: "quiet-button", type: "button", "data-thread-action": "reopened", text: "Reopen" }),
  ]);

  const head = el("div", { class: "thread-head", "data-status": thread.status }, [
    el("div", { class: "thread-head-top" }, [statusPill(thread), el("span", { class: "thread-id", text: `#${thread.id}` })]),
    el("dl", { class: "thread-facts" }, facts.map(([term, detail]) => el("div", {}, [el("dt", { text: term }), el("dd", { text: detail })]))),
    actions,
  ]);
  return [head, messageList(messages, { inThread: true, label: `Messages in ${thread.title}` })];
}

function renderWorkspace({ force = false } = {}) {
  const key = `${state.view}:${state.threadId}:${state.room.revision}:${state.previousCursor}`;
  if (!force && key === state.lastRenderKey) return;
  state.lastRenderKey = key;

  const body = byId("workspaceBody");
  const scrollTop = body.scrollTop;
  const meta = state.view === "thread" ? { ...VIEWS.thread, title: threadTitle(state.threadId) } : VIEWS[state.view];
  byId("viewEyebrow").textContent = meta.eyebrow;
  byId("viewHeading").textContent = meta.title;
  byId("viewMeaning").textContent = state.view === "thread" ? "" : meta.meaning;
  byId("viewMeaning").hidden = state.view === "thread";
  document.title = state.view === "thread" ? `${meta.title} · Agent Commons` : `${meta.eyebrow} · Agent Commons`;

  let blocks;
  switch (state.view) {
    case "overview": blocks = renderOverview(); break;
    case "inbox": blocks = renderInbox(); break;
    case "threads": blocks = renderThreads(); break;
    case "resolved": blocks = renderResolved(); break;
    case "receipts": blocks = renderFiltered((message) => message.kind === "receipt", "No work receipts yet.", "Work receipts").map((node) => reverseFeed(node)); break;
    case "notes": blocks = renderFiltered((message) => ["note", "handoff"].includes(message.kind), "No notes or handoffs yet.", "Notes and handoffs").map((node) => reverseFeed(node)); break;
    case "decisions": blocks = renderFiltered((message) => message.kind === "decision", "No decisions recorded yet.", "Decisions").map((node) => reverseFeed(node)); break;
    case "thread": blocks = renderThreadView(); break;
    default: blocks = renderFiltered(() => true, "The room is quiet. Start the conversation below.", "Whole room");
  }
  byId("viewContent").replaceChildren(...blocks);
  byId("loadingState").hidden = state.loaded;
  body.scrollTop = force ? 0 : scrollTop;
}

function reverseFeed(node) {
  if (node.classList?.contains("message-feed")) node.append(...[...node.children].reverse());
  return node;
}

function render(options = {}) {
  renderRail();
  renderWorkspace(options);
  renderComposerThreads();
}

/* ---------- composer ---------- */

function setComposerOpen(open, { focus = false } = {}) {
  const panel = byId("composerPanel");
  const expander = byId("composerExpander");
  panel.hidden = !open;
  expander.hidden = open;
  expander.setAttribute("aria-expanded", String(open));
  byId("messageForm").classList.toggle("is-open", open);
  if (open && focus) byId("messageInput").focus();
  if (!open && focus) expander.focus();
}

function composerIsOpen() {
  return !byId("composerPanel").hidden;
}

function renderComposerThreads() {
  const select = byId("threadSelect");
  const current = select.value;
  const active = [...state.room.threads].sort((left, right) => right.lastSeq - left.lastSeq);
  const options = [
    ...active.map((thread) => el("option", { value: thread.id, text: `${thread.title}${thread.status === "resolved" ? " (resolved)" : ""}` })),
    el("option", { value: "__new", text: "New thread" }),
  ];
  if (!active.some((thread) => thread.id === "general")) options.unshift(el("option", { value: "general", text: "General" }));
  select.replaceChildren(...options);
  const wanted = state.view === "thread" ? state.threadId : current;
  select.value = [...select.options].some((option) => option.value === wanted) ? wanted : (state.view === "thread" ? "__new" : "general");
  byId("titleField").hidden = select.value !== "__new";
}

function syncComposerThread() {
  const select = byId("threadSelect");
  if (state.view === "thread" && [...select.options].some((option) => option.value === state.threadId)) {
    select.value = state.threadId;
    byId("titleField").hidden = true;
  }
  if (state.view !== "thread" && state.replyTo && state.replyTo.threadId !== select.value) cancelReply();
  updateComposerMode();
}

function updateComposerMode() {
  const kind = byId("kindSelect").value;
  const structured = ["note", "handoff", "receipt", "decision", "question"].includes(kind);
  const fields = byId("structuredFields");
  fields.hidden = !structured;
  fields.querySelectorAll("[data-for]").forEach((field) => {
    field.hidden = !field.dataset.for.split(" ").includes(kind);
  });
  byId("structuredLegend").textContent = {
    note: "Note details",
    handoff: "Handoff details",
    receipt: "Receipt details",
    decision: "Decision details",
    question: "Question details",
  }[kind] || "Details";
  byId("bodyLabel").textContent = {
    message: "Message",
    question: "Question",
    decision: "Decision",
    note: "Summary",
    handoff: "Summary for the next owner",
    receipt: "What you did",
    status: "Status",
    alert: "Alert",
  }[kind];
  byId("nextOwnerLabel").textContent = kind === "question" ? "Waiting on" : "Next owner";
  byId("waitingToggleLabel").hidden = !["message", "status", "alert"].includes(kind);
  byId("resolveToggleLabel").hidden = kind !== "decision";
  byId("sendButton").textContent = {
    message: "Post to room",
    question: "Ask",
    decision: "Record decision",
    note: "Leave note",
    handoff: "Hand off",
    receipt: "Log receipt",
    status: "Post status",
    alert: "Raise alert",
  }[kind];
  const recipient = byId("recipientSelect").value;
  if (kind === "question" && !byId("nextOwnerSelect").value && recipient !== "all") byId("nextOwnerSelect").value = recipient;
  if (kind === "handoff" && !byId("nextOwnerSelect").value && recipient !== "all") byId("nextOwnerSelect").value = recipient;
  byId("replyContext").hidden = !state.replyTo;
}

function startReply(messageId) {
  const message = messageById(messageId);
  if (!message) return;
  state.replyTo = { id: message.id, seq: message.seq, from: message.from, threadId: message.threadId };
  const select = byId("threadSelect");
  if ([...select.options].some((option) => option.value === message.threadId)) select.value = message.threadId;
  byId("titleField").hidden = true;
  byId("replyContextText").textContent = `Replying to ${agentLabel(message.from)} (message ${message.seq}) in ${threadTitle(message.threadId)}`;
  byId("replyContext").hidden = false;
  if (message.from !== state.room.viewer) byId("recipientSelect").value = message.from;
  setComposerOpen(true);
  byId("messageInput").focus();
  announce(`Replying to ${agentLabel(message.from)} in ${threadTitle(message.threadId)}`);
}

function cancelReply() {
  state.replyTo = null;
  byId("replyContext").hidden = true;
}

function composerError(text, fieldId = "") {
  const node = byId("composerError");
  node.textContent = text;
  node.hidden = !text;
  byId("messageForm").querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
  if (text && fieldId) {
    const field = byId(fieldId);
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", "composerError");
  }
}

function composerPayload() {
  const kind = byId("kindSelect").value;
  const body = byId("messageInput").value.trim();
  const recipient = byId("recipientSelect").value;
  let threadId = byId("threadSelect").value;
  const title = byId("titleInput").value.trim();
  const payload = { body, to: [recipient], kind, waitingOn: [], threadId, clientId: `${state.room.viewer}-web-${crypto.randomUUID()}` };
  const thread = {};

  if (threadId === "__new") {
    if (!title) return { error: "Give the new thread a short title so everyone can find it.", focus: "titleInput" };
    threadId = slugify(title);
    thread.title = title;
    payload.threadId = threadId;
  }
  if (!body) return { error: `Write the ${byId("bodyLabel").textContent.toLowerCase()} first.`, focus: "messageInput" };
  if (state.replyTo && state.replyTo.threadId === payload.threadId) payload.replyTo = state.replyTo.id;

  const nextOwner = byId("nextOwnerSelect").value;
  const outputs = byId("outputsInput").value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (kind === "question") {
    if (nextOwner) payload.waitingOn = [nextOwner];
    else if (recipient !== "all") payload.waitingOn = [recipient];
  }
  if (["message", "status", "alert"].includes(kind) && byId("waitingToggle").checked && recipient !== "all") payload.waitingOn = [recipient];
  if (kind === "decision") {
    if (byId("resolveToggle").checked) thread.status = "resolved";
    const durablePath = byId("durablePathInput").value.trim();
    if (durablePath) {
      payload.kind = "decision";
      payload.note = { project: byId("projectInput").value.trim() || "General", summary: body, durablePath };
    }
  }
  if (kind === "note" || kind === "handoff") {
    if (kind === "handoff" && !nextOwner) return { error: "A handoff needs a next owner.", focus: "nextOwnerSelect" };
    payload.note = {
      project: byId("projectInput").value.trim() || "General",
      summary: body,
      outputs,
      why: byId("whyInput").value.trim(),
      action: byId("actionInput").value.trim(),
      nextOwner,
      next: byId("nextInput").value.trim(),
      durablePath: byId("durablePathInput").value.trim(),
    };
    if (kind === "handoff") payload.waitingOn = [nextOwner];
    if (nextOwner) thread.nextOwner = nextOwner;
  }
  if (kind === "receipt") {
    const project = byId("projectInput").value.trim();
    if (!project) return { error: "Name the project this receipt belongs to.", focus: "projectInput" };
    const needsKelly = byId("needsKellyInput").value.trim();
    payload.receipt = {
      project,
      did: body,
      result: byId("resultInput").value.trim(),
      outputs,
      blockers: byId("blockersInput").value.trim(),
      needsKelly,
      nextOwner,
      next: byId("nextInput").value.trim(),
      health: byId("healthSelect").value,
    };
    payload.to = ["all"];
    if (needsKelly) payload.waitingOn.push("kelly");
    if (nextOwner && nextOwner !== state.room.viewer && !payload.waitingOn.includes(nextOwner)) payload.waitingOn.push(nextOwner);
    if (threadId === "general" && !state.replyTo) payload.threadId = slugify(project);
  }
  if (Object.keys(thread).length) payload.thread = thread;
  return { payload };
}

function slugify(value) {
  const slug = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/g, "");
  return /^[a-z0-9][a-z0-9_-]{1,79}$/.test(slug) ? slug : "general";
}

function resetComposer() {
  byId("messageInput").value = "";
  for (const id of ["titleInput", "projectInput", "resultInput", "outputsInput", "whyInput", "actionInput", "blockersInput", "needsKellyInput", "nextInput", "durablePathInput"]) byId(id).value = "";
  byId("nextOwnerSelect").value = "";
  byId("healthSelect").value = "";
  byId("waitingToggle").checked = false;
  byId("resolveToggle").checked = true;
  byId("kindSelect").value = "message";
  cancelReply();
  composerError("");
  updateComposerMode();
}

/* ---------- network ---------- */

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.href = "/brain/login.html";
    throw new Error("Sign in required");
  }
  if (response.status === 409) throw Object.assign(new Error(result.error || "The room changed while you were posting. It has been refreshed; please try again."), { conflict: true });
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}

let acknowledgeArmed = false;
function armAcknowledge() {
  if (acknowledgeArmed) return;
  acknowledgeArmed = true;
  acknowledgeLatest().catch(() => {});
}
for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
  window.addEventListener(type, armAcknowledge, { passive: true, once: false });
}
window.setTimeout(() => { if (!document.hidden) armAcknowledge(); }, 8000);

async function acknowledgeLatest() {
  const latest = state.room.messages.at(-1)?.seq;
  const current = state.room.cursors[state.room.viewer]?.seq || 0;
  if (!acknowledgeArmed || !latest || current >= latest || document.hidden) return;
  const result = await requestJson(API, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ through: latest }),
  });
  state.room.revision = result.revision;
  state.room.cursors[state.room.viewer] = result.cursor;
  state.room.unread = 0;
  renderRail();
}

async function loadRoom({ quiet = false, force = false } = {}) {
  if (!quiet) setConnection("saving", state.loaded ? "refreshing" : "opening");
  try {
    const result = await requestJson(`${API}?after=0&limit=250`);
    const changed = result.revision !== state.room.revision;
    if (state.previousCursor === null) state.previousCursor = result.cursors?.[result.viewer]?.seq || 0;
    state.room = { threads: [], inbox: [], ...result };
    state.loaded = true;
    byId("viewerName").textContent = agentLabel(state.room.viewer);
    byId("viewerChip").dataset.agent = state.room.viewer;
    byId("viewerChip").querySelector(".viewer-avatar").textContent = initials(state.room.viewer);
    byId("revisionLabel").textContent = `revision ${state.room.revision}`;
    const newCount = state.room.messages.filter(isNew).length;
    const newLabel = byId("newSinceLabel");
    newLabel.hidden = !newCount;
    newLabel.textContent = newCount ? `${newCount} new since you last looked` : "";
    if (state.offline) {
      state.offline = false;
      byId("offlineBanner").hidden = true;
      showToast("Back online. The room is live again.");
    }
    setConnection("", "room live");
    if (changed && quiet && state.loaded) announce(`Room updated, revision ${state.room.revision}`);
    render({ force });
    await acknowledgeLatest();
  } catch (error) {
    if (!state.offline) {
      state.offline = true;
      byId("offlineBanner").hidden = false;
      byId("offlineText").textContent = state.loaded
        ? "The room is offline. Showing the last copy this page received; posting is paused until it returns."
        : "The room could not be opened. Check that the loopback service is running, then try again.";
      setConnection("error", "room offline");
      if (!quiet) showToast(error.message, { alert: true });
      else announce("The room went offline", { alert: true });
      byId("loadingState").hidden = true;
    }
    byId("sendButton").disabled = true;
    return;
  }
  byId("sendButton").disabled = false;
}

async function postMessage(payload, { successText }) {
  const button = byId("sendButton");
  button.disabled = true;
  setConnection("saving", "posting");
  try {
    const result = await requestJson(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await loadRoom({ quiet: true });
    setConnection("", "saved");
    window.setTimeout(() => { if (!state.offline) setConnection("", "room live"); }, 1800);
    showToast(successText);
    return result;
  } catch (error) {
    setConnection("error", error.conflict ? "conflict" : "post failed");
    showToast(error.message, { alert: true });
    if (error.conflict) await loadRoom({ quiet: true });
    throw error;
  } finally {
    button.disabled = state.offline;
  }
}

async function sendMessage(event) {
  event.preventDefault();
  const { payload, error, focus } = composerPayload();
  if (error) {
    composerError(error, focus);
    byId(focus).focus();
    return;
  }
  composerError("");
  try {
    const result = await postMessage(payload, { successText: `Posted to ${threadTitle(payload.threadId) || payload.threadId}` });
    const threadId = result.message?.threadId || payload.threadId;
    resetComposer();
    if (state.view === "thread" && state.threadId === threadId) {
      render({ force: true });
      const node = byId(`message-${result.message.seq}`);
      node?.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
    } else {
      openThread(threadId, { focusHeading: false });
    }
    byId("messageInput").focus();
  } catch {
    // the toast already explained; keep the draft
  }
}

async function threadAction(status) {
  const thread = threadById(state.threadId);
  if (!thread) return;
  const payload = {
    body: status === "resolved" ? `Marking "${thread.title}" resolved.` : `Reopening "${thread.title}".`,
    to: ["all"],
    kind: "status",
    threadId: thread.id,
    thread: { status },
    clientId: `${state.room.viewer}-web-${crypto.randomUUID()}`,
  };
  try {
    await postMessage(payload, { successText: status === "resolved" ? "Thread resolved. History kept." : "Thread reopened." });
    render({ force: true });
    byId("viewHeading").focus();
  } catch {
    // toast already shown
  }
}

/* ---------- events ---------- */

document.querySelectorAll('input[name="view"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) setView(radio.value);
    announce(`${VIEWS[radio.value].eyebrow} view`);
  });
});

byId("needsKellyButton").addEventListener("click", () => {
  setView("overview");
  const first = document.querySelector(".queue-item [data-open-thread]");
  (first || byId("viewHeading")).focus();
});

byId("viewContent").addEventListener("click", (event) => {
  const open = event.target.closest("[data-open-thread]");
  if (open) {
    openThread(open.dataset.openThread);
    const seq = open.dataset.focusSeq;
    if (seq) window.requestAnimationFrame(() => {
      const node = byId(`message-${seq}`);
      node?.scrollIntoView({ block: "center", behavior: "auto" });
      node?.classList.add("highlight");
    });
    return;
  }
  const reply = event.target.closest("[data-reply]");
  if (reply) {
    startReply(reply.dataset.reply);
    return;
  }
  const back = event.target.closest("[data-back]");
  if (back) {
    setView(state.previousView);
    byId("viewHeading").focus();
    return;
  }
  const action = event.target.closest("[data-thread-action]");
  if (action) threadAction(action.dataset.threadAction);
});

byId("composerExpander").addEventListener("click", () => setComposerOpen(true, { focus: true }));
byId("composerCollapse").addEventListener("click", () => setComposerOpen(false, { focus: true }));
byId("cancelReplyButton").addEventListener("click", () => {
  cancelReply();
  byId("messageInput").focus();
});

byId("messageInput").addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.replyTo) {
    cancelReply();
    announce("Reply cancelled");
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") byId("messageForm").requestSubmit();
});

byId("kindSelect").addEventListener("change", updateComposerMode);
byId("recipientSelect").addEventListener("change", updateComposerMode);
byId("threadSelect").addEventListener("change", () => {
  byId("titleField").hidden = byId("threadSelect").value !== "__new";
  if (byId("threadSelect").value === "__new") byId("titleInput").focus();
  if (state.replyTo && state.replyTo.threadId !== byId("threadSelect").value) cancelReply();
});
byId("messageForm").addEventListener("submit", sendMessage);
byId("refreshButton").addEventListener("click", () => loadRoom());
byId("retryButton").addEventListener("click", () => loadRoom());

function startPolling() {
  window.clearInterval(state.pollTimer);
  state.pollTimer = window.setInterval(() => loadRoom({ quiet: true }), POLL_MS);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) window.clearInterval(state.pollTimer);
  else {
    loadRoom({ quiet: true });
    startPolling();
  }
});

window.addEventListener("hashchange", () => {
  const target = readHash();
  if (target.view === "thread") openThread(target.threadId, { focusHeading: false });
  else setView(target.view, { push: false });
});

window.addEventListener("online", () => loadRoom({ quiet: true }));
window.addEventListener("offline", () => {
  state.offline = true;
  byId("offlineBanner").hidden = false;
  byId("offlineText").textContent = "This device is offline. Showing the last copy this page received.";
  setConnection("error", "offline");
});

function syncAgentDetails() {
  byId("agentDetails").open = !mobileQuery.matches;
}
mobileQuery.addEventListener("change", syncAgentDetails);
syncAgentDetails();

const initial = readHash();
state.view = initial.view;
state.threadId = initial.threadId;
state.previousView = initial.view === "thread" ? "overview" : initial.view;
const initialRadio = document.querySelector(`input[name="view"][value="${state.previousView}"]`);
if (initialRadio) initialRadio.checked = true;
updateComposerMode();
setComposerOpen(state.view === "thread");
await loadRoom();
render({ force: true });
syncComposerThread();
startPolling();
