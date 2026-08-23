import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";

function runCli(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve("scripts/agent-room-cli.mjs"), "list"], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("the CLI refuses to attach an agent token to a non-HTTPS URL", async () => {
  const result = await runCli({
    AGENT_COMMONS_URL: "http://agent-commons.invalid/api/agent-room",
    KELLY_DASHBOARD_TOKEN: "test-token-must-not-leave",
  });

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Refusing to send KELLY_DASHBOARD_TOKEN over a non-HTTPS/);
  assert.doesNotMatch(result.stderr, /test-token-must-not-leave/);
});
