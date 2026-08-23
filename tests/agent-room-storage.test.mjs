import assert from "node:assert/strict";
import test from "node:test";
import {
  blobEtag,
  blobWriteOptions,
  storageErrorSummary,
} from "../api/agent-room.js";

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

test("Blob writes use the supported minimum cache duration", () => {
  assert.deepEqual(blobWriteOptions(null), {
    access: "private",
    allowOverwrite: false,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
  });
  assert.deepEqual(blobWriteOptions('"room-etag"'), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
    ifMatch: '"room-etag"',
  });
});

test("storage diagnostics expose only safe error metadata", () => {
  const error = Object.assign(new Error("contains private provider detail"), {
    code: "store_suspended",
    statusCode: 503,
    token: "never-log-this",
  });
  assert.deepEqual(storageErrorSummary(error), {
    name: "Error",
    code: "store_suspended",
    statusCode: 503,
  });
});
