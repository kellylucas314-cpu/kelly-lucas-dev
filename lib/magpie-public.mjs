/* What a visitor may see.

   Magpie can be opened to visitors (Kelly, 2026-11-13: "i dont want it to
   have a password"). Reading is open; adding, editing and deleting still
   need Kelly's sign-in or the feather's key. This file is the one place
   that decides what a visitor gets, and it leans private:

   - Nothing is public until Kelly opens the library (`lib.publicOn`).
   - A clip shows only if its collection is on the open list
     (`lib.publicCollections`), it is not in Trash and it is not marked
     `private`. Unsorted is never public, so a new clip Magpie could not
     place waits out of sight.
   - The HelioFlux section can never be opened, whatever the list says.
   - A visitor gets the card (title, address, site, picture, tags, Kelly's
     own note), never the saved copy of the page: other people's writing is
     linked, not republished.
   - Clips that look personal are marked private when the library opens and
     when they are saved. Kelly can release any of them. */

import { SECTIONS, sectionTargets } from "./magpie-sections.mjs";

/* The sections that open by default. HelioFlux is company work and stays
   Kelly's; any collection she made herself stays private until she opens it. */
export const OPEN_SECTIONS = ["code", "design-tools", "inspo", "read-watch", "science", "weird"];
const NEVER_OPEN = "helioflux";

const PERSONAL_HOSTS = [
  "mail.google.com", "docs.google.com", "drive.google.com", "calendar.google.com", "photos.google.com",
  "accounts.google.com", "myaccount.google.com", "meet.google.com", "outlook.live.com", "outlook.office.com",
  "icloud.com", "dropbox.com", "box.com", "onedrive.live.com", "sharepoint.com",
  "notion.so", "app.notion.com", "airtable.com", "coda.io", "app.slack.com", "discord.com/channels", "web.whatsapp.com",
  "messenger.com", "linkedin.com/messaging", "linkedin.com/feed", "zoom.us", "calendly.com", "docusign.com",
  "paypal.com", "venmo.com", "dashboard.stripe.com", "app.mercury.com", "dashboard.brex.com", "app.ramp.com",
  "app.gusto.com", "app.carta.com",
  "chase.com", "bankofamerica.com", "wellsfargo.com", "capitalone.com", "americanexpress.com", "fidelity.com",
  "schwab.com", "vanguard.com", "robinhood.com", "coinbase.com", "irs.gov", "turbotax.intuit.com", "quickbooks.intuit.com",
  "mychart.com", "onemedical.com", "zocdoc.com", "healthcare.gov",
  "amazon.com/gp/your-account", "airbnb.com/trips", "console.cloud.google.com", "dash.cloudflare.com",
  "vercel.com/kellylucas314-cpus-projects",
  "chatgpt.com", "chat.openai.com", "claude.ai", "gemini.google.com", "perplexity.ai/search",
];
const PERSONAL_TAGS = new Set([
  "private", "personal", "helioflux", "investor", "investors", "fundraising", "password", "confidential",
  "internal", "family", "tax", "taxes",
]);
const SECRET_PARAM = /[?&#](token|access_token|auth|key|apikey|api_key|sig|signature|session|sid|share|invite|code|password|pwd|secret)=/i;
const PERSONAL_WORDS = /\b(confidential|do not share|don[’']t share|password|passcode|term sheet|cap table|investor update|data room|social security number)\b/i;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/;
const LOCAL_HOST = /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i;

const hostOf = (value) => {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

/* Why a clip should stay private, in a few plain words, or "" when nothing
   stands out. A guess that errs toward keeping things in. */
export function looksPersonal(item = {}) {
  const url = String(item.url || "");
  const host = hostOf(url);
  const path = (() => {
    try { return host + new URL(url).pathname.toLowerCase(); } catch { return host; }
  })();
  const tags = (Array.isArray(item.tags) ? item.tags : []).map((tag) => String(tag).toLowerCase());
  const own = [item.title, item.note].map((part) => String(part || "")).join(" \n ");

  if (!host) return "it has no web address";
  if (LOCAL_HOST.test(host)) return "it is on a private network";
  if (/helioflux/i.test(host) || /helioflux/i.test(own) || tags.includes("helioflux") || tags.includes("desk:website")) return "it is HelioFlux work";
  const personalHost = PERSONAL_HOSTS.find((entry) => (entry.includes("/") ? path.startsWith(entry) : host === entry || host.endsWith("." + entry)));
  if (personalHost) return `it is on ${personalHost.split("/")[0]}, which is usually a signed-in page`;
  if (SECRET_PARAM.test(url)) return "its address carries a key or share code";
  const tag = tags.find((entry) => PERSONAL_TAGS.has(entry));
  if (tag) return `it is tagged ${tag}`;
  if (EMAIL.test(String(item.note || ""))) return "your note has an email address in it";
  if (PHONE.test(String(item.note || ""))) return "your note has a phone number in it";
  const word = own.match(PERSONAL_WORDS);
  if (word) return `it mentions “${word[0].toLowerCase()}”`;
  return "";
}

/* The collection ids a visitor may look inside. */
export function openCollections(lib) {
  if (!lib || !lib.publicOn) return new Set();
  const exists = new Set((lib.collections || []).map((entry) => entry.id));
  const never = sectionTargets(lib).get(NEVER_OPEN) || NEVER_OPEN;
  return new Set((Array.isArray(lib.publicCollections) ? lib.publicCollections : [])
    .filter((id) => exists.has(id) && id !== never && id !== NEVER_OPEN));
}

export function isVisible(lib, item, open = openCollections(lib)) {
  return Boolean(item) && !item.removed && !item.private && Boolean(item.collection) && open.has(item.collection);
}

const short = (value, max) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
};

/* One clip as a visitor gets it: the card, not the saved page. */
function publicItem(item) {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    site: item.site,
    author: item.author || "",
    type: item.type,
    description: short(item.description, 300),
    note: String(item.note || ""),
    tags: (Array.isArray(item.tags) ? item.tags : []).filter((tag) => tag !== "magpie" && !String(tag).startsWith("desk:")),
    thumbLocal: item.thumbLocal || "",
    clippedAt: item.clippedAt || "",
    collection: item.collection,
    hasTranscript: Boolean(item.hasTranscript),
  };
}

/* The whole library as a visitor gets it. */
export function publicView(lib) {
  const open = openCollections(lib);
  const collections = (lib.collections || [])
    .filter((entry) => open.has(entry.id))
    .map((entry) => ({ ...entry, parent: open.has(entry.parent) ? entry.parent : "" }));
  return {
    version: 2,
    visitor: true,
    publicOn: lib.publicOn || "",
    collections,
    items: (lib.items || []).filter((item) => isVisible(lib, item, open)).map(publicItem),
  };
}

/* A picture a visitor may load: one that belongs to a clip they can see. */
export function isPublicThumb(lib, name) {
  const open = openCollections(lib);
  if (!open.size) return false;
  return (lib.items || []).some((item) => isVisible(lib, item, open) && String(item.thumbLocal || "").split("/").pop() === name);
}

const sectionCollections = (lib) => {
  const targets = sectionTargets(lib);
  return OPEN_SECTIONS.map((id) => targets.get(id)).filter(Boolean);
};

/* What opening would do, without doing it. */
export function planPublic(lib) {
  const targets = sectionTargets(lib);
  const wouldOpen = lib.publicOn ? [...openCollections(lib)] : sectionCollections(lib);
  const open = new Set(wouldOpen);
  const nameOf = (id) => (lib.collections.find((entry) => entry.id === id) || {}).name || id;
  const counts = [];
  const held = [];
  let total = 0;
  for (const id of wouldOpen) {
    const inside = lib.items.filter((item) => !item.removed && item.collection === id);
    let shown = 0;
    for (const item of inside) {
      const why = item.private ? (item.privateWhy || "you kept it private") : item.released ? "" : looksPersonal(item);
      if (why) held.push({ id: item.id, title: item.title, site: item.site || "", why });
      else shown += 1;
    }
    total += shown;
    counts.push({ id, name: nameOf(id), count: shown });
  }
  const never = targets.get(NEVER_OPEN) || NEVER_OPEN;
  const closed = lib.collections
    .filter((entry) => !open.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      count: lib.items.filter((item) => !item.removed && item.collection === entry.id).length,
      locked: entry.id === never,
    }));
  return {
    on: Boolean(lib.publicOn),
    ready: Boolean(lib.sectionsOn) && wouldOpen.length > 0,
    total,
    counts,
    held,
    closed,
    unsorted: lib.items.filter((item) => !item.removed && !item.collection).length,
  };
}

/* Opens the library. Returns what changed so it can be undone. */
export function openLibrary(lib, stamp) {
  if (!lib.sectionsOn) throw Object.assign(new Error("Sort the library into sections first"), { status: 400 });
  const open = sectionCollections(lib);
  if (!open.length) throw Object.assign(new Error("There are no sections to open yet"), { status: 400 });
  const marked = [];
  const inside = new Set(open);
  for (const item of lib.items) {
    if (item.removed || item.private || item.released || !inside.has(item.collection)) continue;
    const why = looksPersonal(item);
    if (!why) continue;
    item.private = true;
    item.privateWhy = why;
    marked.push(item.id);
  }
  lib.publicOn = stamp;
  lib.publicCollections = open;
  return { marked };
}

export function closeLibrary(lib) {
  delete lib.publicOn;
}

/* A new clip, saved while the library is open: keep it in if it looks
   personal. Kelly's own choice (private or released) is never overridden. */
export function guardNewClip(lib, item) {
  if (!lib.publicOn || item.private || item.released) return false;
  const why = looksPersonal(item);
  if (!why) return false;
  item.private = true;
  item.privateWhy = why;
  return true;
}

export const SECTION_NAMES = Object.fromEntries(SECTIONS.map((section) => [section.id, section.name]));
