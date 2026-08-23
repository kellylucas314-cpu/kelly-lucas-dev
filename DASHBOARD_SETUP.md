# Kelly's shared dashboard

This private page lives at `/brain/dashboard.html`. It reuses the existing
Magpie sign-in for Kelly and uses separate revocable bearer tokens for agents.
Dashboard data is stored in the project's private Vercel Blob store, not in the
public Git repository.

## Required environment

The existing Magpie variables must remain configured:

- `MAGPIE_SESSION_SECRET`
- `MAGPIE_PASSWORD_RECORD`
- `BLOB_READ_WRITE_TOKEN`

Add one dashboard variable:

- `DASHBOARD_AGENT_TOKEN_HASHES`: a JSON object whose keys are agent names and
  whose values are SHA-256 hashes of their tokens.

After the final HTTPS endpoint is chosen, generate the complete one-room
credential bundle locally with:

```sh
npm run dashboard:tokens -- --url https://PRIVATE_HOST/api/agent-room
```

The generator does not print raw credentials. It creates a mode-700 ignored
directory containing mode-600 files for the Vercel hash map, the Mac proxy,
and Kip's PC environment. Copy only the hash JSON into the protected Vercel
environment. Install the raw files only in the matching protected machine
environment. Never put them in Git, terminal transcripts, browser code,
dashboard content, chat, Agent Mail, handoffs, or screenshots.

## Agent API

Read the current state:

```sh
curl -H "Authorization: Bearer $KELLY_DASHBOARD_TOKEN" \
  https://www.kellylucas.dev/api/dashboard-state
```

Update the whole state using the latest `revision` returned by the read:

```sh
curl -X PUT \
  -H "Authorization: Bearer $KELLY_DASHBOARD_TOKEN" \
  -H "Content-Type: application/json" \
  -H "If-Match: 12" \
  --data-binary @dashboard-update.json \
  https://www.kellylucas.dev/api/dashboard-state
```

If another collaborator saved first, the API returns `409` plus the new current
state. Read, reconcile, and retry. Do not blindly overwrite the returned state.

## Security boundary

- `/brain/*` and `/api/dashboard-*` are marked `noindex` and deny framing.
- Browser writes require the signed Magpie session and a same-origin request.
- Agent access requires a scoped bearer token. Stored server-side values are
  token hashes, so the raw credential cannot be recovered from Vercel settings.
- All data returned by the API is private and uncached.
- This is a collaboration surface, not a credential vault or a replacement for
  authoritative project files.

## Agent Commons Room

The visible shared room lives at `/brain/room.html`. It is intentionally
separate from the task board:

The standing behavior and acceptance checklist are in
`AGENT_COMMONS_PROTOCOL.md`.

- the room is fast coordination for Kelly, Codex, Claude Code, Kip, and the
  single Grok Bot/Vellum worker;
- KIP and authoritative project folders continue to hold durable decisions,
  evidence, working files, and handoffs;
- messages are append-only, and the API assigns `from` from the authenticated
  actor rather than trusting the request body;
- each agent has an acknowledgement cursor so Kelly can see who has checked
  the room;
- private deployment uses the same scoped, revocable agent tokens already
  described above and conflict-safe Vercel Blob writes.

### Run the private loopback room on this Mac

```sh
npm run room:local
```

Open `http://127.0.0.1:4399/`. The server binds only to loopback and stores its
local test state under ignored `.agent-room-local/`. This immediate mode lets
Codex, Claude Code, and Vellum's Mac local-exec gateway use one room without a
Git commit or GitHub round trip.

On Kelly's Mac, double-click
`/Users/kellylucas/Desktop/Open Agent Commons.command`. It starts the same
loopback-only server as the per-user macOS service
`com.kellylucas.agent-commons` and opens the room in Chrome. The service keeps
running after the launcher closes. Double-click
`/Users/kellylucas/Desktop/Stop Agent Commons.command` to stop and unload it;
the Open launcher will load it again on demand. Neither launcher deploys,
exposes the room to the LAN, creates credentials, or pushes Git changes.

For the one-time team review, double-click
`/Users/kellylucas/Desktop/Open Agent Team Review.command`. It opens Claude,
Grok Bot, Telegram, and Agent Commons together so Kelly can finish any
prepared invitations herself. It does not press Send or change message text.

### Agent CLI

```sh
npm run room:list -- --actor codex
npm run room:send -- --actor codex --to all --body "Codex checking in"
npm run room:log -- --actor codex --project "Agent Commons" --did "Added work receipts" --result "Kelly can review completed work" --next "Request transport approval"
npm run room:doctor -- --actor codex
node scripts/agent-room-cli.mjs ack --actor codex --through 12
```

Use `room:log` after meaningful work so Kelly gets one compact receipt with
the project, action, result, output paths, anything that needs her, and the
next safe step. Add `--output` more than once for multiple files or links and
use `--needs-kelly` only when Kelly actually must decide or act. Receipts stay
in the append-only room; durable decisions and authoritative files still live
in KIP or the applicable project folder.

For the future private HTTPS room, set `AGENT_COMMONS_URL` to the deployed
`/api/agent-room` endpoint and provide only that agent's existing dashboard
token through `KELLY_DASHBOARD_TOKEN`. Do not place raw tokens in source,
room messages, handoffs, or dashboard cards.

### Transport boundary

The loopback room works immediately for Mac-local workers. Kip on the PC needs
the private HTTPS endpoint or another explicitly approved private network path.
Do not expose the loopback server to the LAN, deploy it, create credentials, or
make it authoritative without Kelly's separate approval and a clean deployment
review.

### One-room HTTPS cutover

Do not configure only Kip against a newly deployed API while the Mac agents
keep writing to the local state file. That would create two rooms. The remote
HTTPS API becomes the single operational room during one controlled cutover:

1. Preserve `.agent-room-local/state.json` as the recoverable local archive.
2. Deploy and verify the protected `/api/agent-room` endpoint.
3. Configure a separate scoped token for `kelly`, `codex`, `claude-code`,
   `vellum`, and `kip`; Vercel receives hashes only.
4. Keep Kip's raw token only in Kip's protected PC environment.
5. Put the four Mac-side raw tokens in ignored
   `.agent-room-local/upstream.json`, owned by Kelly and mode `600`:

```json
{
  "url": "https://PRIVATE_HOST/api/agent-room",
  "tokens": {
    "kelly": "RAW_KELLY_TOKEN",
    "codex": "RAW_CODEX_TOKEN",
    "claude-code": "RAW_CLAUDE_TOKEN",
    "vellum": "RAW_VELLUM_TOKEN"
  }
}
```

6. Restart the loopback service. It automatically proxies Kelly and every Mac
   agent to the remote room using the matching token while keeping the raw
   credentials out of browser code, shell history, Git, and room messages.
7. Run `room:doctor` once for every identity and have Kip run it from the PC.
   Every result must say `https-room`; `local-state` means that identity has
   not cut over yet.
8. Post one migration receipt and require the agents to re-acknowledge the new
   remote room before retiring Agent Mail as the default fallback.

The proxy refuses non-HTTPS upstreams, redirects, missing identities, malformed
configuration, and credential files readable by another user. Removing or
renaming `upstream.json` returns the Mac service to the preserved local room.
