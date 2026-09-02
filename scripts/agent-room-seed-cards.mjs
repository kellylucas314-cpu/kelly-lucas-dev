/**
 * Seed scrum cards into the room from a JSON list, one conversation each.
 *
 *   node scripts/agent-room-seed-cards.mjs --cards /path/to/cards.json [--actor vellum] [--post]
 *
 * Dry run by default: prints what would be posted and which cards already
 * exist. Nothing is written until --post. A card whose threadId already has a
 * conversation is skipped, so the script is safe to run twice.
 *
 * The JSON shape (kip-workspace keeps the real list; it never lives in this
 * public repository):
 *
 *   { "actor": "vellum", "cards": [ {
 *       "threadId": "slug", "title": "Readable title", "lane": "HelioFlux",
 *       "column": "backlog" | "doing" | "waiting-on-kelly",
 *       "seat": "kip",                 // doing only: who owes the next move
 *       "owner": "Kip's BFF",          // optional: who holds it outside the five seats
 *       "summary": "One or two plain sentences.",
 *       "next": "The next step", "blocker": "What is in the way",
 *       "due": "2026-09-15", "hold": "paused" | "parked", "holdReason": "why"
 *   } ] }
 *
 * The room's loopback service on the Mac is the only transport this script
 * knows; it identifies the actor with the X-Agent header exactly like the CLI.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BOARD_SEATS } from "../lib/agent-room-board.js";
import { slugify } from "../lib/agent-room-model.js";

const DEFAULT_URL = "http://127.0.0.1:4399/api/agent-room";
const COLUMNS = new Set(["backlog", "doing", "waiting-on-kelly"]);

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) options[arg.slice(2)] = true;
    else { options[arg.slice(2)] = next; index += 1; }
  }
  return options;
}

export function cardMessage(card, actor) {
  const errors = [];
  if (!card.title) errors.push("title is required");
  if (!COLUMNS.has(card.column)) errors.push(`column must be one of ${[...COLUMNS].join(", ")}`);
  if (card.column === "doing" && !BOARD_SEATS.includes(card.seat)) errors.push("a doing card needs a seat (codex, claude-code, kip, vellum)");
  if (errors.length) throw new Error(`${card.title || card.threadId || "card"}: ${errors.join("; ")}`);

  const threadId = card.threadId || slugify(card.title);
  const project = card.lane || "General";
  const lines = [];
  if (card.owner) lines.push(`Owner: ${card.owner}`);
  if (card.blocker) lines.push(`Blocker: ${card.blocker}`);
  if (card.due) lines.push(`Due: ${card.due}`);
  if (card.hold) lines.push(`${card.hold === "parked" ? "Parked" : "Paused"}: ${card.holdReason || "on hold"}`);
  const note = { project, summary: card.summary || card.title, action: card.next || "", next: "" };
  const base = {
    clientId: `seed-${threadId}`,
    threadId,
    thread: { title: card.title },
    note,
  };
  if (card.column === "doing") {
    note.nextOwner = card.seat;
    return { ...base, kind: "handoff", to: [card.seat], waitingOn: [card.seat], body: [`Handoff: ${project}`, note.summary, ...lines].join("\n") };
  }
  if (card.column === "waiting-on-kelly") {
    note.nextOwner = "kelly";
    return { ...base, kind: "note", to: ["kelly"], waitingOn: ["kelly"], body: [`Note: ${project}`, note.summary, ...lines].join("\n") };
  }
  return { ...base, kind: "note", to: ["all"], waitingOn: [], body: [`Note: ${project}`, note.summary, ...lines].join("\n") };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!options.cards) throw new Error("--cards <file.json> is required");
  const file = JSON.parse(await readFile(path.resolve(options.cards), "utf8"));
  const actor = options.actor || file.actor || "vellum";
  const baseUrl = process.env.AGENT_COMMONS_URL || DEFAULT_URL;
  const headers = { "X-Agent": actor, "Content-Type": "application/json" };

  const existing = await fetch(`${baseUrl}?after=0&limit=5000`, { headers }).then(async (response) => {
    if (!response.ok) throw new Error(`The room answered ${response.status}; nothing was posted.`);
    return response.json();
  });
  const known = new Set((existing.threads || []).map((thread) => thread.id));

  const plan = (file.cards || []).map((card) => {
    const message = cardMessage(card, actor);
    return { card, message, skip: known.has(message.threadId) };
  });
  process.stdout.write(`${options.post ? "Posting" : "Dry run"} as ${actor} to ${new URL(baseUrl).origin} · ${plan.length} cards, ${plan.filter((item) => item.skip).length} already in the room\n\n`);
  for (const item of plan) {
    const owner = item.message.kind === "handoff" ? ` → ${item.card.seat}` : item.card.column === "waiting-on-kelly" ? " → kelly" : "";
    process.stdout.write(`${item.skip ? "skip " : "post "}${item.card.column.padEnd(17)} ${item.card.title}${owner}\n`);
  }
  if (!options.post) {
    process.stdout.write("\nNothing written. Add --post to seed the room.\n");
    return;
  }
  let posted = 0;
  for (const item of plan) {
    if (item.skip) continue;
    const response = await fetch(baseUrl, { method: "POST", headers, body: JSON.stringify(item.message) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${item.card.title}: the room refused the write (${response.status}) ${body.error || ""}`.trim());
    posted += 1;
    process.stdout.write(`  message ${body.message?.seq ?? "?"} · ${item.card.title}\n`);
  }
  process.stdout.write(`\nPosted ${posted} card${posted === 1 ? "" : "s"}.\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
