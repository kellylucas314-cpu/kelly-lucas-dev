import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

function runBuilder(outputDirectory) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      path.resolve("scripts/build-agent-commons-service.mjs"),
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

test("the deploy bundle contains only the Agent Commons API service", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-commons-bundle-test-"));
  const outputDirectory = path.join(directory, "bundle");

  try {
    const result = await runBuilder(outputDirectory);
    assert.equal(result.code, 0);
    assert.equal(result.stderr, "");
    assert.deepEqual((await readdir(outputDirectory)).sort(), ["api", "lib", "package.json", "vercel.json"]);
    assert.deepEqual(await readdir(path.join(outputDirectory, "api")), ["agent-room.js"]);
    assert.deepEqual(await readdir(path.join(outputDirectory, "lib")), ["agent-room-auth.js"]);

    const packageFile = JSON.parse(await readFile(path.join(outputDirectory, "package.json"), "utf8"));
    assert.equal(packageFile.name, "kelly-agent-commons-service");
    assert.equal(packageFile.dependencies, undefined);
    const handler = await readFile(path.join(outputDirectory, "api", "agent-room.js"), "utf8");
    assert.match(handler, /agentRoomActor/);
    assert.match(handler, /AGENT_COMMONS_STORE_URL/);
    assert.doesNotMatch(handler, /@vercel\/blob/iu);
    assert.doesNotMatch(handler, /magpie/iu);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rebuilding preserves only the intended Vercel project link", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-commons-link-test-"));
  const outputDirectory = path.join(directory, "bundle");
  const projectLink = {
    orgId: "team_test",
    projectId: "project_test",
    projectName: "kelly-agent-commons-service",
  };

  try {
    assert.equal((await runBuilder(outputDirectory)).code, 0);
    await mkdir(path.join(outputDirectory, ".vercel"));
    await writeFile(
      path.join(outputDirectory, ".vercel", "project.json"),
      `${JSON.stringify(projectLink)}\n`,
    );

    const result = await runBuilder(outputDirectory);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /Preserved Vercel link/);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDirectory, ".vercel", "project.json"), "utf8")),
      projectLink,
    );
    assert.equal((await stat(path.join(outputDirectory, ".vercel", "project.json"))).mode & 0o077, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
