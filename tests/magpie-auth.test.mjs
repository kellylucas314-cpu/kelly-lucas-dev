import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import test from "node:test";
import {
  canUseLibrary,
  clipKey,
  clearSessionCookie,
  createSessionCookie,
  isAuthenticated,
  verifyPassword,
} from "../api/_magpie-auth.js";

const password = "correct horse battery staple";
const salt = randomBytes(16).toString("base64url");
process.env.MAGPIE_PASSWORD_RECORD =
  `${salt}.${scryptSync(password, salt, 32).toString("hex")}`;
process.env.MAGPIE_SESSION_SECRET = randomBytes(32).toString("base64url");

function request(cookie = "", protocol = "https:") {
  return new Request(`${protocol}//www.kellylucas.dev/api/test`, {
    headers: cookie ? { cookie } : {},
  });
}

test("password record accepts only the configured password", () => {
  assert.equal(verifyPassword(password), true);
  assert.equal(verifyPassword("wrong"), false);
});

test("signed session cookie authenticates and tampering fails", () => {
  const issued = createSessionCookie(request());
  const cookiePair = issued.split(";")[0];
  assert.equal(isAuthenticated(request(cookiePair)), true);
  assert.equal(isAuthenticated(request(`${cookiePair}x`)), false);
});

test("local cookies omit Secure and logout expires the session", () => {
  assert.equal(createSessionCookie(request("", "http:")).includes("Secure"), false);
  assert.match(clearSessionCookie(request()), /Max-Age=0/);
});

test("the feather key opens the library, and only the exact key", () => {
  const key = clipKey();
  assert.match(key, /^mgp_[A-Za-z0-9_-]{40,}$/);
  const withKey = (value) => new Request("https://www.kellylucas.dev/api/test", { headers: { authorization: `Bearer ${value}` } });
  assert.equal(canUseLibrary(withKey(key)), true);
  assert.equal(canUseLibrary(withKey(key + "x")), false);
  assert.equal(canUseLibrary(withKey("mgp_" + "a".repeat(43))), false);
  assert.equal(canUseLibrary(request()), false);
});
