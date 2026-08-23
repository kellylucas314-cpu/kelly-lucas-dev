import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { humanizeSlug, slugify } from "../lib/agent-room-model.js";

const DEFAULT_URL = "http://127.0.0.1:4399/api/agent-room";
const FLAGS = new Set(["inbox", "json", "all", "resolve", "help"]);
const REPEATABLE = new Set(["output"]);

function usage() {
  return `Agent Commons CLI

Read:
  inbox    --actor codex [--json]                 Only what needs you, with the reason for each item
  threads  --actor codex [--all] [--json]         Thread list (active by default; --all includes resolved)
  show     --actor codex --thread lantern-demo    One thread's full append-only history
  list     --actor codex [--after 0] [--inbox]    Raw messages (legacy view)
  doctor   --actor codex                          Verify identity and transport

Write:
  send     --actor codex --to all --body "Hello" [--thread slug] [--title "Readable title"] [--kind question] [--waiting kip] [--reply message-id]
  reply    --actor codex --thread slug --body "..." [--to kip] [--reply message-id] [--waiting kip] [--next-owner kip] [--resolve]
  note     --actor codex --to kelly --project "Name" --body "Summary" [note options]
  handoff  --actor codex --to kip --project "Name" --body "Summary" --next-owner kip [note options]
  log      --actor codex --project "Name" --did "What you did" [receipt options]
  resolve  --actor codex --thread slug [--body "Why it is resolved"]
  reopen   --actor codex --thread slug [--body "Why"] [--waiting kelly]
  ack      --actor codex --through 12            Acknowledge what you actually reviewed

Note and handoff options:
  --output PATH          Repeat for more than one output path or link
  --why "..."            Why it matters
  --action "..."         Action requested from the next owner
  --next "..."           Next step after that
  --next-owner AGENT     Who owns the next step (required for handoff)
  --durable PATH         Where the durable record lives (KIP or project file)
  --thread slug          Thread (defaults to the project slug)
  --title "..."          Readable thread title

Receipt options:
  --result "..."         What changed or was learned
  --output PATH          Repeat for more than one output
  --blockers "..."       What is blocked and why
  --needs-kelly "..."    Decision or action Kelly needs to take (puts the thread in her queue)
  --next-owner AGENT     Who owns the next step
  --next "..."           The next safe action
  --health on-track|at-risk|off-track
  --thread slug          Thread (defaults to the project slug)

Every command accepts --json for machine-readable output.

Environment:
  AGENT_COMMONS_URL      API URL (default ${DEFAULT_URL})
  KELLY_DASHBOARD_TOKEN  Agent token for the private HTTPS API (never printed)
`;
}

export function parseArguments(argv) {
  const [command = "help", ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    if (FLAGS.has(key)) {
      options[key] = true;
      continue;
    }
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`--${key} needs a value`);
    }
    if (REPEATABLE.has(key)) options[key] = [...(options[key] || []), value];
    else options[key] = value;
    index += 1;
  }
  return { command, options };
}

function splitList(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function require(options, key, label = `--${key}`) {
  const value = options[key];
  if (value === undefined || value === true || !String(value).trim()) {
    throw new Error(`${label} is required`);
  }
  return String(value);
}

function receiptFromOptions(options) {
  return {
    project: options.project || "General",
    did: require(options, "did"),
    result: options.result || "",
    outputs: (options.output || []).filter(Boolean),
    blockers: options.blockers || "",
    needsKelly: options["needs-kelly"] || "",
    nextOwner: options["next-owner"] || "",
    next: options.next || "",
    health: options.health || "",
  };
}

export function workReceiptBody(receipt) {
  const lines = [`Project: ${receipt.project}`, `Did: ${receipt.did}`];
  if (receipt.result) lines.push(`Result: ${receipt.result}`);
  if (receipt.outputs.length) lines.push(`Outputs: ${receipt.outputs.join(" | ")}`);
  if (receipt.blockers) lines.push(`Blockers: ${receipt.blockers}`);
  if (receipt.needsKelly) lines.push(`Needs Kelly: ${receipt.needsKelly}`);
  if (receipt.nextOwner) lines.push(`Next owner: ${receipt.nextOwner}`);
  if (receipt.next) lines.push(`Next: ${receipt.next}`);
  if (receipt.health) lines.push(`Health: ${receipt.health}`);
  return lines.join("\n");
}

function noteFromOptions(options, kind) {
  const note = {
    project: options.project || "General",
    summary: require(options, "body"),
    outputs: (options.output || []).filter(Boolean),
    why: options.why || "",
    action: options.action || "",
    nextOwner: options["next-owner"] || "",
    next: options.next || "",
    durablePath: options.durable || "",
  };
  if (kind === "handoff" && !note.nextOwner) throw new Error("--next-owner is required for a handoff");
  return note;
}

function noteBody(note, kind) {
  const lines = [`${kind === "handoff" ? "Handoff" : "Note"}: ${note.project}`, note.summary];
  if (note.outputs.length) lines.push(`Outputs: ${note.outputs.join(" | ")}`);
  if (note.why) lines.push(`Why: ${note.why}`);
  if (note.action) lines.push(`Action requested: ${note.action}`);
  if (note.nextOwner) lines.push(`Next owner: ${note.nextOwner}`);
  if (note.next) lines.push(`Next: ${note.next}`);
  if (note.durablePath) lines.push(`Durable record: ${note.durablePath}`);
  return lines.join("\n");
}

function headers(baseUrl, actor, withBody = false) {
  const result = { "X-Agent": actor };
  if (withBody) result["Content-Type"] = "application/json";
  const token = process.env.KELLY_DASHBOARD_TOKEN;
  if (token) {
    const transport = new URL(baseUrl);
    if (transport.protocol !== "https:") {
      throw new Error("Refusing to send KELLY_DASHBOARD_TOKEN over a non-HTTPS Agent Commons URL");
    }
    result.Authorization = `Bearer ${token}`;
  }
  return result;
}

async function requestJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error(`Could not reach the room at ${new URL(url).origin} (${error.cause?.code || error.message}). Is the loopback service running?`);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error("The room rejected this identity (401). Check the actor name and token configuration; nothing was posted.");
    if (response.status === 409) throw new Error(`The room refused the write (409): ${body.error || "conflict"}. Re-read and retry.`);
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body;
}

function when(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().replace("T", " ").slice(0, 16) : "unknown time";
}

function threadLine(thread) {
  const bits = [thread.status];
  if (thread.waitingOn?.length) bits.push(`waiting on ${thread.waitingOn.join(", ")}`);
  if (thread.nextOwner) bits.push(`next owner ${thread.nextOwner}`);
  if (thread.unread) bits.push(`${thread.unread} unread`);
  if (thread.needsKelly) bits.push("needs Kelly");
  return `${thread.title} (${thread.id}) · ${bits.join(" · ")} · ${thread.count} ${thread.count === 1 ? "message" : "messages"} · last ${when(thread.lastAt)} by ${thread.lastFrom}`;
}

function printMessages(messages, titles = new Map()) {
  for (const message of messages) {
    const waiting = message.waitingOn.length ? ` · waiting on ${message.waitingOn.join(", ")}` : "";
    const reply = message.replyTo ? ` · reply to ${message.replyTo}` : "";
    const state = message.thread?.status ? ` · thread ${message.thread.status}` : "";
    const title = titles.get(message.threadId) || humanizeSlug(message.threadId);
    process.stdout.write(
      `[${message.seq}] ${when(message.createdAt)} · ${message.from} → ${message.to.join(", ")} · ${message.kind} · ${title} (${message.threadId})${waiting}${reply}${state}\n${message.body}\n\n`,
    );
  }
}

function out(options, json, text) {
  if (options.json) process.stdout.write(`${JSON.stringify(json, null, 2)}\n`);
  else process.stdout.write(text);
}

async function readRoom(baseUrl, actor, extra = {}) {
  const url = new URL(baseUrl);
  url.searchParams.set("after", extra.after || "0");
  url.searchParams.set("limit", extra.limit || "250");
  if (extra.inbox) url.searchParams.set("inbox", "1");
  return requestJson(url, { headers: headers(baseUrl, actor) });
}

async function postMessage(baseUrl, actor, payload) {
  return requestJson(baseUrl, {
    method: "POST",
    headers: headers(baseUrl, actor, true),
    body: JSON.stringify(payload),
  });
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === "help" || options.help) {
    process.stdout.write(usage());
    return;
  }

  const baseUrl = process.env.AGENT_COMMONS_URL || DEFAULT_URL;
  const actor = options.actor || "codex";
  const clientId = () => options.client || `${actor}-${randomUUID()}`;

  if (command === "list") {
    const result = await readRoom(baseUrl, actor, { after: options.after, limit: options.limit || "100", inbox: options.inbox });
    if (options.json) return out(options, result);
    process.stdout.write(`Agent Room · viewer ${result.viewer} · ${result.unread} unread\n`);
    if (!result.messages.length) return process.stdout.write("No messages.\n");
    return printMessages(result.messages, new Map((result.threads || []).map((thread) => [thread.id, thread.title])));
  }

  if (command === "inbox") {
    const result = await readRoom(baseUrl, actor);
    const items = result.inbox || [];
    if (options.json) return out(options, { viewer: result.viewer, revision: result.revision, inbox: items });
    process.stdout.write(`Inbox for ${result.viewer} · ${items.filter((item) => item.actionable).length} actionable · ${items.filter((item) => item.unread).length} unread\n`);
    if (!items.length) return process.stdout.write("Nothing needs you right now.\n");
    const bySeq = new Map(result.messages.map((message) => [message.seq, message]));
    for (const item of items) {
      const message = bySeq.get(item.seq);
      const flags = [item.reasonLabel, item.actionable ? "actionable" : "", item.unread ? "unread" : ""].filter(Boolean).join(" · ");
      process.stdout.write(`[${item.seq}] ${item.threadTitle} (${item.threadId}) · from ${item.from} · ${item.kind} · ${flags}\n`);
      if (message) process.stdout.write(`    ${message.body.split("\n")[0].slice(0, 160)}\n`);
    }
    return undefined;
  }

  if (command === "threads") {
    const result = await readRoom(baseUrl, actor);
    const threads = (result.threads || []).filter((thread) => options.all || thread.status !== "resolved");
    if (options.json) return out(options, { viewer: result.viewer, revision: result.revision, threads });
    process.stdout.write(`Threads for ${result.viewer} · ${threads.length} shown${options.all ? "" : " (active only; --all for resolved)"}\n`);
    for (const thread of threads) process.stdout.write(`${threadLine(thread)}\n`);
    return undefined;
  }

  if (command === "show") {
    const threadId = require(options, "thread");
    const result = await readRoom(baseUrl, actor);
    const thread = (result.threads || []).find((candidate) => candidate.id === threadId);
    const messages = result.messages.filter((message) => message.threadId === threadId);
    if (!thread) throw new Error(`No thread named ${threadId}`);
    if (options.json) return out(options, { viewer: result.viewer, thread, messages });
    process.stdout.write(`${threadLine(thread)}\n\n`);
    return printMessages(messages, new Map([[thread.id, thread.title]]));
  }

  if (command === "send") {
    const body = require(options, "body");
    const threadId = options.thread ? slugify(options.thread) : (options.title ? slugify(options.title) : "general");
    const payload = {
      body,
      to: splitList(options.to || "all"),
      waitingOn: splitList(options.waiting),
      threadId,
      kind: options.kind || "message",
      replyTo: options.reply || "",
      clientId: clientId(),
    };
    if (options.title) payload.thread = { title: options.title };
    if (options["next-owner"]) payload.thread = { ...(payload.thread || {}), nextOwner: options["next-owner"] };
    const result = await postMessage(baseUrl, actor, payload);
    return out(options, result, `${result.duplicate ? "Already present" : "Sent"} as ${actor}: message ${result.message.seq} in ${result.message.threadId}\n`);
  }

  if (command === "reply") {
    const body = require(options, "body");
    const threadId = slugify(require(options, "thread"));
    const thread = {};
    if (options["next-owner"]) thread.nextOwner = options["next-owner"];
    if (options.resolve) thread.status = "resolved";
    const payload = {
      body,
      to: splitList(options.to || "all"),
      waitingOn: splitList(options.waiting),
      threadId,
      kind: options.kind || "message",
      replyTo: options.reply || "",
      clientId: clientId(),
    };
    if (Object.keys(thread).length) payload.thread = thread;
    const result = await postMessage(baseUrl, actor, payload);
    return out(options, result, `Replied as ${actor}: message ${result.message.seq} in ${threadId}${options.resolve ? " (thread resolved)" : ""}\n`);
  }

  if (command === "note" || command === "handoff") {
    const note = noteFromOptions(options, command);
    const threadId = options.thread ? slugify(options.thread) : slugify(note.project);
    const payload = {
      body: noteBody(note, command),
      to: splitList(options.to || (note.nextOwner ? `${note.nextOwner},kelly` : "all")),
      waitingOn: command === "handoff" ? [note.nextOwner] : splitList(options.waiting),
      threadId,
      kind: command,
      note,
      clientId: clientId(),
    };
    if (options.title) payload.thread = { title: options.title };
    const result = await postMessage(baseUrl, actor, payload);
    return out(options, result, `${command === "handoff" ? "Handed off" : "Noted"} as ${actor}: message ${result.message.seq} in ${threadId}\n`);
  }

  if (command === "log") {
    const receipt = receiptFromOptions(options);
    const threadId = options.thread ? slugify(options.thread) : slugify(receipt.project, "work-log");
    const waitingOn = [];
    if (receipt.needsKelly) waitingOn.push("kelly");
    if (receipt.nextOwner && receipt.nextOwner !== actor && !waitingOn.includes(receipt.nextOwner)) waitingOn.push(receipt.nextOwner);
    const payload = {
      body: workReceiptBody(receipt),
      to: ["all"],
      waitingOn,
      threadId,
      kind: "receipt",
      receipt,
      clientId: clientId(),
    };
    if (options.title) payload.thread = { title: options.title };
    const result = await postMessage(baseUrl, actor, payload);
    return out(options, result, `${result.duplicate ? "Already logged" : "Logged"} as ${actor}: receipt ${result.message.seq} in ${threadId}\n`);
  }

  if (command === "resolve" || command === "reopen") {
    const threadId = slugify(require(options, "thread"));
    const payload = {
      body: options.body || (command === "resolve" ? "Marking this thread resolved." : "Reopening this thread."),
      to: splitList(options.to || "all"),
      waitingOn: command === "reopen" ? splitList(options.waiting) : [],
      threadId,
      kind: "status",
      thread: { status: command === "resolve" ? "resolved" : "reopened" },
      clientId: clientId(),
    };
    const result = await postMessage(baseUrl, actor, payload);
    return out(options, result, `${command === "resolve" ? "Resolved" : "Reopened"} ${threadId} as ${actor}: message ${result.message.seq}\n`);
  }

  if (command === "doctor") {
    const result = await readRoom(baseUrl, actor, { limit: "1" });
    if (result.viewer !== actor) {
      throw new Error(`Identity mismatch: expected ${actor}, received ${result.viewer || "unknown"}`);
    }
    const text = `Agent Commons ready: ${actor} · ${result.transport || "unknown transport"} · schema ${result.schemaVersion} · revision ${result.revision}\n`;
    return out(options, { actor, transport: result.transport, schemaVersion: result.schemaVersion, revision: result.revision }, text);
  }

  if (command === "ack") {
    const through = require(options, "through");
    const result = await requestJson(baseUrl, {
      method: "PATCH",
      headers: headers(baseUrl, actor, true),
      body: JSON.stringify({ through }),
    });
    return out(options, result, `${actor} acknowledged through message ${result.cursor.seq}\n`);
  }

  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

const isDirectRun = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isDirectRun) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`Agent Commons: ${error.message}\n`);
    process.exitCode = 1;
  }
}
