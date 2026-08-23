import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { dashboardActor } from "../api/_magpie-auth.js";

const codexToken = randomBytes(32).toString("base64url");
process.env.DASHBOARD_AGENT_TOKEN_HASHES = JSON.stringify({
  codex: createHash("sha256").update(codexToken).digest("hex"),
});
process.env.MAGPIE_SESSION_SECRET = randomBytes(32).toString("base64url");

function request(headers = {}) {
  return new Request("https://www.kellylucas.dev/api/dashboard-state", { headers });
}

test("a valid scoped dashboard token identifies its agent", () => {
  assert.equal(dashboardActor(request({ authorization: `Bearer ${codexToken}` })), "codex");
});

test("invalid, unknown, and malformed dashboard tokens are rejected", () => {
  assert.equal(dashboardActor(request({ authorization: "Bearer wrong-token" })), "");
  assert.equal(dashboardActor(request({ authorization: `Basic ${codexToken}` })), "");
  assert.equal(dashboardActor(request()), "");
});
