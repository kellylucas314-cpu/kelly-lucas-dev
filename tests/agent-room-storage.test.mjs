import assert from "node:assert/strict";
import test from "node:test";
import { blobEtag } from "../api/agent-room.js";

test("the room reads the ETag from the current Vercel Blob result shape", () => {
  assert.equal(blobEtag({
    blob: { etag: '"nested-etag"' },
    headers: new Headers({ etag: '"header-etag"' }),
  }), '"nested-etag"');
});

test("the room falls back to the response ETag header", () => {
  assert.equal(blobEtag({
    headers: new Headers({ etag: '"header-etag"' }),
  }), '"header-etag"');
  assert.equal(blobEtag({}), "");
});
