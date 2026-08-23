import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeState } from "../api/dashboard-state.js";

test("dashboard state keeps safe tasks and rejects unsafe links", () => {
  const result = sanitizeState({
    revision: 4,
    focus: "  Finish the packet  ",
    tasks: [
      { id: "task-abc", title: "Send packet", status: "now", priority: "urgent" },
      { id: "task-def", title: "Maybe someday", status: "invented" },
      { id: "task-empty", title: "  " },
    ],
    links: [
      { id: "link-safe", title: "Useful", url: "https://example.com/path" },
      { id: "link-bad", title: "Unsafe", url: "javascript:alert(1)" },
    ],
  });

  assert.equal(result.focus, "Finish the packet");
  assert.equal(result.tasks.length, 2);
  assert.equal(result.tasks[0].status, "now");
  assert.equal(result.tasks[1].status, "later");
  assert.equal(result.links.length, 1);
  assert.equal(result.links[0].url, "https://example.com/path");
});

test("client submissions cannot preserve their own activity records", () => {
  const submitted = sanitizeState({
    activity: [{ id: "activity-fake", actor: "admin", summary: "Fake history" }],
  });
  const stored = sanitizeState({
    activity: [{ id: "activity-real", actor: "kelly", summary: "Real history" }],
  }, { keepActivity: true });

  assert.deepEqual(submitted.activity, []);
  assert.equal(stored.activity.length, 1);
  assert.equal(stored.activity[0].actor, "kelly");
});
