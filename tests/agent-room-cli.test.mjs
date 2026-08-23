import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createLocalRoomServer } from "../scripts/agent-room-local.mjs";

function runCli(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve("scripts/agent-room-cli.mjs"), ...args], {
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
  const result = await runCli(["list"], {
    AGENT_COMMONS_URL: "http://agent-commons.invalid/api/agent-room",
    KELLY_DASHBOARD_TOKEN: "test-token-must-not-leave",
  });

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Refusing to send KELLY_DASHBOARD_TOKEN over a non-HTTPS/);
  assert.doesNotMatch(result.stderr, /test-token-must-not-leave/);
});

test("the CLI logs a structured work receipt for Kelly", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-room-cli-test-"));
  const stateFile = path.join(directory, "state.json");
  const server = createLocalRoomServer({ stateFile });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/api/agent-room`;

  try {
    const result = await runCli([
      "log",
      "--actor", "codex",
      "--project", "Agent Commons",
      "--did", "Added work receipts",
      "--result", "Kelly has a readable work log",
      "--output", "/tmp/receipt-one",
      "--output", "/tmp/receipt-two",
      "--needs-kelly", "Review the transport decision",
      "--next", "Connect Kip after approval",
    ], {
      AGENT_COMMONS_URL: url,
      KELLY_DASHBOARD_TOKEN: "",
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Logged as codex: receipt 1/);
    const response = await fetch(url, { headers: { "X-Agent": "kelly" } });
    const room = await response.json();
    assert.equal(room.messages[0].kind, "receipt");
    assert.equal(room.messages[0].receipt.project, "Agent Commons");
    assert.deepEqual(room.messages[0].receipt.outputs, ["/tmp/receipt-one", "/tmp/receipt-two"]);
    assert.deepEqual(room.messages[0].waitingOn, ["kelly"]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
