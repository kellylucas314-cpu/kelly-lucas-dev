import { get, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import {
  dashboardActor,
  isSameOrigin,
  sendJson,
  unauthorized,
} from "./_magpie-auth.js";

const DASHBOARD_PATH = "dashboard/state.json";
const MAX_BODY_BYTES = 128 * 1024;
const TASK_STATUSES = new Set(["now", "in-progress", "waiting", "later", "done"]);

function emptyState() {
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: null,
    updatedBy: null,
    focus: "",
    tasks: [],
    links: [],
    context: [],
    activity: [],
  };
}

async function streamText(stream) {
  const chunks = [];
  for await (const chunk of Readable.fromWeb(stream)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readState() {
  const result = await get(DASHBOARD_PATH, { access: "private" });
  if (!result || result.statusCode !== 200) return emptyState();
  const parsed = JSON.parse(await streamText(result.stream));
  return sanitizeState(parsed, { keepActivity: true });
}

function cleanString(value, maxLength) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, maxLength);
}

function cleanId(value, prefix) {
  const candidate = cleanString(value, 80);
  if (/^[a-z0-9][a-z0-9_-]{2,79}$/i.test(candidate)) return candidate;
  return `${prefix}-${randomUUID()}`;
}

function cleanUrl(value) {
  const candidate = cleanString(value, 2048);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function sanitizeTask(task) {
  const title = cleanString(task?.title, 240);
  if (!title) return null;
  const status = TASK_STATUSES.has(task?.status) ? task.status : "later";
  return {
    id: cleanId(task?.id, "task"),
    title,
    details: cleanString(task?.details, 2400),
    project: cleanString(task?.project, 80),
    due: cleanString(task?.due, 40),
    status,
    priority: ["urgent", "high", "normal", "low"].includes(task?.priority)
      ? task.priority
      : "normal",
    createdAt: cleanString(task?.createdAt, 40) || new Date().toISOString(),
    completedAt: status === "done" ? cleanString(task?.completedAt, 40) : "",
  };
}

function sanitizeLink(link) {
  const title = cleanString(link?.title, 160);
  const url = cleanUrl(link?.url);
  if (!title || !url) return null;
  return {
    id: cleanId(link?.id, "link"),
    title,
    url,
    note: cleanString(link?.note, 600),
  };
}

function sanitizeContext(entry) {
  const title = cleanString(entry?.title, 160);
  const body = cleanString(entry?.body, 6000);
  if (!title || !body) return null;
  return {
    id: cleanId(entry?.id, "context"),
    title,
    body,
    updatedAt: cleanString(entry?.updatedAt, 40) || new Date().toISOString(),
    updatedBy: cleanString(entry?.updatedBy, 32),
  };
}

function sanitizeActivity(entry) {
  const summary = cleanString(entry?.summary, 240);
  if (!summary) return null;
  return {
    id: cleanId(entry?.id, "activity"),
    actor: cleanString(entry?.actor, 32) || "unknown",
    summary,
    at: cleanString(entry?.at, 40) || new Date().toISOString(),
  };
}

export function sanitizeState(value, { keepActivity = false } = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    schemaVersion: 1,
    revision: Number.isSafeInteger(source.revision) && source.revision >= 0
      ? source.revision
      : 0,
    updatedAt: cleanString(source.updatedAt, 40) || null,
    updatedBy: cleanString(source.updatedBy, 32) || null,
    focus: cleanString(source.focus, 500),
    tasks: (Array.isArray(source.tasks) ? source.tasks : [])
      .slice(0, 300)
      .map(sanitizeTask)
      .filter(Boolean),
    links: (Array.isArray(source.links) ? source.links : [])
      .slice(0, 150)
      .map(sanitizeLink)
      .filter(Boolean),
    context: (Array.isArray(source.context) ? source.context : [])
      .slice(0, 100)
      .map(sanitizeContext)
      .filter(Boolean),
    activity: keepActivity
      ? (Array.isArray(source.activity) ? source.activity : [])
        .slice(0, 60)
        .map(sanitizeActivity)
        .filter(Boolean)
      : [],
  };
}

function requestBody(request) {
  const raw = typeof request.body === "string"
    ? request.body
    : JSON.stringify(request.body || {});
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    const error = new Error("Dashboard update is too large");
    error.statusCode = 413;
    throw error;
  }
  return JSON.parse(raw);
}

export default async function handler(request, response) {
  if (!["GET", "PUT"].includes(request.method)) {
    return sendJson(response, { error: "Method not allowed" }, 405, { Allow: "GET, PUT" });
  }

  const actor = dashboardActor(request);
  if (!actor) return unauthorized(response);
  if (request.method === "PUT" && actor === "kelly" && !isSameOrigin(request)) {
    return sendJson(response, { error: "Invalid request origin" }, 403);
  }

  try {
    const current = await readState();
    if (request.method === "GET") {
      return sendJson(response, { ...current, viewer: actor });
    }

    const submitted = requestBody(request);
    const expected = Number.parseInt(String(request.headers?.["if-match"] ?? ""), 10);
    if (!Number.isSafeInteger(expected) || expected !== current.revision) {
      return sendJson(response, {
        error: "The dashboard changed somewhere else. Reload before saving.",
        current: { ...current, viewer: actor },
      }, 409);
    }

    const now = new Date().toISOString();
    const next = sanitizeState(submitted);
    next.revision = current.revision + 1;
    next.updatedAt = now;
    next.updatedBy = actor;
    next.context = next.context.map((entry) => {
      const previous = current.context.find((item) => item.id === entry.id);
      if (previous && previous.title === entry.title && previous.body === entry.body) {
        return previous;
      }
      return { ...entry, updatedAt: now, updatedBy: actor };
    });
    next.activity = [
      {
        id: `activity-${randomUUID()}`,
        actor,
        summary: cleanString(submitted.changeSummary, 240) || "Updated the dashboard",
        at: now,
      },
      ...current.activity,
    ].slice(0, 60);

    await put(DASHBOARD_PATH, JSON.stringify(next, null, 2), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 0,
    });
    return sendJson(response, { ...next, viewer: actor });
  } catch (error) {
    const status = Number.isInteger(error?.statusCode) ? error.statusCode : 503;
    return sendJson(response, {
      error: status === 503
        ? "The private dashboard is temporarily unavailable"
        : error.message,
    }, status);
  }
}
