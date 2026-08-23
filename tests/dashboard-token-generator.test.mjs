import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

function runGenerator(outputDirectory) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      path.resolve("scripts/generate-dashboard-tokens.mjs"),
      "--url", "https://agent-commons.example/api/agent-room",
      "--out", outputDirectory,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("credential generation writes private files without printing raw tokens", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-room-credentials-test-"));
  const outputDirectory = path.join(directory, "credentials");

  try {
    const result = await runGenerator(outputDirectory);
    assert.equal(result.code, 0);
    assert.equal(result.stderr, "");

    const hashes = JSON.parse(await readFile(path.join(outputDirectory, "vercel-agent-room-token-hashes.json"), "utf8"));
    const upstream = JSON.parse(await readFile(path.join(outputDirectory, "mac-upstream.json"), "utf8"));
    const kipEnvironment = await readFile(path.join(outputDirectory, "kip.env"), "utf8");
    const kipToken = kipEnvironment.match(/^KELLY_DASHBOARD_TOKEN=(.+)$/m)?.[1];

    assert.deepEqual(Object.keys(hashes).sort(), ["claude-code", "codex", "kelly", "kip", "vellum"]);
    assert.deepEqual(Object.keys(upstream.tokens).sort(), ["claude-code", "codex", "kelly", "vellum"]);
    assert.equal(upstream.url, "https://agent-commons.example/api/agent-room");
    assert.ok(kipToken);
    assert.equal(createHash("sha256").update(kipToken).digest("hex"), hashes.kip);
    assert.doesNotMatch(result.stdout, new RegExp(kipToken));
    assert.doesNotMatch(result.stdout, /KELLY_DASHBOARD_TOKEN=/);

    assert.equal((await stat(outputDirectory)).mode & 0o077, 0);
    for (const filename of ["vercel-agent-room-token-hashes.json", "mac-upstream.json", "kip.env"]) {
      assert.equal((await stat(path.join(outputDirectory, filename))).mode & 0o077, 0);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("credential generation refuses a tracked-looking output directory", async () => {
  const result = await runGenerator(path.resolve("credentials"));
  assert.equal(result.code, 1);
  assert.match(result.stderr, /must stay under ignored \.agent-room-local/);
  assert.equal(result.stdout, "");
});
