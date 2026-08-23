import { createHash, randomBytes } from "node:crypto";

const actors = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["codex", "claude-code", "kip", "vellum", "grok-chief-of-staff"];
const invalid = actors.find((actor) => !/^[a-z][a-z0-9_-]{1,31}$/i.test(actor));
if (invalid) throw new Error(`Invalid agent name: ${invalid}`);

const tokens = Object.fromEntries(
  actors.map((actor) => [actor.toLowerCase(), randomBytes(32).toString("base64url")]),
);
const hashes = Object.fromEntries(
  Object.entries(tokens).map(([actor, token]) => [
    actor,
    createHash("sha256").update(token).digest("hex"),
  ]),
);

console.log("Add this JSON as the Vercel environment variable DASHBOARD_AGENT_TOKEN_HASHES:\n");
console.log(JSON.stringify(hashes));
console.log("\nGive each raw token only to its named agent environment:\n");
for (const [actor, token] of Object.entries(tokens)) {
  console.log(`${actor.toUpperCase()}_DASHBOARD_TOKEN=${token}`);
}
console.log("\nThese raw tokens are shown once and are not written to disk.");
