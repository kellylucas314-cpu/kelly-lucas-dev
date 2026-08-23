import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
const outputDirectory = path.resolve(
  options.out || path.join(PROJECT_ROOT, ".agent-room-local", "deploy"),
);
const relativeOutput = path.relative(PROJECT_ROOT, outputDirectory);
if (!relativeOutput || (relativeOutput && !relativeOutput.startsWith("..") &&
    relativeOutput !== ".agent-room-local" &&
    !relativeOutput.startsWith(`.agent-room-local${path.sep}`))) {
  throw new Error("Deploy output inside the project must stay under ignored .agent-room-local/");
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(path.join(outputDirectory, "api"), { recursive: true, mode: 0o700 });
await mkdir(path.join(outputDirectory, "lib"), { recursive: true, mode: 0o700 });

for (const relativePath of [
  "api/agent-room.js",
  "lib/agent-room-auth.js",
  "lib/agent-room-model.js",
]) {
  await copyFile(path.join(PROJECT_ROOT, relativePath), path.join(outputDirectory, relativePath));
}

const rootPackage = JSON.parse(await readFile(path.join(PROJECT_ROOT, "package.json"), "utf8"));
await writeFile(path.join(outputDirectory, "package.json"), `${JSON.stringify({
  name: "kelly-agent-commons-service",
  private: true,
  type: "module",
  dependencies: {
    "@vercel/blob": rootPackage.dependencies["@vercel/blob"],
  },
}, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "vercel.json"), `${JSON.stringify({
  $schema: "https://openapi.vercel.sh/vercel.json",
  headers: [{
    source: "/api/agent-room",
    headers: [
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ],
  }],
}, null, 2)}\n`);

process.stdout.write(`Agent Commons API-only deploy bundle: ${outputDirectory}\n`);
process.stdout.write("Contains only the room API, authentication, model, package manifest, and security headers.\n");
