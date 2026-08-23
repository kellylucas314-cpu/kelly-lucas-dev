import { createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    options[item.slice(2)] = argv[index + 1];
    index += 1;
  }
  return options;
}

const options = parseArguments(process.argv.slice(2));
if (!options.url) {
  throw new Error("--url is required and must be the final HTTPS /api/agent-room endpoint");
}
const upstream = new URL(options.url);
if (upstream.protocol !== "https:" || upstream.pathname !== "/api/agent-room" ||
    upstream.username || upstream.password || upstream.search || upstream.hash) {
  throw new Error("--url must be a credential-free HTTPS URL ending at /api/agent-room");
}

const actors = options.actors
  ? options.actors.split(",").map((actor) => actor.trim()).filter(Boolean)
  : ["kelly", "codex", "claude-code", "kip", "vellum"];
const invalid = actors.find((actor) => !/^[a-z][a-z0-9_-]{1,31}$/i.test(actor));
if (invalid) throw new Error(`Invalid agent name: ${invalid}`);
if (!actors.includes("kelly") || !actors.includes("kip")) {
  throw new Error("The one-room credential bundle must include both kelly and kip");
}

const outputDirectory = path.resolve(options.out || path.join(PROJECT_ROOT, ".agent-room-local", "credentials"));
const projectRelativeOutput = path.relative(PROJECT_ROOT, outputDirectory);
if (projectRelativeOutput && !projectRelativeOutput.startsWith("..") &&
    projectRelativeOutput !== ".agent-room-local" &&
    !projectRelativeOutput.startsWith(`.agent-room-local${path.sep}`)) {
  throw new Error("Credential output inside the project must stay under ignored .agent-room-local/");
}
await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
await chmod(outputDirectory, 0o700);

const tokens = Object.fromEntries(
  actors.map((actor) => [actor.toLowerCase(), randomBytes(32).toString("base64url")]),
);
const hashes = Object.fromEntries(
  Object.entries(tokens).map(([actor, token]) => [
    actor,
    createHash("sha256").update(token).digest("hex"),
  ]),
);

const macTokens = Object.fromEntries(
  Object.entries(tokens).filter(([actor]) => actor !== "kip"),
);
const hashesFile = path.join(outputDirectory, "vercel-token-hashes.json");
const upstreamFile = path.join(outputDirectory, "mac-upstream.json");
const kipFile = path.join(outputDirectory, "kip.env");

async function writePrivateFile(filename, content) {
  await writeFile(filename, content, { mode: 0o600 });
  await chmod(filename, 0o600);
}

await writePrivateFile(hashesFile, `${JSON.stringify(hashes, null, 2)}\n`);
await writePrivateFile(upstreamFile, `${JSON.stringify({
  url: upstream.toString(),
  tokens: macTokens,
}, null, 2)}\n`);
await writePrivateFile(kipFile, [
  `AGENT_COMMONS_URL=${upstream.toString()}`,
  `KELLY_DASHBOARD_TOKEN=${tokens.kip}`,
  "",
].join("\n"));

console.log("Agent Commons credential files created with private permissions:");
console.log(`Vercel hashes: ${hashesFile}`);
console.log(`Mac proxy config: ${upstreamFile}`);
console.log(`Kip PC environment: ${kipFile}`);
console.log("Raw token values were not printed. Do not paste these files into chat, Git, Agent Mail, or screenshots.");
