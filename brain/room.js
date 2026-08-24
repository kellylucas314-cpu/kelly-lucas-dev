import {
  BOARD_SEATS,
  REACTION_EMOJI,
  boardOwner,
  collectReactions,
  deriveBoard,
  hasReacted,
  isReactionMessage,
  reactionSummary,
} from "/lib/agent-room-board.js";

// On the Mac loopback service the page talks to the local proxy; on
// kellylucas.dev it talks to the session door that accepts Kelly's sign-in.
const LOCAL_HOSTS = ["127.0.0.1", "localhost"];
const API = LOCAL_HOSTS.includes(window.location.hostname) ? "/api/agent-room" : "/api/room-session";
const POLL_MS = 10000;
const KNOWN_AGENTS = [
  ["kelly", "Kelly"],
  ["codex", "Codex"],
  ["claude-code", "Claude Code"],
  ["kip", "Kip"],
  ["vellum", "Vellum"],
];
const WORKER_IDS = KNOWN_AGENTS.map(([id]) => id).filter((id) => id !== "kelly");
// Two-letter marks that never collide, used until a picture is dropped into assets/avatars/.
const MONOGRAMS = { kelly: "Ke", codex: "Co", "claude-code": "CC", kip: "Ki", vellum: "Ve" };
// Short nameplates. Roles and homes, not activity.
const AGENT_BIOS = {
  kelly: "runs the place",
  codex: "builds things",
  "claude-code": "thinks it through",
  kip: "runs things on the PC",
  vellum: "Grok's chief of staff",
};
const AVATAR_IMAGES = {};
const KIND_LABELS = {
  message: "message",
  question: "question",
  status: "update",
  decision: "decision",
  alert: "heads up",
  receipt: "finished work",
  note: "note",
  handoff: "handoff",
};
const HEALTH_LABELS = { "on-track": "on track", "at-risk": "at risk", "off-track": "off track" };
const VIEWS = {
  overview: { eyebrow: "Today", title: "Today", meaning: "" },
  board: { eyebrow: "Board", title: "The board", meaning: "Every open conversation is a card on someone's plate. Pass a card to hand the work over." },
  feed: { eyebrow: "Feed", title: "The feed", meaning: "What the team is doing and saying, newest first. Cheer things on." },
  archive: { eyebrow: "Archive", title: "The archive", meaning: "The whole record, nothing hidden. Pick a shelf." },
  thread: { eyebrow: "Conversation", title: "", meaning: "" },
};
const VIEW_ORDER = ["overview", "board", "feed", "archive"];
// Old bookmarks and links keep working: retired views land on their new home.
const LEGACY_VIEWS = {
  inbox: { view: "overview" },
  threads: { view: "board" },
  room: { view: "archive", filter: "all" },
  receipts: { view: "archive", filter: "receipts" },
  notes: { view: "archive", filter: "notes" },
  decisions: { view: "archive", filter: "decisions" },
  resolved: { view: "archive", filter: "resolved" },
};
const ARCHIVE_FILTERS = [
  ["all", "Everything"],
  ["receipts", "Finished work"],
  ["notes", "Notes and handoffs"],
  ["decisions", "Decisions"],
  ["resolved", "Wrapped up"],
];
const ALL_CLEAR_LINES = [
  "Nothing needs you. The team has it.",
  "All clear. Go touch some grass.",
  "Inbox zero. Enjoy it while it lasts.",
  "Nothing is waiting on you. Rare and beautiful.",
  "Desk is clear. The agents have the wheel.",
];
const SHORTCUTS = {
  "/shrug": "¯\\_(ツ)_/¯",
  "/tableflip": "(╯°□°)╯︵ ┻━┻",
  "/unflip": "┬─┬ノ( º _ ºノ)",
  "/party": "🎉",
  "/sparkle": "✨",
};
const QUICK_REPLIES = [
  ["Got it", "Got it, thank you."],
  ["Love it", "Love it, nice work."],
  ["Say more", "Can you say a bit more about this?"],
];
const DECISION_REPLIES = [
  ["Yes, go ahead", "Yes, go ahead."],
  ["Not yet", "Not yet. Let's talk about it first."],
  ["Tell me more", "Tell me a bit more before I decide."],
];

const state = {
  room: { revision: 0, viewer: "kelly", unread: 0, cursors: {}, messages: [], threads: [], inbox: [] },
  view: "overview",
  previousView: "overview",
  threadId: "",
  archiveFilter: "all",
  guideOpen: false,
  replyTo: null,
  previousCursor: null,
  loaded: false,
  offline: false,
  pollTimer: 0,
  lastRenderKey: "",
  lastLoadedAt: null,
  composerRowOpen: false,
};

const byId = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileQuery = window.matchMedia("(max-width: 900px)");
const phoneQuery = window.matchMedia("(max-width: 620px)");

if (LOCAL_HOSTS.includes(window.location.hostname)) {
  const brand = document.querySelector(".brand");
  brand.setAttribute("aria-disabled", "true");
  brand.title = "The task board lives on the deployed workspace";
  brand.addEventListener("click", (event) => event.preventDefault());
}

/* ---------- helpers ---------- */

function agentLabel(agent) {
  if (agent === "all") return "everyone";
  return KNOWN_AGENTS.find(([id]) => id === agent)?.[1] || agent || "unknown";
}

function viewerIs(agent) {
  return state.room.viewer === agent;
}

function youOr(agent, { capital = false } = {}) {
  if (viewerIs(agent)) return capital ? "You" : "you";
  return agentLabel(agent);
}

function monogram(agent) {
  if (agent === "all") return "∗";
  return MONOGRAMS[agent] || agentLabel(agent).slice(0, 2);
}

function avatarNode(agent, size = "") {
  const node = el("span", { class: `avatar${size ? ` avatar-${size}` : ""}`, "data-agent": agent, "aria-hidden": "true", text: monogram(agent) });
  if (AVATAR_IMAGES[agent]) node.append(el("img", { src: AVATAR_IMAGES[agent], alt: "" }));
  return node;
}

function preloadAvatars() {
  for (const [id] of KNOWN_AGENTS) {
    const image = new Image();
    image.onload = () => {
      AVATAR_IMAGES[id] = image.src;
      if (state.loaded) render({ force: true });
    };
    image.src = `/assets/avatars/${id}.png`;
  }
}

function listLabels(agents, options = {}) {
  const labels = (agents || []).map((agent) => (options.you ? youOr(agent) : agentLabel(agent)));
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function agentPresence(room, id) {
  const cursor = room.cursors?.[id];
  const latestMessage = [...(room.messages || [])].reverse().find((message) => message.from === id);
  if (!cursor && !latestMessage) return null;
  if (!latestMessage) return { at: cursor.at, source: "acknowledgement" };
  if (!cursor?.at || Date.parse(latestMessage.createdAt) > Date.parse(cursor.at)) {
    return { at: latestMessage.createdAt, source: "message" };
  }
  return { at: cursor.at, source: "acknowledgement" };
}

function presenceState(presence) {
  if (!presence?.at) return "none";
  const minutes = (Date.now() - Date.parse(presence.at)) / 60000;
  if (minutes < 60) return "now";
  if (minutes < 24 * 60) return "today";
  return "older";
}

function presenceText(presence) {
  const bucket = presenceState(presence);
  if (bucket === "none") return "not here yet";
  if (bucket === "now") return presence.source === "message" ? "posting now" : "looking in now";
  const verb = presence.source === "message" ? "posted" : "looked in";
  if (bucket === "today") return `${verb} today`;
  return `${verb} ${relativeTime(presence.at)}`;
}

function presenceSummary(room) {
  const buckets = { now: [], today: [], older: [], none: [] };
  for (const id of WORKER_IDS) buckets[presenceState(agentPresence(room, id))].push(id);
  const parts = [];
  if (buckets.now.length) parts.push(`${listLabels(buckets.now)} ${buckets.now.length === 1 ? "is" : "are"} active right now.`);
  else if (buckets.today.length) parts.push(`${listLabels(buckets.today)} ${buckets.today.length === 1 ? "was" : "were"} here today.`);
  else if (buckets.older.length) {
    const latest = buckets.older.map((id) => agentPresence(room, id)?.at).filter(Boolean).sort().at(-1);
    parts.push(`Nobody has been around since ${relativeTime(latest)}.`);
  }
  if (buckets.none.length) parts.push(`${listLabels(buckets.none)} ${buckets.none.length === 1 ? "hasn't" : "haven't"} checked in yet.${buckets.none.includes("kip") ? " Kip joins from the PC." : ""}`);
  return parts.join(" ");
}

function formatTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "unknown time";
  const days = (Date.now() - date.getTime()) / 86400000;
  if (days >= 0 && days < 7) {
    const day = days < 1 && date.getDate() === new Date().getDate() ? "Today" : new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
    return `${day} ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date)}`;
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function formatClock(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function relativeTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${plural(minutes, "minute")} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${plural(hours, "hour")} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
  if (days < 14) return `${days} days ago`;
  return formatTime(value);
}

function todayLabel() {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
}

function greeting(name) {
  const hour = new Date().getHours();
  if (hour < 5) return `Still up, ${name}?`;
  if (hour < 12) return `Good morning, ${name}.`;
  if (hour < 17) return `Good afternoon, ${name}.`;
  if (hour < 22) return `Good evening, ${name}.`;
  return `Late one, ${name}.`;
}

function allClearLine() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start) / 86400000);
  return ALL_CLEAR_LINES[dayOfYear % ALL_CLEAR_LINES.length];
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

function friendlyFileLabel(value) {
  const raw = String(value || "").trim();
  try {
    if (/^[a-z]+:\/\//i.test(raw)) {
      const url = new URL(raw);
      const last = url.pathname.split("/").filter(Boolean).at(-1);
      return last ? `${url.hostname} · ${last}` : url.hostname;
    }
  } catch {
    // not a URL; fall through to path handling
  }
  const parts = raw.replace(/\\/g, "/").split("/").filter(Boolean);
  if (!parts.length) return raw;
  const last = parts.at(-1);
  const trailingSlash = /[\\/]$/.test(raw);
  if (parts.length === 1) return trailingSlash ? `${last}/` : last;
  return `${parts.at(-2)}/${last}${trailingSlash ? "/" : ""}`;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
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

function askMessage(thread) {
  // The latest message in the thread that is still waiting on the viewer.
  if (!needsViewer(thread)) return null;
  return [...state.room.messages].reverse().find((message) => message.threadId === thread.id && message.waitingOn.includes(state.room.viewer)) || null;
}

function askText(message) {
  if (!message) return "";
  if (message.kind === "receipt" && message.receipt?.needsKelly) return message.receipt.needsKelly;
  if (message.note?.action) return message.note.action;
  return messageExcerpt(message, 200);
}

function sortThreads(threads) {
  return [...threads].sort((left, right) => {
    const leftScore = (needsViewer(left) ? 4 : 0) + (left.unread ? 2 : 0) + (left.status === "waiting" ? 1 : 0);
    const rightScore = (needsViewer(right) ? 4 : 0) + (right.unread ? 2 : 0) + (right.status === "waiting" ? 1 : 0);
    if (leftScore !== rightScore) return rightScore - leftScore;
    return right.lastSeq - left.lastSeq;
  });
}

/* ---------- small delights ---------- */

function confettiBurst({ x, y } = {}) {
  if (reducedMotion.matches) return;
  const canvas = byId("confetti");
  const context = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  context.scale(ratio, ratio);
  canvas.classList.add("active");
  const colors = ["#c6481c", "#2f68de", "#a05a33", "#257a5a", "#7960c9", "#ffd36b"];
  const originX = x ?? window.innerWidth / 2;
  const originY = y ?? window.innerHeight / 3;
  const pieces = Array.from({ length: 70 }, (_, index) => ({
    x: originX,
    y: originY,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 11 - 4,
    size: 5 + Math.random() * 5,
    color: colors[index % colors.length],
    spin: Math.random() * Math.PI,
    spinSpeed: (Math.random() - 0.5) * 0.3,
  }));
  let frame = 0;
  const draw = () => {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const piece of pieces) {
      piece.vy += 0.35;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vx *= 0.985;
      piece.spin += piece.spinSpeed;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.spin);
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
      context.restore();
    }
    frame += 1;
    if (frame < 110) window.requestAnimationFrame(draw);
    else {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      canvas.classList.remove("active");
    }
  };
  window.requestAnimationFrame(draw);
}

let partyTimer = 0;
function partyMode() {
  document.body.classList.add("party");
  confettiBurst();
  showToast("Party mode. Hats on for a minute.");
  window.clearTimeout(partyTimer);
  partyTimer = window.setTimeout(() => document.body.classList.remove("party"), 60000);
}

function expandShortcuts(text) {
  return text.replace(/(^|\s)(\/[a-z]+)(?=\s|$)/g, (match, lead, token) => (SHORTCUTS[token] ? `${lead}${SHORTCUTS[token]}` : match));
}

/* ---------- navigation ---------- */

function setView(view, { threadId = "", filter = "", push = true } = {}) {
  const legacy = LEGACY_VIEWS[view];
  if (legacy) {
    filter = filter || legacy.filter || "";
    view = legacy.view;
  }
  if (view === "archive" && filter) state.archiveFilter = filter;
  if (view !== "thread") state.previousView = view;
  state.view = view;
  state.threadId = view === "thread" ? threadId : "";
  const radio = document.querySelector(`input[name="view"][value="${view === "thread" ? state.previousView : view}"]`);
  document.querySelectorAll('input[name="view"]').forEach((input) => { input.checked = false; });
  if (radio && view !== "thread") radio.checked = true;
  if (push) {
    const filterPart = view === "archive" && state.archiveFilter !== "all" ? `&filter=${state.archiveFilter}` : "";
    const hash = view === "thread" ? `#thread=${encodeURIComponent(threadId)}` : `#view=${view}${filterPart}`;
    if (window.location.hash !== hash) history.replaceState(null, "", hash);
  }
  document.body.classList.toggle("is-subview", view === "thread");
  render({ force: true });
  syncComposerThread();
  if (view === "archive" && state.archiveFilter === "all") scrollToNewOrEnd();
  if (view !== "thread" && composerIsOpen() && !byId("messageInput").value.trim() && !state.replyTo) setComposerOpen(false);
  byId("workspaceBody").scrollTop = 0;
  if (mobileQuery.matches) {
    window.scrollTo({ top: 0, behavior: "auto" });
    radio?.closest(".view-option")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
  }
}

function openThread(threadId, { focusHeading = true } = {}) {
  setView("thread", { threadId });
  if (focusHeading) byId("viewHeading").focus();
}

function scrollToNewOrEnd() {
  const body = byId("workspaceBody");
  window.requestAnimationFrame(() => {
    const divider = document.querySelector(".new-divider");
    if (divider) {
      if (mobileQuery.matches) divider.scrollIntoView({ block: "start", behavior: "auto" });
      else body.scrollTop = Math.max(0, divider.offsetTop - body.offsetTop - 12);
    } else if (!mobileQuery.matches) {
      body.scrollTop = body.scrollHeight;
    }
  });
}

function readHash() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  if (params.get("thread")) return { view: "thread", threadId: params.get("thread") };
  let view = params.get("view");
  let filter = params.get("filter") || "";
  const legacy = LEGACY_VIEWS[view];
  if (legacy) {
    filter = filter || legacy.filter || "";
    view = legacy.view;
  }
  if (!VIEW_ORDER.includes(view)) view = "overview";
  if (!ARCHIVE_FILTERS.some(([key]) => key === filter)) filter = "";
  return { view, threadId: "", filter };
}

/* ---------- rail ---------- */

function renderRail() {
  const { room } = state;
  const viewerIsKelly = room.viewer === "kelly";
  const needsKelly = room.threads.filter((thread) => thread.needsKelly);
  const count = needsKelly.length;
  byId("needsKellyCount").textContent = String(count);
  byId("needsKellyLabel").textContent = viewerIsKelly
    ? (count === 1 ? "thing needs you" : "things need you")
    : (count === 1 ? "thing needs Kelly" : "things need Kelly");
  const queueButton = byId("needsKellyButton");
  queueButton.classList.toggle("has-items", count > 0);
  queueButton.classList.toggle("is-clear", state.loaded && count === 0);
  byId("needsKellyHint").textContent = count
    ? `Open the first one`
    : (state.loaded ? "All clear right now." : "Checking the desk.");

  // One attention signal: the gold Needs-you number above. The tabs stay quiet.
  const list = byId("agentList");
  // Kelly's own presence is the viewer chip; the list is the four agents she is waiting on.
  const listed = room.viewer === "kelly" ? KNOWN_AGENTS.filter(([id]) => id !== "kelly") : KNOWN_AGENTS;
  list.replaceChildren(...listed.map(([id, label]) => {
    const presence = agentPresence(room, id);
    const isViewer = id === room.viewer;
    return el("li", { class: "agent-row", "data-agent": id, "data-presence": presenceState(presence) }, [
      avatarNode(id),
      el("span", { class: "agent-text" }, [
        el("span", { class: "agent-name" }, [label, isViewer ? el("small", { text: " (you)" }) : el("small", { text: ` · ${AGENT_BIOS[id] || ""}` })]),
        el("span", { class: "agent-seen", text: presenceText(presence) }),
      ]),
    ]);
  }));
  byId("agentStack").replaceChildren(...WORKER_IDS.map((id) => avatarNode(id, "xs")));

  const connected = WORKER_IDS.filter((id) => agentPresence(room, id));
  byId("checkinCount").textContent = `${connected.length} of ${WORKER_IDS.length} checked in`;
  const activeNow = WORKER_IDS.filter((id) => presenceState(agentPresence(room, id)) === "now");
  byId("checkinCount").classList.toggle("is-active", activeNow.length > 0);
  const summaryText = state.loaded ? presenceSummary(room) : "Checking who has reached the room.";
  // The roster rows already say who is quiet; the note only adds who is missing.
  const missing = WORKER_IDS.filter((id) => !agentPresence(room, id));
  const anyActive = WORKER_IDS.some((id) => ["now", "today"].includes(presenceState(agentPresence(room, id))));
  byId("connectionSummary").textContent = !state.loaded || missing.length || !anyActive ? summaryText : "";
  byId("presenceLine").textContent = summaryText;
}

/* ---------- message rendering ---------- */

function messageVerb(message) {
  const people = listLabels(message.to, { you: true });
  switch (message.kind) {
    case "question": return `asked ${people}`;
    case "status": return `posted an update for ${people}`;
    case "decision": return "decided";
    case "alert": return `flagged something for ${people}`;
    case "receipt": return "finished some work";
    case "note": return `left a note for ${people}`;
    case "handoff": return `handed off to ${message.note?.nextOwner ? youOr(message.note.nextOwner) : people}`;
    default: return `to ${people}`;
  }
}

function kindTag(kind) {
  return el("span", { class: "kind-tag", "data-kind": kind, text: KIND_LABELS[kind] || kind });
}

function statusPill(thread) {
  const label = thread.status === "waiting"
    ? (needsViewer(thread) ? "needs you" : `waiting on ${listLabels(thread.waitingOn)}`)
    : thread.status === "resolved"
      ? "wrapped up"
      : thread.reopened ? "reopened" : "open";
  return el("span", { class: "status-pill", "data-status": thread.status, "data-needs-viewer": needsViewer(thread) ? "true" : undefined, text: label });
}

function fileChips(values) {
  return el("span", { class: "file-chips" }, [].concat(values || []).map((value) => el("span", { class: "file-chip", title: value, text: friendlyFileLabel(value) })));
}

function cardLine(label, value, { className = "", files = false } = {}) {
  if (!value || (Array.isArray(value) && !value.length)) return null;
  return el("div", { class: `card-line${className ? ` ${className}` : ""}` }, [
    el("dt", { text: label }),
    el("dd", {}, files ? [fileChips(value)] : [value]),
  ]);
}

function cardLines(lines) {
  const present = lines.filter(Boolean);
  return present.length ? el("dl", { class: "card-lines" }, present) : null;
}

function cardMore(lines, label = "Details") {
  const present = lines.filter(Boolean);
  if (!present.length) return null;
  return el("details", { class: "card-more" }, [el("summary", { text: label }), el("dl", { class: "card-lines" }, present)]);
}

function needsLabel() {
  return viewerIs("kelly") ? "Needs you" : "Needs Kelly";
}

function receiptBody(message, { calm = false } = {}) {
  const receipt = message.receipt || { project: "General", did: message.body };
  const nextOwnerLine = receipt.nextOwner ? `${youOr(receipt.nextOwner, { capital: true })} ${viewerIs(receipt.nextOwner) ? "are" : "is"} up next` : "";
  const nextText = [receipt.next, nextOwnerLine].filter(Boolean).join(" · ");
  return el("div", {}, [
    el("p", { class: "card-lead", text: receipt.did }),
    cardLines([
      cardLine(needsLabel(), receipt.needsKelly, { className: calm ? "needs quiet" : "needs" }),
      cardLine("What happened", receipt.result),
      cardLine("In the way", receipt.blockers, { className: "warn" }),
      cardLine("Next", nextText),
    ]),
    cardMore([
      cardLine("Project", receipt.project),
      cardLine("Files", receipt.outputs, { files: true }),
      cardLine("How it's going", receipt.health ? HEALTH_LABELS[receipt.health] : "", { className: `health-${receipt.health}` }),
    ]),
  ]);
}

function noteBody(message, { calm = false } = {}) {
  const note = message.note || { project: "General", summary: message.body, outputs: [] };
  // In the calm feed the sender line and waiting pill already name the next
  // owner, so the body skips the third mention.
  const nextOwnerLine = note.nextOwner && !calm ? `${youOr(note.nextOwner, { capital: true })} ${viewerIs(note.nextOwner) ? "are" : "is"} up next` : "";
  const nextText = [note.next, nextOwnerLine].filter(Boolean).join(" · ");
  const forViewer = note.nextOwner && viewerIs(note.nextOwner);
  return el("div", {}, [
    el("p", { class: "card-lead", text: note.summary }),
    cardLines([
      cardLine(note.nextOwner && !forViewer ? `For ${agentLabel(note.nextOwner)}` : (forViewer ? "For you" : "To do"), note.action, { className: forViewer ? "needs" : "" }),
      cardLine("Next", nextText),
    ]),
    cardMore([
      cardLine("Project", note.project),
      cardLine("Files", note.outputs, { files: true }),
      cardLine("Why it matters", note.why),
      cardLine("Written down", note.durablePath ? [note.durablePath] : "", { files: true }),
    ]),
  ]);
}

function messageBody(message, { calm = false } = {}) {
  if (message.kind === "receipt") return receiptBody(message, { calm });
  if (message.kind === "note" || message.kind === "handoff") return noteBody(message, { calm });
  const body = el("p", { class: "message-body", text: message.body });
  if (message.kind === "decision" && message.note?.durablePath) {
    return el("div", {}, [body, cardLines([cardLine("Written down", [message.note.durablePath], { files: true })])]);
  }
  return body;
}

function renderMessage(message, { inThread = false, previousId = "", calm = false, pinnedId = "", feed = false, reactions = null } = {}) {
  const thread = threadById(message.threadId);
  const labelId = `message-${message.seq}-label`;
  if (pinnedId && message.id === pinnedId) {
    return el("li", { class: "message-item message-stub", "data-agent": message.from, id: `message-${message.seq}` }, [
      avatarNode(message.from),
      el("article", { class: "message-content", "aria-labelledby": labelId }, [
        el("header", { class: "message-header" }, [
          el("strong", { id: labelId, class: "message-sender", text: agentLabel(message.from) }),
          el("span", { class: "message-route", text: `asked you this · pinned at the top` }),
          el("time", { class: "message-time", datetime: message.createdAt, text: formatTime(message.createdAt) }),
        ]),
        el("details", { class: "card-more" }, [el("summary", { text: "Show the full message" }), messageBody(message)]),
        el("footer", { class: "message-footer" }, [el("button", { class: "reply-button", type: "button", "data-reply": message.id, text: "Reply", "aria-label": `Reply to ${agentLabel(message.from)}` })]),
      ]),
    ]);
  }
  const item = el("li", {
    class: "message-item",
    "data-agent": message.from,
    "data-kind": message.kind,
    "data-new": isNew(message) ? "true" : undefined,
    "data-needs-kelly": !calm && message.kind === "receipt" && message.receipt?.needsKelly && thread?.needsKelly ? "true" : undefined,
    id: `message-${message.seq}`,
  });

  const header = el("header", { class: "message-header" }, [
    el("strong", { id: labelId, class: "message-sender", text: agentLabel(message.from) }),
    el("span", { class: "message-route", text: messageVerb(message) }),
    el("time", { class: "message-time", datetime: message.createdAt, text: formatTime(message.createdAt) }),
  ]);

  const parts = [header];
  if (message.replyTo && message.replyTo !== previousId) {
    const parent = messageById(message.replyTo);
    parts.push(el("p", { class: "reply-ref", text: parent
      ? `Replying to ${youOr(parent.from)}: "${messageExcerpt(parent, 90)}"`
      : "Replying to an earlier message" }));
  }
  parts.push(feed ? feedBody(message, { calm }) : messageBody(message, { calm }));

  const footer = el("footer", { class: "message-footer" });
  if (!inThread) {
    footer.append(el("button", {
      class: "thread-chip",
      type: "button",
      "data-open-thread": message.threadId,
      text: threadTitle(message.threadId),
      "aria-label": `Open the conversation ${threadTitle(message.threadId)}`,
    }));
  }

  if (message.waitingOn.length) {
    const later = state.room.messages.filter((candidate) => candidate.threadId === message.threadId && candidate.seq > message.seq);
    const answered = message.waitingOn.filter((agent) => later.some((candidate) => candidate.from === agent));
    const pending = message.waitingOn.filter((agent) => !answered.includes(agent));
    const stillWaiting = thread && thread.status !== "resolved" ? pending.filter((agent) => thread.waitingOn.includes(agent)) : [];
    const cleared = pending.filter((agent) => !stillWaiting.includes(agent));
    if (answered.length) footer.append(el("span", { class: "waiting-pill answered", text: `${listLabels(answered, { you: true })} answered` }));
    if (stillWaiting.length && !(calm && stillWaiting.includes(state.room.viewer))) footer.append(el("span", { class: `waiting-pill${stillWaiting.includes(state.room.viewer) ? " mine" : ""}`, text: stillWaiting.includes(state.room.viewer) ? "needs you" : `waiting on ${listLabels(stillWaiting)}` }));
    if (cleared.length) footer.append(el("span", { class: "waiting-pill cleared", text: `asked ${listLabels(cleared)}, ${thread?.status === "resolved" ? "wrapped up" : "moved on"}` }));
  }
  if (message.thread?.status === "resolved") footer.append(el("span", { class: "state-pill resolved", text: "wrapped up" }));
  if (message.thread?.status === "reopened") footer.append(el("span", { class: "state-pill", text: "reopened" }));
  const owesViewer = thread && needsViewer(thread) && message.waitingOn.includes(state.room.viewer) && askMessage(thread)?.id === message.id;
  footer.append(el("button", {
    class: `reply-button${owesViewer && !inThread ? (calm ? " outlined" : " primary") : ""}`,
    type: "button",
    "data-reply": message.id,
    text: owesViewer && !inThread ? "Answer" : "Reply",
    "aria-label": `Reply to ${agentLabel(message.from)}`,
  }));
  parts.push(footer);
  if (reactions) {
    const row = reactionRow(message, reactions);
    if (row) parts.push(row);
  }

  item.append(avatarNode(message.from), el("article", { class: "message-content", "aria-labelledby": labelId }, parts));
  return item;
}

function messageList(messages, options = {}) {
  if (!messages.length) return emptyState(options.empty || "Nothing here yet.");
  const nodes = [];
  let dividerPlaced = false;
  let previous = null;
  for (const message of messages) {
    if (options.newDivider && !dividerPlaced && isNew(message)) {
      nodes.push(el("li", { class: "new-divider", text: "New since you last looked" }));
      dividerPlaced = true;
    }
    nodes.push(renderMessage(message, { ...options, previousId: previous?.id }));
    previous = message;
  }
  return el("ol", { class: "message-feed", "aria-label": options.label || "Messages" }, nodes);
}

function emptyState(text, hint = "", { tone = "" } = {}) {
  return el("div", { class: `empty-state${tone ? ` ${tone}` : ""}` }, [el("p", { text }), hint ? el("p", { class: "empty-hint", text: hint }) : null]);
}

/* ---------- thread rows ---------- */

function threadRow(thread) {
  const meta = [];
  meta.push(plural(thread.count, "message"));
  if (thread.status === "resolved") meta.push(`wrapped up ${relativeTime(thread.resolvedAt)} by ${youOr(thread.resolvedBy)}`);
  else meta.push(`last from ${youOr(thread.lastFrom)} ${relativeTime(thread.lastAt)}`);
  if (thread.nextOwner && thread.status !== "resolved" && !thread.waitingOn.includes(thread.nextOwner)) meta.push(`${youOr(thread.nextOwner, { capital: true })} ${viewerIs(thread.nextOwner) ? "are" : "is"} up next`);
  if (thread.project) meta.push(thread.project);
  const unread = thread.status !== "resolved" ? thread.unread : 0;
  const people = [thread.lastFrom, ...thread.participants.filter((agent) => agent !== thread.lastFrom)];
  return el("li", { class: "thread-row", "data-status": thread.status, "data-unread": unread ? "true" : undefined }, [
    el("button", { class: "thread-open", type: "button", "data-open-thread": thread.id, "aria-label": `Open ${thread.title}${unread ? `, ${plural(unread, "new message")}` : ""}` }, [
      el("span", { class: "thread-row-top" }, [
        el("span", { class: "thread-title", text: thread.title }),
        unread ? el("span", { class: "new-pill", text: `${unread} new` }) : null,
        (thread.status === "open" && !thread.reopened) || (thread.status === "resolved" && state.view === "resolved") ? null : statusPill(thread),
      ]),
      el("span", { class: "thread-participants", "aria-hidden": "true" }, [
        ...people.map((agent) => avatarNode(agent, "sm")),
        people.length > 1 ? el("span", { class: "more-count", text: `+${people.length - 1}` }) : null,
      ]),
      el("span", { class: "thread-row-meta", text: meta.join(" · ") }),
    ]),
  ]);
}

function threadList(threads, empty, hint = "") {
  if (!threads.length) return emptyState(empty, hint);
  return el("ul", { class: "thread-list" }, threads.map(threadRow));
}

/* ---------- views ---------- */

function sectionBlock(title, meta, content, { tone = "" } = {}) {
  const id = `section-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return el("section", { class: `desk-section${tone ? ` ${tone}` : ""}`, "aria-labelledby": id }, [
    el("div", { class: "desk-section-head" }, [
      el("h2", { id, text: title }),
      meta ? el("span", { class: "desk-section-meta", text: meta }) : null,
    ]),
    content,
  ]);
}

function actionLabel(item) {
  if (item.reason === "waiting-on-you") return "Answer";
  if (item.reason === "handed-to-you") return "Pick it up";
  return "Open";
}

function queueItem(item, index = 0, { quiet = false } = {}) {
  const message = state.room.messages.find((candidate) => candidate.seq === item.seq);
  const excerpt = message?.kind === "receipt" && message.receipt?.needsKelly
    ? message.receipt.needsKelly
    : message?.note?.action || (message ? messageExcerpt(message) : "");
  const metaParts = [relativeTime(item.createdAt)];
  const project = message?.receipt?.project || message?.note?.project;
  if (project && !item.threadTitle.toLowerCase().includes(project.toLowerCase())) metaParts.push(project);
  const handedElsewhere = message?.kind === "handoff" && message.note?.nextOwner && message.note.nextOwner !== state.room.viewer;
  const headline = handedElsewhere ? `${agentLabel(item.from)} copied you on a handoff to ${agentLabel(message.note.nextOwner)}` : excerpt;
  const byline = [agentLabel(item.from), item.threadTitle, ...metaParts];
  const then = item.actionable && message?.kind === "receipt" && message.receipt?.next ? message.receipt.next : "";
  return el("li", { class: `queue-item${quiet ? " quiet" : ""}`, "data-agent": item.from, "data-unread": item.unread ? "true" : undefined }, [
    avatarNode(item.from, quiet ? "sm" : "lg"),
    el("div", { class: "queue-text" }, [
      el("div", { class: "queue-top" }, [
        quiet ? null : el("span", { class: "reason-tag", "data-reason": item.reason, text: item.reasonLabel }),
        el("strong", { text: headline }),
        ["question", "alert"].includes(item.kind) ? kindTag(item.kind) : null,
      ]),
      handedElsewhere && excerpt ? el("p", { class: "queue-excerpt", text: excerpt }) : null,
      then ? el("p", { class: "queue-next" }, [el("b", { text: "Next" }), then]) : null,
      el("span", { class: "queue-meta", text: byline.join(" · ") }),
    ]),
    el("button", {
      class: `open-button${item.actionable && index === 0 ? " primary" : ""}`,
      type: "button",
      "data-open-thread": item.threadId,
      "data-focus-seq": item.seq,
      "data-reply-seq": item.actionable ? item.seq : undefined,
      text: actionLabel(item),
      "aria-label": `${actionLabel(item)}: ${item.threadTitle}`,
    }),
  ]);
}

function receiptRow(message) {
  const receipt = message.receipt || { project: "General", did: message.body, outputs: [] };
  const thread = threadById(message.threadId);
  const meta = [relativeTime(message.createdAt)];
  if (receipt.project && !threadTitle(message.threadId).toLowerCase().includes(receipt.project.toLowerCase())) meta.push(receipt.project);
  if (receipt.outputs?.length) meta.push(plural(receipt.outputs.length, "attachment"));
  return el("li", { class: "receipt-row", "data-agent": message.from }, [
    avatarNode(message.from, "sm"),
    el("div", { class: "receipt-text" }, [
      el("p", { class: "receipt-line" }, [el("b", { text: agentLabel(message.from) }), ` ${firstLine(receipt.did, 140).replace(/^[A-Z]/, (letter) => letter.toLowerCase())}`]),
      el("span", { class: "receipt-meta" }, [
        meta.join(" · "),
        receipt.health && !thread?.needsKelly ? el("span", { class: `health-pill health-${receipt.health}`, text: HEALTH_LABELS[receipt.health] }) : null,

      ]),
    ]),
    el("button", { class: "open-button", type: "button", "data-open-thread": message.threadId, "data-focus-seq": message.seq, text: "Open", "aria-label": `Open ${receipt.project}` }),
  ]);
}

function renderOverview() {
  const { room } = state;
  const viewerIsKelly = room.viewer === "kelly";
  const queue = room.inbox.filter((item) => item.actionable);
  const allReceipts = room.messages.filter((message) => message.kind === "receipt");
  const receipts = allReceipts.slice(-4).reverse();
  const active = sortThreads(room.threads.filter((thread) => thread.status !== "resolved"));
  const waitingViewer = active.filter((thread) => needsViewer(thread)).length;
  const waitingOthers = active.filter((thread) => thread.status === "waiting" && !needsViewer(thread)).length;
  const quiet = active.length - waitingViewer - waitingOthers;
  const conversationMeta = [
    waitingViewer ? `${waitingViewer} need${waitingViewer === 1 ? "s" : ""} ${viewerIsKelly ? "you" : "Kelly"}` : "",
    waitingOthers ? `${waitingOthers} waiting on the agents` : "",
    quiet ? `${quiet} quiet` : "",
  ].filter(Boolean).join(" · ");

  const strip = el("div", { class: "mobile-presence", "aria-label": "Who is here" }, [
    el("span", { class: "mobile-presence-avatars" }, WORKER_IDS.map((id) => el("span", { class: "mobile-presence-seat", "data-presence": presenceState(agentPresence(room, id)) }, [avatarNode(id, "sm")]))),
    el("span", { class: "mobile-presence-text", text: presenceSummary(room) }),
    viewerIsKelly ? el("button", { class: "wake-bell-mini", type: "button", "data-ring-bell": "true", title: "Wake the team", "aria-label": "Wake the team" }, [el("img", { src: "/assets/bell.png", alt: "" })]) : null,
    el("button", { class: "wake-bell-mini guide-mini", type: "button", "data-open-guide": "true", title: "How this desk works", "aria-label": "How this desk works", text: "?" }),
  ]);
  const showGuide = state.guideOpen || !guideDismissed();

  const needsBlock = sectionBlock(
      viewerIsKelly ? "Needs you" : `Needs ${agentLabel(room.viewer)}`,
      "",
      queue.length
        ? el("ul", { class: "queue-list" }, queue.map((item, index) => queueItem(item, index)))
        : emptyState(allClearLine(), "When someone needs an answer, a decision, or hands you work, it shows up here first.", { tone: "all-clear" }),
      { tone: queue.length ? "tone-needs" : "" },
    );
  const fyi = room.inbox.filter((item) => !item.actionable);
  const fyiBlock = fyi.length
    ? sectionBlock("For your information", "", el("ul", { class: "queue-list quiet-list" }, fyi.map((item) => queueItem(item, 1, { quiet: true }))))
    : null;
  const conversationsBlock = sectionBlock(
      "Conversations",
      active.length ? conversationMeta : "",
      threadList(active, "No open conversations.", "Start one from the box below."),
    );
  const finishedBlock = sectionBlock(
      "Finished recently",
      receipts.length && allReceipts.length > receipts.length ? `latest ${receipts.length} of ${allReceipts.length}` : "",
      receipts.length ? el("ul", { class: "receipt-list" }, receipts.map(receiptRow)) : emptyState("Nothing finished yet.", "Each agent leaves a short write-up after finishing a piece of work."),
    );
  return [
    strip,
    showGuide ? deskGuide() : null,
    el("div", { class: "overview-grid" }, [
      el("div", { class: "overview-main" }, [
        Object.assign(needsBlock, { style: "order:1" }),
        fyiBlock ? Object.assign(fyiBlock, { style: "order:3" }) : null,
        Object.assign(conversationsBlock, { style: "order:4" }),
      ].filter(Boolean)),
      el("div", { class: "overview-side" }, [Object.assign(finishedBlock, { style: "order:2" })]),
    ]),
  ].filter(Boolean);
}

/* ---------- how this desk works ---------- */

const GUIDE_KEY = "acGuideDismissed";

function guideDismissed() {
  try { return localStorage.getItem(GUIDE_KEY) === "true"; } catch { return true; }
}

function deskGuide() {
  const lines = [
    ["😴", "The agents aren't online all day. Each one wakes up, reads everything at once, answers what's waiting on it, and goes back to sleep."],
    ["🔔", "The bell puts a note at the top of every agent's inbox. They answer it the next time they wake, and the bell thread shows who has."],
    ["🗂", "Board: every open conversation is a card on the plate of whoever owes the next move. Pass a card to hand work over."],
    ["🎪", "Feed: the day's activity and banter, newest first. Reply with one emoji and it becomes a sticker."],
    ["📚", "Archive: the whole record, never deleted. Pick a shelf."],
    ["🟢", "The dots: solid green means here in the last hour, a ring means earlier today, amber means not connected yet."],
  ];
  return el("section", { class: "desk-guide", "aria-label": "How this desk works" }, [
    el("h2", { text: "How this desk works" }),
    el("ul", {}, lines.map(([icon, text]) => el("li", {}, [el("span", { class: "guide-icon", "aria-hidden": "true", text: icon }), text]))),
    el("button", { class: "primary-button", type: "button", "data-close-guide": "true", text: "Got it" }),
  ]);
}

/* ---------- the archive ---------- */

function renderArchive() {
  const chips = el("div", { class: "archive-chips", role: "group", "aria-label": "Archive shelves" }, ARCHIVE_FILTERS.map(([key, label]) => el("button", {
    class: `archive-chip${state.archiveFilter === key ? " active" : ""}`,
    type: "button",
    "data-archive-filter": key,
    "aria-pressed": state.archiveFilter === key ? "true" : "false",
    text: label,
  })));
  let blocks;
  switch (state.archiveFilter) {
    case "receipts": blocks = renderFiltered((message) => message.kind === "receipt", "Nothing finished yet.", "Finished work", "Each agent leaves a short write-up after finishing a piece of work.", { calm: true }).map((node) => reverseFeed(node)); break;
    case "notes": blocks = renderFiltered((message) => ["note", "handoff"].includes(message.kind), "No notes or handoffs yet.", "Notes and handoffs", "They show up here when someone leaves context or passes work along.").map((node) => reverseFeed(node)); break;
    case "decisions": blocks = renderFiltered((message) => message.kind === "decision", "No decisions recorded yet.", "Decisions", "Post a decision from the box below and it lands here.").map((node) => reverseFeed(node)); break;
    case "resolved": blocks = renderResolved(); break;
    default: blocks = renderFiltered(() => true, "The desk is quiet.", "Everything", "Say hello from the box below.", { newDivider: true });
  }
  return [chips, ...blocks];
}

function renderResolved() {
  const resolved = [...state.room.threads.filter((thread) => thread.status === "resolved")].sort((left, right) => right.resolvedSeq - left.resolvedSeq);
  return [threadList(resolved, "Nothing is wrapped up yet.", "Wrapping up a conversation keeps its history and clears it from the active lists.")];
}

/* ---------- the board ---------- */

function passMenu(thread) {
  const owner = boardOwner(thread);
  const seats = KNOWN_AGENTS.filter(([id]) => id !== owner);
  return el("details", { class: "board-pass" }, [
    el("summary", { "aria-label": `Pass ${thread.title} to someone` }, ["Pass to"]),
    el("div", { class: "board-pass-menu" }, seats.map(([id, label]) => el("button", {
      class: "board-pass-option",
      type: "button",
      "data-pass-thread": thread.id,
      "data-pass-to": id,
    }, [avatarNode(id, "xs"), viewerIs(id) ? "Me" : label]))),
  ]);
}

function boardCard(thread, lastByThread) {
  const done = thread.status === "resolved";
  const last = lastByThread.get(thread.id);
  const metaParts = [];
  if (done) metaParts.push(`wrapped up ${relativeTime(thread.resolvedAt)}`);
  else metaParts.push(`last from ${youOr(thread.lastFrom)} ${relativeTime(thread.lastAt)}`);
  if (thread.project && !thread.title.toLowerCase().includes(thread.project.toLowerCase())) metaParts.push(thread.project);
  // The column already says whose plate this is; a pill repeats it only
  // when the wait points somewhere else.
  const ownColumn = boardOwner(thread) === state.room.viewer;
  const foot = done ? null : el("div", { class: "board-card-foot" }, [
    passMenu(thread),
    thread.unread ? el("span", { class: "new-pill", text: `${thread.unread} new` }) : null,
    thread.status === "waiting" && !(ownColumn && needsViewer(thread)) ? statusPill(thread) : null,
  ]);
  return el("article", {
    class: "board-card",
    "data-needs-viewer": !done && needsViewer(thread) ? "true" : undefined,
    "data-done": done ? "true" : undefined,
  }, [
    el("button", { class: "board-card-title", type: "button", "data-open-thread": thread.id, text: thread.title, "aria-label": `Open ${thread.title}` }),
    last ? el("p", { class: "board-card-excerpt", text: messageExcerpt(last, 110) }) : null,
    el("p", { class: "board-card-meta", text: metaParts.join(" · ") }),
    foot,
  ]);
}

function boardColumn(name, id, threads, lastByThread, emptyText) {
  const head = el("div", { class: "board-column-head" }, [
    BOARD_SEATS.includes(id) ? avatarNode(id, "sm") : null,
    el("h2", { class: "board-column-name", text: viewerIs(id) ? `${name} (you)` : name }),
    threads.length ? el("span", { class: "board-count", text: String(threads.length) }) : null,
  ]);
  return el("section", {
    class: "board-column",
    "data-column": id,
    "data-has-cards": threads.length ? "true" : undefined,
    "aria-label": name,
  }, [
    head,
    ...(threads.length ? threads.map((thread) => boardCard(thread, lastByThread)) : (emptyText ? [el("p", { class: "board-empty", text: emptyText })] : [])),
  ]);
}

function renderBoard() {
  const board = deriveBoard(state.room.threads, { viewer: state.room.viewer });
  const lastByThread = new Map();
  for (const message of state.room.messages) {
    if (!isReactionMessage(message)) lastByThread.set(message.threadId, message);
  }
  const bar = el("div", { class: "board-bar" }, [
    el("button", { class: "primary-button", type: "button", "data-new-task": "true", text: "Give someone a task" }),
  ]);
  const columns = board.columns.map((column) => boardColumn(
    agentLabel(column.id),
    column.id,
    column.threads,
    lastByThread,
    viewerIs(column.id) ? "Nothing on your plate." : `Nothing on ${agentLabel(column.id)}'s plate.`,
  ));
  if (board.unassigned.length) columns.push(boardColumn("Up for grabs", "up-for-grabs", board.unassigned, lastByThread, ""));
  const doneColumn = boardColumn("Wrapped up", "done", board.done, lastByThread, "Nothing wrapped up yet.");
  if (board.doneTotal > board.done.length) {
    doneColumn.append(el("button", { class: "text-link-button board-done-more", type: "button", "data-goto-view": "resolved", text: `See all ${board.doneTotal} wrapped up` }));
  }
  columns.push(doneColumn);
  return [bar, el("div", { class: "board", "aria-label": "The board" }, columns)];
}

/* ---------- the feed ---------- */

function dayLabel(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Sometime";
  const startOf = (input) => new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(date)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(date);
}

function reactionRow(message, reactions) {
  const viewer = state.room.viewer;
  const list = reactions.get(message.id) || [];
  const thread = threadById(message.threadId);
  const isAsk = thread && needsViewer(thread) && askMessage(thread)?.id === message.id;
  // The message that needs your answer gets a real reply, not a sticker.
  const canReact = message.from !== viewer && !isAsk;
  const summary = reactionSummary(list);
  if (!summary.length && !canReact) return null;
  const chips = summary.map(({ emoji, count, agents }) => {
    const mine = hasReacted(list, viewer, emoji);
    return el("button", {
      class: `react-chip${mine ? " mine" : ""}`,
      type: "button",
      "data-react-to": message.id,
      "data-react": emoji,
      disabled: mine || !canReact ? true : undefined,
      title: listLabels(agents, { you: true }),
      "aria-label": `${emoji} from ${listLabels(agents, { you: true })}`,
      text: `${emoji} ${count}`,
    });
  });
  const add = canReact ? el("details", { class: "react-add" }, [
    el("summary", { title: "React", "aria-label": `React to ${agentLabel(message.from)}` }, ["+"]),
    el("div", { class: "react-add-menu" }, REACTION_EMOJI.map((emoji) => el("button", {
      class: "react-option",
      type: "button",
      "data-react-to": message.id,
      "data-react": emoji,
      disabled: hasReacted(list, viewer, emoji) ? true : undefined,
      "aria-label": `React with ${emoji}`,
      text: emoji,
    }))),
  ]) : null;
  return el("div", { class: "react-row" }, [...chips, add]);
}

function feedBody(message, options = {}) {
  const plain = ["message", "question", "status", "alert"].includes(message.kind) && !message.note;
  const body = String(message.body || "");
  if (!plain || (body.length <= 340 && body.split("\n").length <= 5)) return messageBody(message, options);
  return el("div", {}, [
    el("p", { class: "message-body", text: `${firstLine(body, 220)}` }),
    el("details", { class: "card-more feed-fold" }, [
      el("summary", { text: "Read the rest" }),
      el("p", { class: "message-body", text: body }),
    ]),
  ]);
}

function renderFeed() {
  const reactions = collectReactions(state.room.messages);
  const items = state.room.messages.filter((message) => !isReactionMessage(message));
  if (!items.length) return [emptyState("The desk is quiet.", "Once the team gets moving, the day lands here newest first.")];
  const nodes = [];
  let lastDay = "";
  for (const message of [...items].reverse()) {
    const day = dayLabel(message.createdAt);
    if (day !== lastDay) {
      nodes.push(el("li", { class: "feed-day", text: day }));
      lastDay = day;
    }
    nodes.push(renderMessage(message, { reactions, feed: true, calm: true }));
  }
  return [el("ol", { class: "message-feed feed-list", "aria-label": "Team feed" }, nodes)];
}

function renderFiltered(predicate, empty, label, hint = "", options = {}) {
  const messages = state.room.messages.filter(predicate);
  return [messages.length ? messageList(messages, { label, ...options }) : emptyState(empty, hint)];
}

function renderThreadView() {
  const thread = threadById(state.threadId);
  if (!thread) return [emptyState("That conversation does not exist yet.", "Start it from the box below and it will appear here.")];
  const reactions = collectReactions(state.room.messages);
  const messages = state.room.messages.filter((message) => message.threadId === thread.id && !isReactionMessage(message));
  const ask = askMessage(thread);
  const latestWaiting = thread.status === "waiting" && !ask
    ? [...messages].reverse().find((message) => message.waitingOn.some((agent) => thread.waitingOn.includes(agent)))
    : null;

  const facts = [];
  if (thread.status === "resolved") facts.push(["Wrapped up", `by ${youOr(thread.resolvedBy)} ${relativeTime(thread.resolvedAt)}`]);
  if (thread.nextOwner && thread.status !== "resolved" && !thread.waitingOn.includes(thread.nextOwner)) facts.push(["Up next", youOr(thread.nextOwner)]);
  if (!ask) {
    if (thread.project && thread.project !== thread.title) facts.push(["Project", thread.project]);
    facts.push(["With", listLabels(thread.participants, { you: true })]);
    facts.push(["Started", `by ${youOr(thread.firstFrom)} ${formatTime(thread.firstAt)}`]);
  }

  const askLine = ask
    ? el("div", { class: "thread-ask-row" }, [avatarNode(ask.from), el("p", { class: "thread-ask" }, [el("b", { text: `${agentLabel(ask.from)} needs ${viewerIs("kelly") ? "you" : "Kelly"}` }), el("br"), askText(ask)])])
    : latestWaiting
      ? el("p", { class: "thread-ask" }, [el("b", { text: `${youOr(latestWaiting.from, { capital: true })} asked ${listLabels(latestWaiting.waitingOn.filter((agent) => thread.waitingOn.includes(agent)), { you: true })}` }), el("br"), askText(latestWaiting)])
      : null;

  const target = ask || messages.at(-1);
  const chips = ask ? DECISION_REPLIES : QUICK_REPLIES;
  const canQuick = target && target.from !== state.room.viewer && thread.status !== "resolved";
  const actions = el("div", { class: "thread-actions" }, [
    ...(canQuick ? chips.map(([label, text], index) => el("button", {
      class: `quiet-button quick-reply${ask && index === 0 ? " primary" : ""}`,
      type: "button",
      "data-quick-reply": target.id,
      "data-quick-text": text,
      text: label,
    })) : []),
    ask
      ? el("button", { class: "text-link-button write-reply", type: "button", "data-reply": ask.id, text: "or write your own" })
      : null,
    thread.status === "resolved"
      ? el("button", { class: "quiet-button", type: "button", "data-thread-action": "reopened", text: "Reopen" })
      : null,
  ]);
  const actionsHint = canQuick ? el("p", { class: "thread-actions-hint", text: "A quick answer fills in the box below so you can add a line before it goes." }) : null;

  // Everything Kelly needs to decide, pinned: result, what happens next, attachments.
  const askDetails = ask ? cardLines([
    ask.receipt?.next ? cardLine("Next", ask.receipt.next) : null,
    ask.note?.why ? cardLine("Why", ask.note.why) : null,
    (ask.receipt?.outputs?.length || ask.note?.outputs?.length) ? cardLine("Files", ask.receipt?.outputs || ask.note?.outputs, { files: true }) : null,
  ]) : null;
  const askMore = ask ? cardMore([
    ask.receipt?.did && ask.receipt.did !== askText(ask) ? cardLine("They did", ask.receipt.did) : null,
    ask.note?.summary && ask.note.summary !== askText(ask) ? cardLine("They wrote", ask.note.summary) : null,
    ask.receipt?.result ? cardLine("What happened", ask.receipt.result) : null,
    thread.project && thread.project !== thread.title ? cardLine("Project", thread.project) : null,
    cardLine("With", listLabels(thread.participants, { you: true })),
  ]) : null;

  const head = el("div", { class: "thread-head", "data-status": thread.status }, [
    el("div", { class: "thread-head-top" }, [statusPill(thread), ask ? el("span", { class: "thread-asked", text: `asked ${formatTime(ask.createdAt)}` }) : null]),
    askLine,
    askDetails,
    actions,
    actionsHint,
    askMore,
    facts.length ? el("dl", { class: "thread-facts" }, facts.map(([term, detail]) => el("div", {}, [el("dt", { text: term }), el("dd", { text: detail })]))) : null,
  ]);
  return [head, messageList(messages, { inThread: true, newDivider: true, pinnedId: ask?.id || "", reactions, label: `Messages in ${thread.title}` })];
}

function renderOverviewHeader() {
  const { room } = state;
  const viewerIsKelly = room.viewer === "kelly";
  byId("viewEyebrow").textContent = todayLabel();
  byId("viewHeading").textContent = state.loaded ? greeting(agentLabel(room.viewer)) : "Opening the desk";
  const meaning = byId("viewMeaning");
  meaning.hidden = false;
  if (!state.loaded) { meaning.replaceChildren(); return; }
  const queue = room.inbox.filter((item) => item.actionable);
  const newCount = room.messages.filter(isNew).length;
  const parts = [];
  if (!queue.length) parts.push(el("span", { class: "meaning-quiet", text: `Nothing needs ${viewerIsKelly ? "you" : "Kelly"}. ` }));
  parts.push(el("span", { class: "meaning-presence", text: presenceSummary(room) }));
  if (newCount) {
    parts.push(" ");
    parts.push(el("button", { class: "text-link-button", type: "button", "data-jump-new": "true", text: `${plural(newCount, "new message")} since you last looked.` }));
  }
  meaning.replaceChildren(...parts);
}

function renderWorkspace({ force = false } = {}) {
  const key = `${state.view}:${state.threadId}:${state.archiveFilter}:${state.room.revision}:${state.previousCursor}:${state.loaded}`;
  if (!force && key === state.lastRenderKey) return;
  state.lastRenderKey = key;

  const body = byId("workspaceBody");
  const scrollTop = body.scrollTop;
  const meta = state.view === "thread" ? { ...VIEWS.thread, title: threadTitle(state.threadId) } : VIEWS[state.view];
  const back = byId("backButton");
  back.hidden = state.view !== "thread";
  back.textContent = `← ${VIEWS[state.previousView].eyebrow}`;
  const wrap = byId("wrapButton");
  const current = state.view === "thread" ? threadById(state.threadId) : null;
  wrap.hidden = !current || current.status === "resolved" || needsViewer(current);
  if (state.view === "overview") {
    renderOverviewHeader();
  } else {
    byId("viewEyebrow").textContent = meta.eyebrow;
    byId("viewHeading").textContent = meta.title;
    byId("viewMeaning").textContent = state.view === "thread" ? "" : meta.meaning;
    byId("viewMeaning").hidden = state.view === "thread";
  }
  const needsCount = state.room.threads.filter((thread) => thread.needsKelly).length;
  const titlePrefix = needsCount && state.room.viewer === "kelly" ? `(${needsCount}) ` : "";
  document.title = state.view === "thread" ? `${titlePrefix}${meta.title} · Agent Commons` : `${titlePrefix}${meta.eyebrow} · Agent Commons`;

  const newCount = state.room.messages.filter(isNew).length;
  const jump = byId("newSinceLabel");
  jump.hidden = !(state.view === "archive" && state.archiveFilter === "all" && newCount);
  jump.textContent = newCount ? `${plural(newCount, "new message")} · jump there` : "";

  let blocks;
  switch (state.view) {
    case "overview": blocks = renderOverview(); break;
    case "board": blocks = renderBoard(); break;
    case "feed": blocks = renderFeed(); break;
    case "archive": blocks = renderArchive(); break;
    case "thread": blocks = renderThreadView(); break;
    default: blocks = renderOverview();
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
  updateComposerMode();
}

/* ---------- composer ---------- */

function setComposerOpen(open, { focus = false } = {}) {
  const panel = byId("composerPanel");
  const expander = byId("composerExpander");
  panel.hidden = !open;
  expander.hidden = open;
  expander.setAttribute("aria-expanded", String(open));
  byId("messageForm").classList.toggle("is-open", open);
  document.body.classList.toggle("composer-open", open && mobileQuery.matches);
  document.body.classList.toggle("composer-open-desktop", open && !mobileQuery.matches);
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
    ...active.map((thread) => el("option", { value: thread.id, text: `${thread.title}${thread.status === "resolved" ? " (wrapped up)" : ""}` })),
    el("option", { value: "__new", text: "New conversation" }),
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
  const recipient = byId("recipientSelect").value;
  const structured = ["note", "handoff", "receipt", "decision", "question"].includes(kind);
  const fields = byId("structuredFields");
  fields.hidden = !structured;
  fields.querySelectorAll("[data-for]").forEach((field) => {
    field.hidden = !field.dataset.for.split(" ").includes(kind);
  });
  // A receipt from Kelly cannot need Kelly.
  if (kind === "receipt" && viewerIs("kelly")) byId("needsKellyField").hidden = true;
  const more = byId("composerMore");
  more.hidden = ![...more.querySelectorAll("[data-for]")].some((field) => !field.hidden);
  byId("structuredLegend").textContent = {
    note: "Note details",
    handoff: "Handoff details",
    receipt: "About the work",
    decision: "Decision details",
    question: "Question details",
  }[kind] || "Details";
  byId("bodyLabel").textContent = {
    message: "Message",
    question: "Your question",
    decision: "The decision",
    note: "Summary",
    handoff: "Summary for whoever picks it up",
    receipt: "What you did",
    status: "Quick update",
    alert: "Heads up",
  }[kind];
  byId("nextOwnerLabel").textContent = kind === "question" ? "Who should answer" : "Who picks it up next";
  byId("waitingToggleLabel").hidden = !["message", "status", "alert"].includes(kind) || recipient === "all" || Boolean(state.replyTo);
  byId("resolveToggleLabel").hidden = kind !== "decision";
  const target = recipient === "all" ? "everyone" : agentLabel(recipient);
  byId("sendButton").textContent = {
    message: `Send to ${target}`,
    question: `Ask ${target}`,
    decision: "Record decision",
    note: "Leave note",
    handoff: `Hand off to ${target}`,
    receipt: "Post finished work",
    status: `Send to ${target}`,
    alert: `Send heads up to ${target}`,
  }[kind];
  byId("composerTip").textContent = kind === "receipt" ? "⌘ Enter posts" : "⌘ Enter sends";
  if (["receipt", "note", "handoff"].includes(kind) && !byId("projectInput").value) {
    const current = threadById(byId("threadSelect").value);
    if (current?.project) byId("projectInput").value = current.project;
  }
  if (kind === "question" && !byId("nextOwnerSelect").value && recipient !== "all") byId("nextOwnerSelect").value = recipient;
  if (kind === "handoff" && !byId("nextOwnerSelect").value && recipient !== "all") byId("nextOwnerSelect").value = recipient;
  byId("replyContext").hidden = !state.replyTo;
  const title = state.replyTo
    ? `Reply to ${agentLabel(state.replyTo.from)}`
    : state.view === "thread" && state.threadId
      ? `Reply in ${threadTitle(state.threadId)}`
      : "Write to everyone";
  byId("composerExpanderText").textContent = state.view === "thread" && state.threadId ? "Reply here" : "Write to everyone";
  byId("composerTitle").textContent = title;
  const summaryOn = Boolean(state.replyTo) && !state.composerRowOpen;
  byId("composerSummary").hidden = !summaryOn;
  byId("composerRow").hidden = summaryOn;
  if (summaryOn) {
    const kindLabel = (byId("kindSelect").selectedOptions[0]?.textContent || "Message").replace(" that needs an answer", "");
    byId("composerSummaryText").textContent = kind === "message"
      ? `Goes to ${target} in ${threadTitle(byId("threadSelect").value) || "General"}`
      : `Goes to ${target} in ${threadTitle(byId("threadSelect").value) || "General"} as ${kindLabel.toLowerCase()}`;
  }
}

function renderComposerChips(message) {
  const host = byId("composerChips");
  const thread = message ? threadById(message.threadId) : null;
  const isAsk = message && thread && askMessage(thread)?.id === message.id;
  const chips = message && message.from !== state.room.viewer ? (isAsk ? DECISION_REPLIES : QUICK_REPLIES) : [];
  host.hidden = !chips.length;
  host.replaceChildren(...chips.map(([label, text]) => el("button", { class: "quick-reply", type: "button", "data-chip-text": text, text: label })));
}

function startReply(messageId, { prefill = "" } = {}) {
  const message = messageById(messageId);
  if (!message) return;
  state.replyTo = { id: message.id, seq: message.seq, from: message.from, threadId: message.threadId };
  state.composerRowOpen = false;
  const select = byId("threadSelect");
  if ([...select.options].some((option) => option.value === message.threadId)) select.value = message.threadId;
  byId("titleField").hidden = true;
  byId("replyContextText").textContent = `Replying to ${agentLabel(message.from)}: "${firstLine(askText(message), 120)}"`;
  byId("replyContext").hidden = false;
  if (message.from !== state.room.viewer) byId("recipientSelect").value = message.from;
  updateComposerMode();
  renderComposerChips(message);
  setComposerOpen(true);
  const input = byId("messageInput");
  if (prefill && !input.value.trim()) input.value = prefill;
  input.focus();
  if (prefill) input.setSelectionRange(input.value.length, input.value.length);
  announce(`Replying to ${agentLabel(message.from)} in ${threadTitle(message.threadId)}`);
}

function cancelReply() {
  state.replyTo = null;
  state.composerRowOpen = false;
  byId("replyContext").hidden = true;
  renderComposerChips(null);
  updateComposerMode();
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
    const more = field.closest("details");
    if (more) more.open = true;
  }
}

function composerPayload() {
  const kind = byId("kindSelect").value;
  const body = expandShortcuts(byId("messageInput").value).trim();
  const recipient = byId("recipientSelect").value;
  let threadId = byId("threadSelect").value;
  const title = byId("titleInput").value.trim();
  const payload = { body, to: [recipient], kind, waitingOn: [], threadId, clientId: `${state.room.viewer}-web-${crypto.randomUUID()}` };
  const thread = {};

  if (threadId === "__new") {
    if (!title) return { error: "Give the new conversation a short name so everyone can find it.", focus: "titleInput" };
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
    if (kind === "handoff" && !nextOwner) return { error: "Say who picks this up next.", focus: "nextOwnerSelect" };
    payload.note = {
      project: byId("projectInput").value.trim() || "General",
      summary: body,
      outputs,
      why: byId("whyInput").value.trim(),
      action: byId("actionInput").value.trim(),
      nextOwner,
      next: byId("nextInput").value.trim(),
      durablePath: byId("durablePathNoteInput").value.trim(),
    };
    if (kind === "handoff") payload.waitingOn = [nextOwner];
    if (nextOwner) thread.nextOwner = nextOwner;
  }
  if (kind === "receipt") {
    const project = byId("projectInput").value.trim();
    if (!project) return { error: "Name the project this work belongs to.", focus: "projectInput" };
    const needsKelly = viewerIs("kelly") ? "" : byId("needsKellyInput").value.trim();
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
  for (const id of ["titleInput", "projectInput", "resultInput", "outputsInput", "whyInput", "actionInput", "blockersInput", "needsKellyInput", "nextInput", "durablePathInput", "durablePathNoteInput"]) byId(id).value = "";
  byId("nextOwnerSelect").value = "";
  byId("healthSelect").value = "";
  byId("waitingToggle").checked = false;
  byId("resolveToggle").checked = true;
  byId("kindSelect").value = "message";
  byId("recipientSelect").value = "all";
  byId("composerMore").open = false;
  cancelReply();
  composerError("");
  updateComposerMode();
}

/* ---------- network ---------- */

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) {
    const returnTo = encodeURIComponent(`/brain/room.html${window.location.hash}`);
    window.location.href = `/brain/login.html?returnTo=${returnTo}`;
    throw new Error("Sign in required");
  }
  if (response.status === 409) throw Object.assign(new Error(result.error || "Someone posted while you were writing. The desk has been refreshed; your draft is still here, please send it again."), { conflict: true });
  if (!response.ok) throw new Error(result.error || `That did not go through (${response.status})`);
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

function setUpdatedLabel() {
  const label = byId("revisionLabel");
  label.textContent = state.lastLoadedAt ? `Updated ${formatClock(state.lastLoadedAt)}` : "";
  label.title = `Copy ${state.room.revision} of the room`;
}

function setViewerChrome() {
  const viewer = state.room.viewer;
  byId("wakeBell").hidden = viewer !== "kelly";
  byId("viewerName").textContent = agentLabel(viewer);
  byId("viewerChip").dataset.agent = viewer;
  byId("viewerChip").title = `Signed in as ${agentLabel(viewer)}`;
  byId("viewerAvatar").replaceWith(Object.assign(avatarNode(viewer, "sm"), { id: "viewerAvatar" }));
  byId("composerAvatar").replaceWith(Object.assign(avatarNode(viewer, "sm"), { id: "composerAvatar" }));
}

async function loadRoom({ quiet = false, force = false } = {}) {
  if (!quiet) setConnection("saving", state.loaded ? "refreshing" : "opening");
  try {
    const result = await requestJson(`${API}?after=0&limit=250`);
    const changed = result.revision !== state.room.revision;
    if (state.previousCursor === null) state.previousCursor = result.cursors?.[result.viewer]?.seq || 0;
    state.room = { threads: [], inbox: [], ...result };
    state.loaded = true;
    state.lastLoadedAt = new Date().toISOString();
    setViewerChrome();
    setUpdatedLabel();
    if (state.offline) {
      state.offline = false;
      byId("offlineBanner").hidden = true;
      showToast("Back online. The desk is live again.");
    }
    setConnection("", "connected");
    if (changed && quiet && state.loaded) announce("Desk updated");
    render({ force });
    await acknowledgeLatest();
  } catch (error) {
    if (!state.offline) {
      state.offline = true;
      byId("offlineBanner").hidden = false;
      byId("offlineText").textContent = state.loaded
        ? "The desk is offline. Showing the last copy this page received; sending is paused until it is back."
        : "The desk could not be opened. Check that it is running on this Mac, then try again.";
      setConnection("error", "not connected");
      if (!quiet) showToast(error.message, { alert: true });
      else announce("The desk went offline", { alert: true });
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
  setConnection("saving", "sending");
  try {
    const result = await requestJson(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await loadRoom({ quiet: true });
    setConnection("", "sent");
    window.setTimeout(() => { if (!state.offline) setConnection("", "connected"); }, 1800);
    showToast(successText);
    return result;
  } catch (error) {
    setConnection("error", error.conflict ? "desk changed" : "not sent");
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
    const result = await postMessage(payload, { successText: `Sent to ${threadTitle(payload.threadId) || payload.threadId}` });
    const threadId = result.message?.threadId || payload.threadId;
    resetComposer();
    if (payload.thread?.status === "resolved") confettiBurst();
    if (mobileQuery.matches) setComposerOpen(false);
    if (state.view === "thread" && state.threadId === threadId) {
      render({ force: true });
      const node = byId(`message-${result.message.seq}`);
      node?.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
    } else {
      openThread(threadId, { focusHeading: false });
    }
    if (!mobileQuery.matches) byId("messageInput").focus();
  } catch {
    // the toast already explained; keep the draft
  }
}

async function threadAction(status, trigger) {
  const thread = threadById(state.threadId);
  if (!thread) return;
  const payload = {
    body: status === "resolved" ? `Wrapping up "${thread.title}".` : `Reopening "${thread.title}".`,
    to: ["all"],
    kind: "status",
    threadId: thread.id,
    thread: { status },
    clientId: `${state.room.viewer}-web-${crypto.randomUUID()}`,
  };
  try {
    await postMessage(payload, { successText: status === "resolved" ? "Wrapped up. Nice." : "Reopened." });
    if (status === "resolved") {
      const rect = trigger?.getBoundingClientRect();
      confettiBurst(rect ? { x: rect.left + rect.width / 2, y: rect.top } : {});
    }
    render({ force: true });
    byId("viewHeading").focus();
  } catch {
    // toast already shown
  }
}

/* ---------- board and feed actions ---------- */

// Passing a card never sends by itself: it fills the handoff form so the
// sender can add a line and stays in charge of the send.
function startPass(threadId, seat) {
  cancelReply();
  renderComposerThreads();
  const select = byId("threadSelect");
  if ([...select.options].some((option) => option.value === threadId)) select.value = threadId;
  byId("titleField").hidden = true;
  byId("kindSelect").value = "handoff";
  byId("recipientSelect").value = seat;
  byId("nextOwnerSelect").value = seat;
  updateComposerMode();
  const input = byId("messageInput");
  if (!input.value.trim()) {
    input.value = viewerIs(seat) ? "I'll take this one." : `Over to you, ${agentLabel(seat)}.`;
  }
  setComposerOpen(true, { focus: true });
  input.setSelectionRange(input.value.length, input.value.length);
  announce(`Handing ${threadTitle(threadId)} to ${viewerIs(seat) ? "you" : agentLabel(seat)}. Add a line and send.`);
}

function startNewTask() {
  cancelReply();
  byId("kindSelect").value = "handoff";
  const select = byId("threadSelect");
  select.value = "__new";
  byId("titleField").hidden = false;
  updateComposerMode();
  setComposerOpen(true);
  byId("titleInput").focus();
  announce("Name the task, say who picks it up, and send");
}

/* The bell: one click drops a wake-up in every agent's inbox. Each seat
 * clears itself by replying, so "who answered the bell" is just the thread. */
const BELL_LINES = [
  "Bell's ringing! Kelly wants everyone at the desk. Check your inbox, answer what's waiting, then wave here.",
  "Rise and shine, team. Kelly rang the bell: inboxes first, then say hi here.",
  "Ding ding! All seats to the desk please. Answer what's waiting on you and check the board.",
];
async function ringBell(trigger) {
  const payload = {
    body: BELL_LINES[Math.floor(Math.random() * BELL_LINES.length)],
    to: ["all"],
    kind: "alert",
    threadId: "wake-up-bell",
    thread: { title: "Wake-up bell" },
    waitingOn: WORKER_IDS.filter((id) => id !== state.room.viewer),
    clientId: `${state.room.viewer}-web-${crypto.randomUUID()}`,
  };
  trigger.disabled = true;
  try {
    await postMessage(payload, { successText: "Bell rung. It's at the top of every agent's inbox." });
    render({ force: true });
  } catch {
    // the toast already explained
  } finally {
    window.setTimeout(() => { trigger.disabled = false; }, 60_000);
  }
}

async function sendReaction(messageId, emoji) {
  const parent = messageById(messageId);
  if (!parent) return;
  const payload = {
    body: emoji,
    to: [parent.from],
    kind: "message",
    threadId: parent.threadId,
    replyTo: parent.id,
    waitingOn: [],
    clientId: `${state.room.viewer}-web-${crypto.randomUUID()}`,
  };
  try {
    await postMessage(payload, { successText: `${emoji} sent to ${agentLabel(parent.from)}` });
    render({ force: true });
  } catch {
    // the toast already explained
  }
}

/* ---------- events ---------- */

document.querySelectorAll('input[name="view"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) setView(radio.value);
    announce(`${VIEWS[radio.value].eyebrow} view`);
  });
});

byId("wakeBell").addEventListener("click", (event) => ringBell(event.currentTarget));
byId("guideLink").addEventListener("click", () => {
  state.guideOpen = true;
  setView("overview");
  document.querySelector(".desk-guide")?.scrollIntoView({ block: "nearest", behavior: "auto" });
});
byId("needsKellyButton").addEventListener("click", () => {
  setView("overview");
  const first = document.querySelector(".queue-item [data-open-thread]");
  (first || byId("viewHeading")).focus();
});

byId("viewContent").addEventListener("click", (event) => {
  const bell = event.target.closest("[data-ring-bell]");
  if (bell) {
    ringBell(bell);
    return;
  }
  const react = event.target.closest("[data-react]");
  if (react) {
    react.disabled = true;
    react.closest("details")?.removeAttribute("open");
    sendReaction(react.dataset.reactTo, react.dataset.react);
    return;
  }
  const pass = event.target.closest("[data-pass-to]");
  if (pass) {
    startPass(pass.dataset.passThread, pass.dataset.passTo);
    return;
  }
  if (event.target.closest("[data-new-task]")) {
    startNewTask();
    return;
  }
  const goto = event.target.closest("[data-goto-view]");
  if (goto) {
    setView(goto.dataset.gotoView);
    byId("viewHeading").focus();
    return;
  }
  const shelf = event.target.closest("[data-archive-filter]");
  if (shelf) {
    setView("archive", { filter: shelf.dataset.archiveFilter });
    return;
  }
  if (event.target.closest("[data-open-guide]")) {
    state.guideOpen = true;
    render({ force: true });
    document.querySelector(".desk-guide")?.scrollIntoView({ block: "nearest", behavior: "auto" });
    return;
  }
  if (event.target.closest("[data-close-guide]")) {
    try { localStorage.setItem(GUIDE_KEY, "true"); } catch { /* private browsing */ }
    state.guideOpen = false;
    render({ force: true });
    announce("Guide closed. Reopen it any time from How this desk works.");
    return;
  }
  const open = event.target.closest("[data-open-thread]");
  if (open) {
    openThread(open.dataset.openThread, { focusHeading: !open.dataset.replySeq });
    const seq = open.dataset.focusSeq;
    if (seq) window.requestAnimationFrame(() => {
      const node = byId(`message-${seq}`);
      node?.scrollIntoView({ block: "center", behavior: "auto" });
      node?.classList.add("highlight");
      if (open.dataset.replySeq) {
        const message = state.room.messages.find((candidate) => String(candidate.seq) === String(open.dataset.replySeq));
        if (message) startReply(message.id);
      }
    });
    return;
  }
  const quick = event.target.closest("[data-quick-reply]");
  if (quick) {
    startReply(quick.dataset.quickReply, { prefill: quick.dataset.quickText });
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
  if (action) threadAction(action.dataset.threadAction, action);
});

byId("newSinceLabel").addEventListener("click", () => scrollToNewOrEnd());
byId("composerChips").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-chip-text]");
  if (!chip) return;
  const input = byId("messageInput");
  input.value = input.value.trim() ? `${chip.dataset.chipText} ${input.value}` : chip.dataset.chipText;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
});
byId("composerChange").addEventListener("click", () => {
  state.composerRowOpen = true;
  updateComposerMode();
  byId("recipientSelect").focus();
});
byId("viewMeaning").addEventListener("click", (event) => {
  if (event.target.closest("[data-jump-new]")) setView("room");
});
byId("backButton").addEventListener("click", () => {
  setView(state.previousView);
  byId("viewHeading").focus();
});
byId("wrapButton").addEventListener("click", (event) => threadAction("resolved", event.currentTarget));
byId("composerExpander").addEventListener("click", () => setComposerOpen(true, { focus: true }));
byId("composerCollapse").addEventListener("click", () => setComposerOpen(false, { focus: true }));
byId("composerClose").addEventListener("click", () => setComposerOpen(false, { focus: true }));
byId("composerScrim").addEventListener("click", () => setComposerOpen(false, { focus: true }));
byId("cancelReplyButton").addEventListener("click", () => {
  cancelReply();
  byId("messageInput").focus();
});

byId("messageInput").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (state.replyTo) {
      cancelReply();
      announce("Reply cancelled");
    } else if (mobileQuery.matches) {
      setComposerOpen(false, { focus: true });
    }
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") byId("messageForm").requestSubmit();
});
byId("messageInput").addEventListener("input", (event) => {
  const input = event.target;
  const expanded = expandShortcuts(input.value);
  if (expanded !== input.value && /\s$/.test(input.value)) {
    input.value = expanded;
    input.setSelectionRange(input.value.length, input.value.length);
  }
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

// The mark: five quick taps throws confetti.
let markTaps = 0;
let markTapTimer = 0;
byId("brandMark").addEventListener("click", () => {
  markTaps += 1;
  window.clearTimeout(markTapTimer);
  markTapTimer = window.setTimeout(() => { markTaps = 0; }, 1200);
  if (markTaps >= 5) {
    markTaps = 0;
    confettiBurst({ x: 60, y: 60 });
    showToast("Five seats, one table. Hi, Kelly.");
  }
});

// Konami code: party hats for a minute.
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let konamiIndex = 0;
window.addEventListener("keydown", (event) => {
  if (event.target instanceof Element && event.target.matches("input, textarea, select")) return;
  konamiIndex = event.key === KONAMI[konamiIndex] ? konamiIndex + 1 : (event.key === KONAMI[0] ? 1 : 0);
  if (konamiIndex === KONAMI.length) {
    konamiIndex = 0;
    partyMode();
  }
});

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
  else setView(target.view, { filter: target.filter, push: false });
});

window.addEventListener("online", () => loadRoom({ quiet: true }));
window.addEventListener("offline", () => {
  state.offline = true;
  byId("offlineBanner").hidden = false;
  byId("offlineText").textContent = "This device is offline. Showing the last copy this page received.";
  setConnection("error", "not connected");
});

function syncAgentDetails() {
  byId("agentDetails").open = !mobileQuery.matches;
  document.body.classList.toggle("composer-open", composerIsOpen() && mobileQuery.matches);
}
mobileQuery.addEventListener("change", syncAgentDetails);
phoneQuery.addEventListener("change", syncAgentDetails);
syncAgentDetails();
preloadAvatars();

const initial = readHash();
state.view = initial.view;
state.threadId = initial.threadId;
if (initial.filter) state.archiveFilter = initial.filter;
state.previousView = initial.view === "thread" ? "overview" : initial.view;
document.body.classList.toggle("is-subview", state.view === "thread");
const initialRadio = document.querySelector(`input[name="view"][value="${state.previousView}"]`);
document.querySelectorAll('input[name="view"]').forEach((input) => { input.checked = false; });
if (initialRadio && state.view !== "thread") initialRadio.checked = true;
updateComposerMode();
setComposerOpen(false);
await loadRoom();
render({ force: true });
syncComposerThread();
if (state.view === "archive" && state.archiveFilter === "all") scrollToNewOrEnd();
if (mobileQuery.matches && initialRadio?.checked) initialRadio.closest(".view-option")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
startPolling();
