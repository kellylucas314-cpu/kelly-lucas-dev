import { randomUUID } from "node:crypto";

function usage() {
  return `Agent Commons CLI

Usage:
  node scripts/agent-room-cli.mjs list --actor codex [--after 0] [--inbox]
  node scripts/agent-room-cli.mjs send --actor codex --to all --body "Hello"
  node scripts/agent-room-cli.mjs ack --actor codex --through 12

Environment:
  AGENT_COMMONS_URL    API URL (default http://127.0.0.1:4399/api/agent-room)
  KELLY_DASHBOARD_TOKEN  Agent token for the private deployed API
`;
}

function parseArguments(argv) {
  const [command = "help", ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    if (["inbox", "json"].includes(key)) {
      options[key] = true;
      continue;
    }
    options[key] = rest[index + 1];
    index += 1;
  }
  return { command, options };
}

function headers(actor, withBody = false) {
  const result = { "X-Agent": actor };
  if (withBody) result["Content-Type"] = "application/json";
  const token = process.env.KELLY_DASHBOARD_TOKEN;
  if (token) result.Authorization = `Bearer ${token}`;
  return result;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function printMessages(result) {
  process.stdout.write(`Agent Room · viewer ${result.viewer} · ${result.unread} unread\n`);
  if (!result.messages.length) {
    process.stdout.write("No messages.\n");
    return;
  }
  for (const message of result.messages) {
    const waiting = message.waitingOn.length ? ` · waiting on ${message.waitingOn.join(", ")}` : "";
    process.stdout.write(
      `[${message.seq}] ${message.createdAt} · ${message.from} → ${message.to.join(", ")} · ${message.threadId}${waiting}\n${message.body}\n\n`,
    );
  }
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === "help" || options.help) {
    process.stdout.write(usage());
    return;
  }

  const baseUrl = process.env.AGENT_COMMONS_URL || "http://127.0.0.1:4399/api/agent-room";
  const actor = options.actor || "codex";

  if (command === "list") {
    const url = new URL(baseUrl);
    url.searchParams.set("after", options.after || "0");
    url.searchParams.set("limit", options.limit || "100");
    if (options.inbox) url.searchParams.set("inbox", "1");
    const result = await requestJson(url, { headers: headers(actor) });
    if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else printMessages(result);
    return;
  }

  if (command === "send") {
    if (!options.body) throw new Error("--body is required");
    const payload = {
      body: options.body,
      to: (options.to || "all").split(","),
      waitingOn: options.waiting ? options.waiting.split(",") : [],
      threadId: options.thread || "general",
      kind: options.kind || "message",
      replyTo: options.reply || "",
      clientId: options.client || `${actor}-${randomUUID()}`,
    };
    const result = await requestJson(baseUrl, {
      method: "POST",
      headers: headers(actor, true),
      body: JSON.stringify(payload),
    });
    process.stdout.write(`${result.duplicate ? "Already present" : "Sent"} as ${actor}: message ${result.message.seq}\n`);
    return;
  }

  if (command === "ack") {
    if (options.through === undefined) throw new Error("--through is required");
    const result = await requestJson(baseUrl, {
      method: "PATCH",
      headers: headers(actor, true),
      body: JSON.stringify({ through: options.through }),
    });
    process.stdout.write(`${actor} acknowledged through message ${result.cursor.seq}\n`);
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

try {
  await main();
} catch (error) {
  process.stderr.write(`Agent Commons: ${error.message}\n`);
  process.exitCode = 1;
}
