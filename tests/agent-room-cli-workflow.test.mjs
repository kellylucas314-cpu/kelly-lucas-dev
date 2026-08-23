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
      env: { ...process.env, KELLY_DASHBOARD_TOKEN: "", ...env },
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

async function startServer() {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-room-cli-workflow-"));
  const server = createLocalRoomServer({ stateFile: path.join(directory, "state.json") });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}/api/agent-room`;
  return {
    url,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      await rm(directory, { recursive: true, force: true });
    },
  };
}

test("the CLI runs the full human-agent workflow with JSON output and derived state", async () => {
  const { url, stop } = await startServer();
  const env = { AGENT_COMMONS_URL: url };
  const cli = async (...args) => {
    const result = await runCli(args, env);
    assert.equal(result.code, 0, `${args.join(" ")}\n${result.stderr}`);
    return result;
  };
  const json = async (...args) => JSON.parse((await cli(...args, "--json")).stdout);

  try {
    // 1. Codex asks Claude in a named project thread.
    const asked = await json("send", "--actor", "codex", "--to", "claude-code", "--kind", "question",
      "--title", "Lantern demo deck", "--waiting", "claude-code",
      "--body", "Claude, which export format should the deck use?");
    assert.equal(asked.message.threadId, "lantern-demo-deck");
    assert.equal(asked.message.thread.title, "Lantern demo deck");

    // 2. Claude's inbox shows it with a reason, actionable, unread.
    const claudeInbox = await json("inbox", "--actor", "claude-code");
    assert.equal(claudeInbox.inbox.length, 1);
    assert.equal(claudeInbox.inbox[0].reason, "waiting-on-you");
    assert.equal(claudeInbox.inbox[0].unread, true);
    assert.equal(claudeInbox.inbox[0].threadTitle, "Lantern demo deck");
    const plain = await cli("inbox", "--actor", "claude-code");
    assert.match(plain.stdout, /1 actionable · 1 unread/);
    assert.match(plain.stdout, /waiting on you · actionable · unread/);

    // 3. Claude acknowledges, replies in the thread, and assigns Kip.
    await cli("ack", "--actor", "claude-code", "--through", "1");
    const reply = await json("reply", "--actor", "claude-code", "--thread", "lantern-demo-deck",
      "--to", "codex,kip", "--reply", asked.message.id, "--waiting", "kip", "--next-owner", "kip",
      "--body", "PDF. Kip, please run the export.");
    assert.equal(reply.message.replyTo, asked.message.id);
    assert.deepEqual(reply.message.waitingOn, ["kip"]);
    assert.equal((await json("inbox", "--actor", "claude-code")).inbox.length, 0);

    // 4. Claude hands off to Kip with Kelly copied.
    const handoff = await json("handoff", "--actor", "claude-code", "--to", "kip,kelly",
      "--project", "Lantern demo", "--thread", "lantern-demo-deck", "--next-owner", "kip",
      "--output", "/Users/example/Projects/lantern-demo/output/",
      "--why", "Friday build", "--action", "Run the export", "--next", "Kelly picks the cover",
      "--body", "Export pipeline is ready; run it on the PC.");
    assert.equal(handoff.message.kind, "handoff");
    assert.equal(handoff.message.note.nextOwner, "kip");
    assert.deepEqual(handoff.message.note.outputs, ["/Users/example/Projects/lantern-demo/output/"]);
    const kipInbox = await json("inbox", "--actor", "kip");
    assert.deepEqual(kipInbox.inbox.map((item) => item.reason), ["handed-to-you", "addressed-to-you"]);
    assert.equal(kipInbox.inbox[0].actionable, true);

    // 5. Claude posts a structured receipt that needs Kelly.
    const receipt = await json("log", "--actor", "claude-code", "--project", "Lantern demo",
      "--thread", "lantern-demo-deck", "--did", "Chose PDF and handed the run to Kip",
      "--result", "PDF is the standard", "--output", "/Users/example/Projects/lantern-demo/DECISIONS.md",
      "--needs-kelly", "Confirm PDF for the investor copy", "--next-owner", "kelly",
      "--next", "Kip runs the export", "--health", "on-track");
    assert.equal(receipt.message.receipt.health, "on-track");
    assert.equal(receipt.message.receipt.nextOwner, "kelly");
    assert.deepEqual(receipt.message.waitingOn, ["kelly"]);

    // 6. Kelly's threads and inbox surface exactly that item.
    const kellyThreads = await json("threads", "--actor", "kelly");
    assert.equal(kellyThreads.threads.length, 1);
    assert.equal(kellyThreads.threads[0].needsKelly, true);
    assert.equal(kellyThreads.threads[0].waitingSeq, receipt.message.seq);
    const kellyInbox = await json("inbox", "--actor", "kelly");
    assert.equal(kellyInbox.inbox[0].seq, receipt.message.seq);
    assert.equal(kellyInbox.inbox[0].reason, "waiting-on-you");

    // 7. Kelly decides and resolves in the same thread.
    const decision = await json("reply", "--actor", "kelly", "--thread", "lantern-demo-deck",
      "--kind", "decision", "--reply", receipt.message.id, "--resolve", "--body", "PDF is fine.");
    assert.equal(decision.message.thread.status, "resolved");
    const resolvedThreads = await json("threads", "--actor", "kelly", "--all");
    assert.equal(resolvedThreads.threads[0].status, "resolved");
    assert.equal(resolvedThreads.threads[0].resolvedBy, "kelly");
    assert.equal((await json("threads", "--actor", "kelly")).threads.length, 0);

    // 8. Full history remains; queues are empty for everyone.
    for (const actor of ["codex", "claude-code", "kip", "vellum", "kelly"]) {
      const shown = await json("show", "--actor", actor, "--thread", "lantern-demo-deck");
      assert.equal(shown.messages.length, 5);
      assert.deepEqual(shown.messages[0].waitingOn, ["claude-code"]);
      assert.equal((await json("inbox", "--actor", actor)).inbox.length, 0);
    }

    // Reopen is append-only too.
    await cli("reopen", "--actor", "kip", "--thread", "lantern-demo-deck", "--waiting", "kelly", "--body", "Back cover?");
    const reopened = await json("threads", "--actor", "kelly");
    assert.equal(reopened.threads[0].status, "waiting");
    assert.equal(reopened.threads[0].reopened, true);
    assert.equal((await json("show", "--actor", "kelly", "--thread", "lantern-demo-deck")).messages.length, 6);
  } finally {
    await stop();
  }
});

test("the CLI gives clear validation errors without leaking tokens", async () => {
  const { url, stop } = await startServer();
  try {
    const missingOwner = await runCli(["handoff", "--actor", "codex", "--to", "kip", "--project", "X", "--body", "y"], { AGENT_COMMONS_URL: url });
    assert.equal(missingOwner.code, 1);
    assert.match(missingOwner.stderr, /--next-owner is required for a handoff/);

    const missingBody = await runCli(["reply", "--actor", "codex", "--thread", "x-y"], { AGENT_COMMONS_URL: url });
    assert.equal(missingBody.code, 1);
    assert.match(missingBody.stderr, /--body is required/);

    const danglingFlag = await runCli(["send", "--actor", "codex", "--body"], { AGENT_COMMONS_URL: url });
    assert.equal(danglingFlag.code, 1);
    assert.match(danglingFlag.stderr, /--body needs a value/);

    const unknownThread = await runCli(["show", "--actor", "codex", "--thread", "nope-nope"], { AGENT_COMMONS_URL: url });
    assert.equal(unknownThread.code, 1);
    assert.match(unknownThread.stderr, /No thread named nope-nope/);

    const secret = "secret-token-value-0000000000000000";
    const leak = await runCli(["inbox", "--actor", "codex"], {
      AGENT_COMMONS_URL: "https://127.0.0.1:1/api/agent-room",
      KELLY_DASHBOARD_TOKEN: secret,
    });
    assert.equal(leak.code, 1);
    assert.match(leak.stderr, /Could not reach the room/);
    assert.doesNotMatch(leak.stdout + leak.stderr, new RegExp(secret));
  } finally {
    await stop();
  }
});

test("receipts default to the project thread and legacy work-log receipts still list", async () => {
  const { url, stop } = await startServer();
  const env = { AGENT_COMMONS_URL: url };
  try {
    const logged = await runCli(["log", "--actor", "vellum", "--project", "Wiki inbox", "--did", "Triaged seven captures", "--json"], env);
    assert.equal(logged.code, 0);
    assert.equal(JSON.parse(logged.stdout).message.threadId, "wiki-inbox");
    const legacy = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Agent": "codex" },
      body: JSON.stringify({ body: "Project: Old\nDid: legacy", kind: "receipt", threadId: "work-log", receipt: { project: "Old", did: "legacy" } }),
    });
    assert.equal(legacy.status, 201);
    const listed = await runCli(["list", "--actor", "kelly"], env);
    assert.match(listed.stdout, /Wiki inbox \(wiki-inbox\)/);
    assert.match(listed.stdout, /Work log \(work-log\)/);
  } finally {
    await stop();
  }
});
