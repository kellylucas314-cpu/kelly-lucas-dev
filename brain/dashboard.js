const API = "/api/dashboard-state";
const STATUSES = ["now", "in-progress", "waiting", "later", "done"];

let state = {
  revision: 0,
  focus: "",
  tasks: [],
  links: [],
  context: [],
  activity: [],
};
let saveChain = Promise.resolve();
let toastTimer;

const byId = (id) => document.getElementById(id);
const newId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

function formatWhen(value) {
  if (!value) return "not saved yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function showToast(message, kind = "") {
  const toast = byId("toast");
  toast.textContent = message;
  toast.className = `toast visible ${kind}`.trim();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = "toast"; }, 3800);
}

function setPresence(mode, label) {
  const presence = byId("presence");
  presence.className = `presence ${mode || ""}`.trim();
  presence.textContent = label;
}

function emptyMessage(text) {
  const element = document.createElement("div");
  element.className = "empty-card";
  element.textContent = text;
  return element;
}

function taskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card";

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "task-check";
  check.checked = task.status === "done";
  check.setAttribute("aria-label", `${check.checked ? "Reopen" : "Finish"} ${task.title}`);
  check.addEventListener("change", () => {
    const previousStatus = task.status;
    task.status = check.checked ? "done" : "now";
    task.completedAt = check.checked ? new Date().toISOString() : "";
    render();
    queueSave(check.checked ? `Finished: ${task.title}` : `Reopened: ${task.title}`, () => {
      task.status = previousStatus;
      render();
    });
  });

  const main = document.createElement("div");
  main.className = "task-main";
  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;
  main.append(title);
  if (task.details) {
    const details = document.createElement("p");
    details.className = "task-details";
    details.textContent = task.details;
    main.append(details);
  }
  const meta = document.createElement("div");
  meta.className = "task-meta";
  [task.project, task.due].filter(Boolean).forEach((value) => {
    const badge = document.createElement("span");
    badge.textContent = value;
    meta.append(badge);
  });
  if (["urgent", "high"].includes(task.priority)) {
    const badge = document.createElement("span");
    badge.className = task.priority === "urgent" ? "urgent" : "";
    badge.textContent = task.priority;
    meta.append(badge);
  }
  if (meta.children.length) main.append(meta);

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "edit-task";
  edit.textContent = "•••";
  edit.setAttribute("aria-label", `Edit ${task.title}`);
  edit.addEventListener("click", () => openTaskDialog(task));
  card.append(check, main, edit);
  return card;
}

function renderTasks() {
  for (const status of STATUSES) {
    const list = byId(`tasks-${status}`);
    list.replaceChildren();
    const tasks = state.tasks.filter((task) => task.status === status);
    tasks.forEach((task) => list.append(taskCard(task)));
    if (!tasks.length && status !== "done") {
      const empty = document.createElement("div");
      empty.className = "empty-lane";
      empty.textContent = status === "now" ? "Keep this lane deliberately small." : "Nothing here right now.";
      list.append(empty);
    }
    if (status !== "done") {
      document.querySelector(`[data-status="${status}"] .lane-count`).textContent = tasks.length;
    }
  }
}

function renderLinks() {
  const list = byId("linkList");
  list.replaceChildren();
  if (!state.links.length) {
    list.append(emptyMessage("Useful URLs live here, without getting mistaken for tasks."));
    return;
  }
  state.links.forEach((link) => {
    const row = document.createElement("div");
    row.className = "link-item";
    const copy = document.createElement("div");
    const anchor = document.createElement("a");
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.textContent = `${link.title} ↗`;
    copy.append(anchor);
    if (link.note) {
      const note = document.createElement("p");
      note.textContent = link.note;
      copy.append(note);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${link.title}`);
    remove.addEventListener("click", () => {
      state.links = state.links.filter((item) => item.id !== link.id);
      renderLinks();
      queueSave(`Removed link: ${link.title}`);
    });
    row.append(copy, remove);
    list.append(row);
  });
}

function renderContext() {
  const list = byId("contextList");
  list.replaceChildren();
  if (!state.context.length) {
    list.append(emptyMessage("Add compact decisions, blockers, or handoff notes that every collaborator should see."));
    return;
  }
  state.context.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "context-item";
    const title = document.createElement("h3");
    title.textContent = entry.title;
    const body = document.createElement("p");
    body.textContent = entry.body;
    const meta = document.createElement("div");
    meta.className = "context-meta";
    const stamp = document.createElement("span");
    stamp.textContent = `${entry.updatedBy || "kelly"} · ${formatWhen(entry.updatedAt)}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${entry.title}`);
    remove.addEventListener("click", () => {
      state.context = state.context.filter((candidate) => candidate.id !== entry.id);
      renderContext();
      queueSave(`Removed shared context: ${entry.title}`);
    });
    meta.append(stamp, remove);
    item.append(title, body, meta);
    list.append(item);
  });
}

function renderActivity() {
  const list = byId("activityList");
  list.replaceChildren();
  if (!state.activity.length) {
    const item = document.createElement("li");
    item.textContent = "Changes from Kelly and her agents will show up here.";
    list.append(item);
    return;
  }
  state.activity.slice(0, 9).forEach((entry) => {
    const item = document.createElement("li");
    const actor = document.createElement("strong");
    actor.textContent = entry.actor;
    item.append(actor, document.createTextNode(` ${entry.summary}`));
    const time = document.createElement("time");
    time.dateTime = entry.at;
    time.textContent = formatWhen(entry.at);
    item.append(time);
    list.append(item);
  });
}

function render() {
  byId("focusInput").value = state.focus || "";
  const open = state.tasks.filter((task) => task.status !== "done");
  const done = state.tasks.filter((task) => task.status === "done");
  byId("openCount").textContent = open.length;
  byId("urgentCount").textContent = open.filter((task) => task.priority === "urgent").length;
  byId("doneCount").textContent = done.length;
  byId("doneDrawerCount").textContent = `${done.length} ${done.length === 1 ? "item" : "items"}`;
  byId("revisionLabel").textContent = `revision ${state.revision}`;
  byId("focusMeta").textContent = state.updatedAt
    ? `Private · last changed by ${state.updatedBy || "kelly"} · ${formatWhen(state.updatedAt)}`
    : "Private · ready for the first shared update";
  renderTasks();
  renderLinks();
  renderContext();
  renderActivity();
}

async function loadState() {
  setPresence("saving", "loading");
  try {
    const response = await fetch(API, { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) {
      const returnTo = location.pathname + location.search;
      location.replace(`/brain/login.html?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load the dashboard");
    state = result;
    render();
    setPresence("", `${state.viewer || "kelly"} · live`);
  } catch (error) {
    setPresence("error", "offline");
    showToast(error.message, "error");
  }
}

async function saveState(summary, rollback) {
  setPresence("saving", "saving");
  try {
    const response = await fetch(API, {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(state.revision),
      },
      body: JSON.stringify({ ...state, changeSummary: summary }),
    });
    const result = await response.json();
    if (response.status === 409) {
      state = result.current;
      render();
      throw new Error("Someone else changed the desk first. I reloaded their version; please make your change again.");
    }
    if (!response.ok) throw new Error(result.error || "Could not save the dashboard");
    state = result;
    render();
    setPresence("", `${state.viewer || "kelly"} · live`);
    showToast("Saved to the shared desk");
  } catch (error) {
    if (typeof rollback === "function") rollback();
    setPresence("error", "save issue");
    showToast(error.message, "error");
  }
}

function queueSave(summary, rollback) {
  saveChain = saveChain.then(() => saveState(summary, rollback));
  return saveChain;
}

function openTaskDialog(task = null) {
  const form = byId("taskForm");
  form.reset();
  form.elements.id.value = task?.id || "";
  form.elements.title.value = task?.title || "";
  form.elements.details.value = task?.details || "";
  form.elements.project.value = task?.project || "";
  form.elements.due.value = task?.due || "";
  form.elements.status.value = task?.status || "now";
  form.elements.priority.value = task?.priority || "normal";
  byId("taskDialogTitle").textContent = task ? "Edit this task" : "Add a task";
  byId("deleteTask").hidden = !task;
  byId("taskDialog").showModal();
  setTimeout(() => form.elements.title.focus(), 40);
}

byId("newTaskButton").addEventListener("click", () => openTaskDialog());

byId("taskForm").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const id = form.elements.id.value || newId("task");
  const previous = state.tasks.find((task) => task.id === id);
  const task = {
    id,
    title: form.elements.title.value.trim(),
    details: form.elements.details.value.trim(),
    project: form.elements.project.value.trim(),
    due: form.elements.due.value.trim(),
    status: form.elements.status.value,
    priority: form.elements.priority.value,
    createdAt: previous?.createdAt || new Date().toISOString(),
    completedAt: form.elements.status.value === "done"
      ? previous?.completedAt || new Date().toISOString()
      : "",
  };
  state.tasks = previous
    ? state.tasks.map((candidate) => candidate.id === id ? task : candidate)
    : [task, ...state.tasks];
  byId("taskDialog").close();
  render();
  queueSave(`${previous ? "Updated" : "Added"} task: ${task.title}`);
});

byId("deleteTask").addEventListener("click", () => {
  const id = byId("taskForm").elements.id.value;
  const task = state.tasks.find((candidate) => candidate.id === id);
  if (!task || !confirm(`Delete “${task.title}” from the shared desk?`)) return;
  state.tasks = state.tasks.filter((candidate) => candidate.id !== id);
  byId("taskDialog").close();
  render();
  queueSave(`Deleted task: ${task.title}`);
});

byId("saveFocus").addEventListener("click", () => {
  const next = byId("focusInput").value.trim();
  if (next === state.focus) return showToast("That focus is already current");
  state.focus = next;
  queueSave(next ? "Changed the current focus" : "Cleared the current focus");
});

function bindInlineForm(buttonId, formId) {
  const form = byId(formId);
  byId(buttonId).addEventListener("click", () => {
    form.hidden = false;
    form.querySelector("input, textarea")?.focus();
  });
  form.querySelector(".cancel-inline").addEventListener("click", () => {
    form.reset();
    form.hidden = true;
  });
}

bindInlineForm("showLinkForm", "linkForm");
bindInlineForm("showContextForm", "contextForm");

byId("linkForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const link = {
    id: newId("link"),
    title: form.elements.title.value.trim(),
    url: form.elements.url.value.trim(),
    note: form.elements.note.value.trim(),
  };
  state.links = [link, ...state.links];
  form.reset();
  form.hidden = true;
  renderLinks();
  queueSave(`Added link: ${link.title}`);
});

byId("contextForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const entry = {
    id: newId("context"),
    title: form.elements.title.value.trim(),
    body: form.elements.body.value.trim(),
    updatedAt: new Date().toISOString(),
    updatedBy: state.viewer || "kelly",
  };
  state.context = [entry, ...state.context];
  form.reset();
  form.hidden = true;
  renderContext();
  queueSave(`Added shared context: ${entry.title}`);
});

byId("lockButton").addEventListener("click", async () => {
  await fetch("/api/magpie-logout", { method: "POST", credentials: "same-origin" });
  location.replace("/brain/login.html?returnTo=/brain/dashboard.html");
});

loadState();
