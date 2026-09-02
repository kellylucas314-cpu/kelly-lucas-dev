/**
 * Roll call: can every Mac seat reach the room right now, and when did each
 * seat last post?
 *
 *   node scripts/agent-room-rollcall.mjs [--json]
 *
 * Talks only to the loopback service (no tokens live here). Kip is not a
 * Mac seat; its line comes from its last post through the PC transport.
 * Exit code 1 when any Mac seat cannot reach the room, so a scheduled run
 * can alert on it.
 */
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const DEFAULT_URL = "http://127.0.0.1:4399/api/agent-room";
const MAC_SEATS = ["kelly", "codex", "claude-code", "vellum"];
const ALL_SEATS = ["kelly", "codex", "claude-code", "kip", "vellum"];

function ago(iso) {
  if (!iso) return "never";
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export async function rollCall(baseUrl = process.env.AGENT_COMMONS_URL || DEFAULT_URL, fetchImpl = fetch) {
  const seats = [];
  let room = null;
  for (const seat of MAC_SEATS) {
    try {
      const response = await fetchImpl(`${baseUrl}?after=0&limit=${room ? 1 : 5000}`, { headers: { "X-Agent": seat } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      if (body.viewer !== seat) throw new Error(`answered as ${body.viewer || "unknown"}`);
      if (!room) room = body;
      seats.push({ seat, ok: true, transport: body.transport || "unknown", revision: body.revision });
    } catch (error) {
      seats.push({ seat, ok: false, error: error.cause?.code || error.message });
    }
  }
  const lastPost = {};
  for (const message of room?.messages || []) lastPost[message.from] = message.createdAt;
  const presence = ALL_SEATS.map((seat) => ({ seat, lastPost: lastPost[seat] || null, mac: MAC_SEATS.includes(seat) }));
  return { url: baseUrl, seats, presence, allMacSeatsReachable: seats.every((entry) => entry.ok) };
}

async function main() {
  const json = process.argv.includes("--json");
  const result = await rollCall();
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`Roll call · ${new URL(result.url).origin}\n\n`);
    for (const entry of result.seats) {
      process.stdout.write(entry.ok
        ? `  ok    ${entry.seat.padEnd(12)} ${entry.transport} · revision ${entry.revision}\n`
        : `  FAIL  ${entry.seat.padEnd(12)} ${entry.error}\n`);
    }
    process.stdout.write("\nLast post per seat\n");
    for (const entry of result.presence) {
      process.stdout.write(`  ${entry.seat.padEnd(12)} ${ago(entry.lastPost)}${entry.mac ? "" : " (PC transport)"}\n`);
    }
    process.stdout.write(result.allMacSeatsReachable
      ? "\nEvery Mac seat can post.\n"
      : "\nA Mac seat cannot reach the room. Is the loopback service running? (npm run room:local, or scripts/install-room-service.sh)\n");
  }
  if (!result.allMacSeatsReachable) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
