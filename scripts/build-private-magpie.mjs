import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const worktree = path.resolve(import.meta.dirname, "..");
const sourceRoot = process.env.MAGPIE_SOURCE ||
  "/Users/kellylucas/Documents/GitHub/kip-workspace/magpie";
const sourceGallery = path.join(sourceRoot, "gallery.html");
const targetGallery = path.join(worktree, "brain", "gallery.html");
const targetGalaxy = path.join(worktree, "brain", "galaxy.html");

let html = await readFile(sourceGallery, "utf8");

function replaceOnce(search, replacement, label) {
  const next = html.replace(search, replacement);
  if (next === html) throw new Error(`Could not update ${label}`);
  html = next;
}

replaceOnce(
  "<title>Magpie — gallery</title>",
  "<meta name=\"robots\" content=\"noindex,nofollow,noarchive\">\n<title>Magpie Private Library</title>",
  "page title",
);

replaceOnce(
  /<script>\nconst ITEMS = \[.*\];\nconst VAULT_NAME/s,
  `<script type="module">
let ITEMS = [];
try {
  const response = await fetch("/api/magpie-library", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (response.status === 401) {
    const returnTo = location.pathname + location.search;
    location.replace("/brain/login.html?returnTo=" + encodeURIComponent(returnTo));
    throw new Error("Authentication required");
  }
  if (!response.ok) throw new Error("Library unavailable");
  const payload = await response.json();
  ITEMS = Array.isArray(payload.items) ? payload.items : [];
} catch (error) {
  if (error.message !== "Authentication required") {
    document.getElementById("loading").textContent =
      "Magpie could not open the private library. Please refresh and try again.";
    document.getElementById("loading").classList.add("error");
  }
  throw error;
}
document.getElementById("loading").hidden = true;
const VAULT_NAME`,
  "private library loader",
);

replaceOnce(
  '      <svg width="44" height="44" viewBox="0 0 120 120" aria-hidden="true" class="feather">',
  '      <a class="feather-home" href="/brain/gallery.html" aria-label="Magpie library home"><svg width="44" height="44" viewBox="0 0 120 120" aria-hidden="true" class="feather">',
  "feather home link",
);
replaceOnce(
  "</svg>\n      <span class=\"wordmark\">Magpie</span>",
  "</svg></a>\n      <span class=\"wordmark\">Magpie</span>",
  "feather home link close",
);

replaceOnce(
  /      <a href="galaxy\.html"[\s\S]*?Galaxy view<\/a>/,
  `      <div class="private-actions">
        <span class="private-pill">Private library</span>
        <button class="lock-button" id="lockbutton" type="button">Lock</button>
      </div>`,
  "private header actions",
);

replaceOnce(
  '  <div class="grid" id="grid"></div>',
  '  <div class="loading-library" id="loading">Opening your private library…</div>\n  <div class="grid" id="grid"></div>',
  "loading state",
);

replaceOnce(
  /const noteServer = location\.protocol\.startsWith\("http"\)\n  \? "" : "http:\/\/127\.0\.0\.1:8765";/,
  'const noteServer = "";',
  "note server",
);
replaceOnce(
  '    const endpoint = noteServer + "/note?file=" + encodeURIComponent(it.file) +',
  '    const endpoint = noteServer + "/api/magpie-note?file=" + encodeURIComponent(it.file) +',
  "private note endpoint",
);
replaceOnce(
  '    if (!response.ok) throw new Error("note unavailable");',
  `    if (response.status === 401) {
      location.replace("/brain/login.html?returnTo=" + encodeURIComponent(location.pathname + location.search));
      return;
    }
    if (!response.ok) throw new Error("note unavailable");`,
  "note authentication handling",
);
replaceOnce(
  '    const thumb = safeHttpUrl(it.thumbLocal || it.thumbnail || "");',
  `    const thumbName = String(it.thumbLocal || "").split("/").pop();
    const thumb = thumbName
      ? safeHttpUrl("/api/magpie-thumb?name=" + encodeURIComponent(thumbName))
      : "#";`,
  "private thumbnails",
);

replaceOnce(
  'const preset = new URLSearchParams(location.search).get("q");',
  `document.getElementById("lockbutton").addEventListener("click", async () => {
  await fetch("/api/magpie-logout", {
    method: "POST",
    credentials: "same-origin",
  });
  location.replace("/brain/login.html");
});
const preset = new URLSearchParams(location.search).get("q");`,
  "logout action",
);

replaceOnce(
  "</style>",
  `  .feather-home { display: inline-flex; flex-shrink: 0; border-radius: 10px; }
  .feather-home:focus-visible { outline: 3px solid var(--accent-soft); }
  .private-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .private-pill, .lock-button {
    min-height: 34px; display: inline-flex; align-items: center; justify-content: center;
    padding: 7px 13px; border-radius: 99px; font: 700 11px/1 inherit;
  }
  .private-pill {
    border: 1px solid #dbe9dd; color: #2c8e68; background: #f3faf5;
    letter-spacing: .06em; text-transform: uppercase;
  }
  .lock-button {
    border: 1px solid var(--line-2); color: var(--muted); background: var(--card);
    cursor: pointer; box-shadow: var(--shadow);
  }
  .lock-button:hover { color: var(--accent); border-color: var(--accent); }
  .loading-library {
    min-height: 240px; display: grid; place-items: center; color: var(--muted);
    font-family: var(--serif); font-size: 18px;
  }
  .loading-library.error { color: #a84843; text-align: center; }
  @media (max-width: 560px) {
    .private-pill { display: none; }
    .lock-button { padding-inline: 12px; }
  }
</style>`,
  "private gallery styles",
);

html = html.replaceAll(" — ", ": ");

await writeFile(targetGallery, html);
await writeFile(
  targetGalaxy,
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta http-equiv="refresh" content="0;url=/brain/gallery.html">
  <title>Opening Magpie</title>
</head>
<body>
  <p><a href="/brain/gallery.html">Open the private Magpie library</a></p>
  <script>location.replace("/brain/gallery.html");</script>
</body>
</html>
`,
);

console.log(`Built private Magpie gallery from ${sourceGallery}`);
