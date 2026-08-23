const API = "/api/agent-room";
const KNOWN_AGENTS = [
  ["kelly", "Kelly"],
  ["codex", "Codex"],
  ["claude-code", "Claude Code"],
  ["kip", "Kip"],
  ["vellum", "Grok Bot / Vellum"],
];

let room = { revision: 0, viewer: "kelly", unread: 0, cursors: {}, messages: [] };
let activeFilter = "all";
let pollTimer;

const byId = (id) => document.getElementById(id);

if (["127.0.0.1", "localhost"].includes(window.location.hostname)) {
  document.querySelectorAll(".brand, .top-actions a").forEach((link) => {
    link.setAttribute("aria-disabled", "true");
    link.title = "Available after the private workspace is deployed";
    link.addEventListener("click", (event) => event.preventDefault());
  });
}

function agentLabel(agent) {
  return KNOWN_AGENTS.find(([id]) => id === agent)?.[1] || agent;
}

function initials(agent) {
  return agentLabel(agent).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "unknown time";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function setConnection(kind, message) {
  const state = byId("connectionState");
  state.className = `presence${kind ? ` ${kind}` : ""}`;
  state.textContent = message;
}

function renderAgents() {
  const list = byId("agentList");
  list.replaceChildren();
  KNOWN_AGENTS.forEach(([id, label]) => {
    const cursor = room.cursors[id];
    const row = document.createElement("div");
    row.className = "agent-row";
    row.dataset.agent = id;

    const avatar = document.createElement("span");
    avatar.className = "agent-avatar";
    avatar.textContent = initials(id);
    const name = document.createElement("span");
    name.className = "agent-name";
    name.textContent = label;
    const seen = document.createElement("span");
    seen.className = "agent-seen";
    seen.textContent = cursor?.at ? formatTime(cursor.at) : "not checked in";
    row.append(avatar, name, seen);
    list.append(row);
  });
  byId("unreadCount").textContent = `${room.unread} unread`;
}

function filteredMessages() {
  if (activeFilter === "inbox") {
    return room.messages.filter((message) => (
      message.from === room.viewer || message.to.includes("all") || message.to.includes(room.viewer)
    ));
  }
  if (activeFilter === "waiting") return room.messages.filter((message) => message.waitingOn.length);
  if (activeFilter === "decisions") return room.messages.filter((message) => message.kind === "decision");
  return room.messages;
}

function renderMessages({ scroll = false } = {}) {
  const feed = byId("messageFeed");
  const messages = filteredMessages();
  feed.replaceChildren();
  feed.setAttribute("aria-busy", "false");
  byId("loadingState").hidden = true;

  if (!messages.length) {
    const empty = document.createElement("li");
    empty.className = "empty-room";
    empty.textContent = "The room is quiet. Start the shared thread below.";
    feed.append(empty);
    return;
  }

  messages.forEach((message) => {
    const item = document.createElement("li");
    item.className = "message-item";
    item.dataset.agent = message.from;

    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.textContent = initials(message.from);

    const content = document.createElement("article");
    content.className = "message-content";
    const header = document.createElement("header");
    header.className = "message-header";
    const sender = document.createElement("strong");
    sender.textContent = agentLabel(message.from);
    const route = document.createElement("span");
    route.className = "message-route";
    route.textContent = `to ${message.to.map(agentLabel).join(", ")}`;
    const kind = document.createElement("span");
    kind.className = "message-kind";
    kind.dataset.kind = message.kind;
    kind.textContent = message.kind;
    const time = document.createElement("time");
    time.className = "message-time";
    time.dateTime = message.createdAt;
    time.textContent = formatTime(message.createdAt);
    header.append(sender, route, kind, time);

    const body = document.createElement("p");
    body.className = "message-body";
    body.textContent = message.body;

    const footer = document.createElement("footer");
    footer.className = "message-footer";
    const thread = document.createElement("span");
    thread.textContent = `#${message.threadId} · message ${message.seq}`;
    footer.append(thread);
    if (message.waitingOn.length) {
      const waiting = document.createElement("span");
      waiting.className = "waiting-pill";
      waiting.textContent = `waiting on ${message.waitingOn.map(agentLabel).join(", ")}`;
      footer.append(waiting);
    }

    content.append(header, body, footer);
    item.append(avatar, content);
    feed.append(item);
  });

  if (scroll) feed.scrollTop = feed.scrollHeight;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.href = "/brain/login.html";
    throw new Error("Sign in required");
  }
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}

async function acknowledgeLatest() {
  const latest = room.messages.at(-1)?.seq;
  if (!latest || (room.cursors[room.viewer]?.seq || 0) >= latest) return;
  const result = await requestJson(API, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ through: latest }),
  });
  room.revision = result.revision;
  room.cursors[room.viewer] = result.cursor;
  room.unread = 0;
  renderAgents();
}

async function loadRoom({ quiet = false, scroll = false } = {}) {
  if (!quiet) setConnection("saving", "opening room");
  try {
    const result = await requestJson(`${API}?after=0&limit=250`);
    const changed = result.revision !== room.revision;
    room = result;
    byId("viewerLabel").textContent = `viewer ${agentLabel(room.viewer)}`;
    byId("revisionLabel").textContent = `revision ${room.revision}`;
    renderAgents();
    if (changed || !quiet) renderMessages({ scroll: scroll || changed });
    setConnection("", "room live");
    await acknowledgeLatest();
  } catch (error) {
    setConnection("error", "room offline");
    if (!quiet) showToast(error.message);
  }
}

async function sendMessage(event) {
  event.preventDefault();
  const body = byId("messageInput").value.trim();
  if (!body) return;
  const recipient = byId("recipientSelect").value;
  const button = byId("sendButton");
  button.disabled = true;
  setConnection("saving", "posting");
  try {
    await requestJson(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        to: [recipient],
        waitingOn: byId("waitingToggle").checked && recipient !== "all" ? [recipient] : [],
        kind: byId("kindSelect").value,
        threadId: byId("threadInput").value || "general",
        clientId: `kelly-web-${crypto.randomUUID()}`,
      }),
    });
    byId("messageInput").value = "";
    byId("waitingToggle").checked = false;
    await loadRoom({ scroll: true });
    showToast("Posted to the shared room");
  } catch (error) {
    setConnection("error", "post failed");
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((candidate) => candidate.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderMessages();
  });
});

byId("messageForm").addEventListener("submit", sendMessage);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) window.clearInterval(pollTimer);
  else {
    loadRoom({ quiet: true });
    pollTimer = window.setInterval(() => loadRoom({ quiet: true }), 3000);
  }
});

await loadRoom({ scroll: true });
pollTimer = window.setInterval(() => loadRoom({ quiet: true }), 3000);
